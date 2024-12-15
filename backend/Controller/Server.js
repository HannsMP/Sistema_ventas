import { resolve, join } from 'path';
import { pathToFileURL } from 'url';
import { createServer } from 'http';
import { readdirSync } from 'fs';

import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import { Route } from '../utils/template/Route.js';

export class Server {
  estado = false;
  app = express();
  http = createServer(this.app);

  /** @type {Map<string, Route>} */
  routesMap = new Map;

  /** @param {import('../Structure').Structure} main  */
  constructor(main) {
    this.main = main;

    /* SERVER SETTINGS */
    this.app.set('case sensitive routing', true);
    this.app.set('view engine', 'ejs');
    this.app.set('layout', resolve('layout', 'control'));

    /* MIDDLEWARE */
    this.app.use(cookieParser());
    this.app.use(express.json());
    this.app.use(expressLayouts);
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(session(main.cache.configJSON.readJSON().SESSION));

    this._loadRoutes();
  }

  /** @param {Route} data */
  _route(data) {
    let { load, name } = data;
    this.routesMap.set(name, data);

    if (!load) return;
    data.bind(this.main);

    let cnfg = this.main.cache.configJSON.readJSON();

    if (data.use.length) {
      this.app.use(name, data.use);
      this.main.logSuccess.changeColor('brightWhite');
      this.main.logSuccess.writeStart(`[USE] Middle: http://${this.main.ip}:${cnfg.SERVER.port}${name} (${data.use.length})`);
    }

    if (data.get.length) {
      this.app.get(name, data.get);
      this.main.logSuccess.changeColor('brightGreen');
      this.main.logSuccess.writeStart(`[GET] Routes: http://${this.main.ip}:${cnfg.SERVER.port}${name} (${data.get.length})`);
    }

    if (data.post.length) {
      this.app.post(name, data.post);
      this.main.logSuccess.changeColor('brightBlue');
      this.main.logSuccess.writeStart(`[POST] Routes: http://${this.main.ip}:${cnfg.SERVER.port}${name} (${data.post.length})`);
    }

    if (typeof data.node == 'object' || typeof data.node == 'function') {
      let node = this.main.socket.node.selectNode(name, true);

      if (typeof data.node == 'object')
        node?.setOption(data.node);
      else
        data.node.call(this, node);

      this.main.logSuccess.changeColor('brightYellow');
      this.main.logSuccess.writeStart(`[SKT] Routes: http://${this.main.ip}:${cnfg.SERVER.port}${name}`);
    }
  }

  _loadRoutes(routesDir = resolve('backend', 'routes')) {
    let data = readdirSync(routesDir);

    let fileJs = data.filter(f => f.endsWith('.js'));
    let folder = data.filter(f => !f.includes('.'));

    fileJs.forEach(async (f) => {
      let filePath = join(routesDir, f);
      let module = await import(pathToFileURL(filePath).href);

      if (module.route instanceof Route)
        this._route(module.route);
    });

    folder.forEach((f) => {
      f = join(routesDir, f);
      this._loadRoutes(f);
    });
  }

  _run() {
    return new Promise((res, rej) => {
      if (this.estado) {
        this.main.logWarning.writeStart('[Server] ya esta activo');
        return res();
      }

      let cnfg = this.main.cache.configJSON.readJSON();

      this.listener = this.http.listen(cnfg.SERVER.port, e => {
        if (e) return rej(e);

        this.estado = true;
        this.main.logSuccess.writeStart(`[App] Listo: http://${this.main.ip}:${cnfg.SERVER.port}`);
        res();
      })
    })
  }

  _stop() {
    return new Promise((res, rej) => {
      if (!this.estado) return rej('[Server] aun no esta activo');

      this.socket.io.close();
      this.listener.close();
      this.listener.closeAllConnections();
      this.listener.closeIdleConnections();
      this.estado = false;
      res(`[Server] conexiones cerradas con exito!`);
    })
  }
}