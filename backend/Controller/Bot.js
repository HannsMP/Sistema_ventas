import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { readdirSync } from 'fs';

import whatsappWeb from 'whatsapp-web.js'
const { Client, LocalAuth } = whatsappWeb;
import qrcode from 'qrcode-terminal';

import { deletePath } from '../utils/function/deletePath.js';
import { Command } from '../utils/template/Command.js';

export class Bot {
  /** @type { 'UNDEFINED' | 'INITIALIZE'| 'READY'| 'PUPPETTER_ERROR'| 'CONNECTED'| 'DISCONNECTED'| 'LOGOUT'| 'AUTHENTICATING'| 'AUTHENTICATION_FAILURE' } */
  #state = 'UNDEFINED';
  /** @type {Map<string, Command>} */
  collection = new Map;

  /** @param {import('../Structure').Structure} main  */
  constructor(main) {
    this.main = main;

    this.io = main.socket.node.selectNode('/control/administracion/bot', true);

    /** @type {import('whatsapp-web.js').ClientOptions} */
    let clientOption = {
      authStrategy: new LocalAuth({ dataPath: resolve('.cache') }),
      webVersionCache: {
        path: resolve('.cache', 'wwebjs'),
        type: 'local',
        strict: false
      },
    }

    if (main.platform == 'linux')
      clientOption.puppeteer = { executablePath: '/usr/bin/chromium-browser' }

    this.client = new Client(clientOption);

    this.client.on('auth_failure', async msg => {
      this.#state = 'AUTHENTICATION_FAILURE';
      this.io.sockets.emit('/bot/authFailure', msg);
    });

    this.client.on('ready', async () => {
      this.#state = 'CONNECTED';
      this.io.sockets.emit('/bot/ready', this.info());
      let log = this.main.logSuccess.writeStart('[Bot] listo');
      this.client.setStatus(log)
    });

    this.client.on('disconnected', async () => {
      this.io.sockets.emit('/bot/disconnected', this.info())
    });

    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true }, qrString => {
        console.log(qrString);
        this.io.sockets.emit('/bot/qr', qrString);
      });
    });

    this._loadCommands();
    this._setupCommandHandler();
  }

  _setupCommandHandler() {
    this.client.on('message', async msg => {
      try {
        let { from, body } = msg;

        if (from.includes('@g.us')) return;

        let commandRegex = /^\/(\w+)(?:\s+(.*))?$/;
        /** @type {[string, string, string]} */
        let match = body.match(commandRegex);

        if (!match) return;

        let [, command, args] = match;

        let argumentsArray = args ? args.trim().split(/\s+/) : [];

        let [_, phone] = /^51(\d{9})@c.us$/.exec(from);

        if (!this.collection.has(command)) return;

        let data = this.collection.get(command);

        let { run, cooldown, onCooldown } = data;

        if (onCooldown.has(phone)) {
          let phoneOnCooldown = onCooldown.get(phone);
          if (3 < phoneOnCooldown.intent) return;
          let away = new Date(cooldown - (Date.now() - phoneOnCooldown.start));
          let mm = this.main.time.format('mm', away),
            ss = this.main.time.format('ss', away);

          let time = mm == '00' ? `${ss}s` : `${mm}m : ${ss}s`;

          msg.reply(`Esperar este comando se esta enfriando. \n⌛ ${time}`);

          return phoneOnCooldown.intent++;
        }

        let complete = (err = null) => {
          if (err) return msg.reply(msg);

          if (!cooldown) return;

          data.use++;
          this.io.sockets.emit('/bot/command/use', { command, use: data.use });
          onCooldown.set(phone, { start: Date.now(), intent: 1 });
          setTimeout(() => onCooldown.delete(phone), cooldown);
        }

        await run(phone, msg, argumentsArray, complete);
      } catch (e) {
        this.main.logError.writeStart(e.message, e.stack);
      }
    });
  }

  /** @param {Command} data  */
  _commands(data) {
    let { load, name } = data;
    if (!load) return;

    data.run.bind(this.main);
    this.collection.set(name, data);
    this.main.logSuccess.changeColor('brightMagenta');
    this.main.logSuccess.writeStart(`[COMMAND] Command: /${name}`);
  }

  _loadCommands(commandsDir = resolve('backend', 'commands')) {
    let data = readdirSync(commandsDir);

    let fileJs = data.filter(f => f.endsWith('.js'));
    let folder = data.filter(f => !f.includes('.'));

    fileJs.forEach(async (f) => {
      let filePath = join(commandsDir, f);
      let module = await import(pathToFileURL(filePath).href);

      if (module.default instanceof Command)
        this._commands(module.default);
    });

    folder.forEach((f) => {
      f = join(commandsDir, f);
      this._loadCommands(f);
    });
  }

  state() {
    return this.#state
  }

  info() {
    let state = this.state();

    let info = { state };

    if (state == 'CONNECTED') {
      let { wid, pushname } = this.client.info;
      info.name = pushname;
      info.phone = wid.user;
    }

    return info
  }

  async on() {
    this.#state = 'INITIALIZE';
    this.io.sockets.emit('/bot/initialize');
    await this.client.initialize();
    this.#state = 'AUTHENTICATING';
  }

  async off() {
    await this.client.destroy();
    this.app.logSuccess.writeStart('[Bot] apagado');
    this.#state = 'DISCONNECTED';
    this.io.sockets.emit('/bot/destroy', this.info());
  }

  async logout() {
    await this.client.logout();
    deletePath(this.cacheSession);
    deletePath(this.cacheWwebjs);
    this.app.logSuccess.writeStart('[Bot] sesion cerrada');
    this.#state = 'LOGOUT';
    this.io.sockets.emit('/bot/logout', this.info());
  }

  sendMessage(phone, message) {
    if (!this.ready) return;
    if (!message || !phone || !/^\d{9}$/.test(String(phone))) return;
    this.client.sendMessage(`51${phone}@c.us`, message);
  }
}