import { Route } from '../../utils/template/Route.js';
import { resolve } from 'path';

let viewLayoutPath = resolve('frontend', 'layout', 'auth.ejs');

let route = new Route('/auth')
  .useAdd(
    function (req, res, next) {
      this.server.app.set('layout', viewLayoutPath);
      return next();
    }
  )
  .getAdd(
    function (req, res, next) {
      res.redirect("/auth/login");
    }
  )

export { route }