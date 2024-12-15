import { Route } from '../../../utils/template/Route.js';
import { ModelError } from './../../../utils//error/Model.js';

import { resolve } from 'path';

let viewLayoutPath = resolve('frontend', 'layout', 'default.ejs');
let viewRenderPath = resolve('frontend', 'view', 'auth', 'recovery.ejs');
let viewErrorPath = resolve('frontend', 'view', 'error', '503.ejs');

let route = new Route('/auth/recovery')
  .useAdd(
    async function (req, res, next) {
      if (this.bot.state() == 'CONNECTED')
        return next();

      this.server.app.set('layout', viewLayoutPath);
      res.status(503).render(viewErrorPath, { url: req.originalUrl });
    }
  )
  .getAdd(
    async function (req, res, next) {

      let theme = 'purple';

      if (!req.cookies['config-theme'])
        res.cookie('config-theme', theme, {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });
      else
        theme = req.cookies['config-theme'];

      res.status(200).render(viewRenderPath, {
        recovery: undefined,
        form: 'user',
        theme
      });
    }
  )
  .postAdd(
    async function (req, res, next) {
      theme = req.cookies['config-theme'];

      try {
        let {
          usuario,
          codigo,
          clave,
          repetirClave
        } = req.body;

        if (typeof usuario != 'string')
          return res.status(200).render(viewRenderPath, {
            recovery: undefined,
            form: 'user',
            theme
          })

        let { id, telefono } = await this.model.tb_usuarios.readPhoneUser(usuario);

        if (typeof codigo != 'string') {
          this.bot.sendMessage(telefono, `Hola ${usuario} 👋, se esta intentando restablecer tu contraseña. Por razones de seguridad enviame solo '/recuperar' para obtener un codigo de recuperacion.`)

          return res.status(200).render(viewRenderPath, {
            recovery: { usuario },
            form: 'code',
            theme
          })
        }

        if (!this.cache.codeRecovery.exist(codigo))
          return res.status(200).render(viewRenderPath, {
            alert: {
              timer: '1500',
              icon: 'error',
              title: `Error`,
              text: `Codigo de recuperacion no valido.`
            },
            recovery: { usuario },
            form: 'code',
            theme
          })

        if (typeof clave != 'string' || typeof repetirClave != 'string')
          return res.status(200).render(viewRenderPath, {
            recovery: { usuario, codigo },
            form: 'pass',
            theme
          })

        if (clave != repetirClave)
          return res.status(200).render(viewRenderPath, {
            alert: {
              timer: '1500',
              icon: 'error',
              title: 'Error',
              text: `Las contraseñas son diferentes.`
            },
            recovery: { usuario, codigo, clave, repetirClave },
            form: 'pass',
            theme
          })

        await this.model.tb_usuarios.updateIdPassword(id, clave);
        this.cache.codeRecovery.delete(codigo);

        res.status(200).render(viewRenderPath, {
          alert: {
            timer: '1500',
            icon: 'success',
            title: `Contraseña Actualizada ${usuario}`,
            text: `Redirigiendo...`,
            redirect: '/auth/login'
          },
          recovery: { usuario, codigo, clave, repetirClave },
          form: 'pass',
          theme
        })

      } catch (e) {
        if (e instanceof ModelError) {
          let { code, message } = e;

          if (code == 'COLUMN_UNEXIST_FIELD' || code == 'COLUMN_UNEXPECTED_VALUE' || code == 'COLUMN_TYPE_FIELD' || code == 'COLUMN_LIMIT_FIELD')
            return res.status(404).render(viewRenderPath, {
              alert: {
                timer: '1500',
                icon: 'error',
                title: 'Error',
                text: message
              },
              recovery: undefined,
              form: 'user',
              theme
            })

          if (code == 'RESPONSE_DATA_EMPTY' || code == 'RESPONSE_DATA_DISABLED' || code == 'RESPONSE_DATA_DIFERENT')
            return res.status(404).render(viewRenderPath, {
              alert: {
                timer: '1500',
                icon: 'warning',
                title: 'Advertencia',
                text: message
              },
              recovery: undefined,
              form: 'user',
              theme
            })

        }
      }
    }
  )

export { route }