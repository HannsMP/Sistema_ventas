import { Route } from '../utils/template/Route.js';
import { resolve } from 'path';

let viewLayoutPath = resolve('frontend', 'layout', 'default.ejs');
let viewRenderPath = resolve('frontend', 'view', 'control', 'productos.ejs');
let viewErrorPath = resolve('frontend', 'view', 'error', '403.ejs');

let route = new Route('/', false)
  .useAdd(
    async function (req, res, next) {
      try {
        let { apiKey } = req.cookies;

        let existApikey = this.cache.apiKey.exist(apiKey);

        if (existApikey)
          return next();

        res.status(401).json({ autorization: 'acceso denegado' });
      } catch (e) {
        this.responseErrorApi(req, res, next, e)
      }
    }
  )
  .getAdd(
    async function (req, res, next) {
      try {
        let session = this.cache.apiKey.read(req.cookies.apiKey);

        let permisos = await this.model.tb_permisos.userPathAll(session.usuario.id, nameRoute);

        if (!permisos.ver) return res.status(403).json({ err: 'Tu usuario no tiene Permisos para esta peticion.' });

        res.status(200).json({})
      } catch (e) {
        this.responseErrorApi(req, res, next, e)
      }
    },
  )
  .postAdd(
    async function (req, res, next) {
      try {
        let session = this.cache.apiKey.read(req.cookies.apiKey);

        let permisos = await this.model.tb_permisos.userPathAll(session.usuario.id, nameRoute);

        if (!permisos.ver) return res.status(403).json({ err: 'Tu usuario no tiene Permisos para esta peticion.' });

        res.status(200).json({})
      } catch (e) {
        this.responseErrorApi(req, res, next, e)
      }
    },
  )

export { route }