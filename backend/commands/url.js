import { Command } from '../utils/template/Command.js';

let command = new Command('url')
  .setCoolDown(30 * 1000)
  .setDescription(
    'Muestra la url en la cual el servidor esta alojado, si esperas un poco puede que te envie un link enriquesido.',
    '  Uso: */url*',
    '  No tiene parametros',
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);

    if (!permiso) return

    let originalUrl = `http://${this.ip}:${this.cache.configJSON.readJSON().SERVER.port}`;

    let msgCurrent = await msg.reply(originalUrl);

    complete();
  });

export { command };