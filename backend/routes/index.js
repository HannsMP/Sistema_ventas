import { Route } from '../utils/template/Route.js';
import { resolve } from 'path';

let viewLayoutPath = resolve('frontend', 'layout', 'default.ejs');
let viewErrorPath = resolve('frontend', 'view', 'error', '404.ejs');

let route = new Route('/')
  .useAdd(
    function (req, res, next) {
      if (req.originalUrl.startsWith('/src'))
        return next();

      let pathRoute = req.originalUrl.split('?')[0];

      if (!this.server.routesMap.has(pathRoute)) {
        this.server.app.set('layout', viewLayoutPath);
        res.status(404).render(viewErrorPath, { url: req.path })
      };

      return next();
    }
  )
  .getAdd(
    function (req, res) {
      res.redirect('/control/productos');
    }
  )

export { route }