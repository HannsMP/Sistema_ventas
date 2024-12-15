import { resolve } from "path";

import { Socket } from "./Controller/Socket.js";
import { Model } from "./Controller/Model.js";
import { Server } from "./Controller/Server.js";
import { Cache } from "./Controller/Cache.js";
import { Bot } from "./Controller/Bot.js";

import { System } from "./utils/System.js";
import { Logger } from "./utils/Logger.js";
import { Time } from "./utils/Time.js";
import { File } from "./utils/File.js";

export class Structure {
  system = new System;
  platform = this.system.platform();
  net = this.system.getIPAddress();
  ip = this.net.ipv4;

  cache = new Cache();
  time = new Time(0, "[YYYY/MM/DD hh:mm:ss tt]");
  logSuccess = new Logger(
    resolve('log', 'success.log'), this.time,
    { colorTime: 'brightGreen', colorLog: 'brightGreen', autoSave: true, emit: true, log: true }
  );
  logWarning = new Logger(
    resolve('log', 'warn.log'), this.time,
    { colorTime: 'brightYellow', colorLog: 'brightYellow', autoSave: true, emit: true, log: true }
  );
  logError = new Logger(
    resolve('log', 'error.log'), this.time,
    { colorTime: 'brightRed', colorLog: 'brightRed', autoSave: true, emit: true, log: true }
  );
  logSystem = new File(
    this.cache.configJSON.readJSON().SYSTEM.loggerFile,
    { autoSave: true, extname: '.log', default: '' }
  );

  constructor() {
    this.server = new Server(this);
    this.socket = new Socket(this);

    this._logHandler();

    this.model = new Model(this);
    this.bot = new Bot(this);

    this._run();
  }
  _logHandler() {
    let registrosSocket = this.socket.node.selectNode('/control/reportes/registros', true);

    this.logSuccess.ev.on('writeStart', log => registrosSocket.sockets.emit(
      `/logger/success/writeEnd`,
      { log, stat: this.logSuccess.statFile() }
    ));
    this.logWarning.ev.on('writeStart', log => registrosSocket.sockets.emit(
      `/logger/warn/writeEnd`,
      { log, stat: this.logWarning.statFile() }
    ));
    this.logError.ev.on('writeStart', log => registrosSocket.sockets.emit(
      `/logger/error/writeEnd`,
      { log, stat: this.logError.statFile() }
    ));
  }
  async _run() {
    let cnfg = this.cache.configJSON.readJSON();

    let intervalId = setInterval(async () => {
      this.logSuccess.changeColor('brightCyan');
      if (!this.model.estado && await this.model._run()) return;

      if (cnfg.SERVER.autoRun)
        this.server._run();

      if (cnfg.BOT.autoRun)
        this.bot.on();

      clearInterval(intervalId);
    }, 1000)
  }
}