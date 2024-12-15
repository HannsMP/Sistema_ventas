import { Route } from '../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control";
let viewLayoutPath = resolve('frontend', 'layout', 'control.ejs');

let route = new Route(nameRoute)
  .useAdd(
    async function (req, res, next) {
      let { apiKey } = req.cookies;

      if (!this.cache.apiKey.exist(apiKey)) {

        let { apiKey, login, remember } = req.cookies;

        if (!remember)
          return res.redirect('/auth/login');

        let { usuario, clave } = login;

        let data_Usuario = await this.model.tb_usuarios.login(usuario, clave);
        this.model.tb_asistencias.insertUserId(data_Usuario.id);

        let dataPackage = this.cache.packageJSON.readJSON();

        apiKey = this.cache.apiKey.create({
          theme: req.cookies['config-theme'] || 'purple',
          usuario: data_Usuario,
          version: dataPackage.version,
          author: dataPackage.author
        });

        res.cookie('apiKey', apiKey, {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        return res.redirect(req.originalUrl);
      }

      this.server.app.set('layout', viewLayoutPath);
      return next();
    }
  )
  .getAdd(
    function (req, res, next) {
      res.redirect("/control/productos");
    }
  )
  .socket({
    collector: true,
    tagsName: true
  })

export { route }