import { Route } from '../../../utils/template/Route.js';
import { ModelError } from './../../../utils/error/Model.js';

import { resolve } from 'path';

let viewRenderPath = resolve('frontend', 'view', 'auth', 'login.ejs');

let route = new Route('/auth/login')
  .getAdd(
    async function (req, res, next) {
      let recovery = this.bot.state() == 'CONNECTED';
      let theme = 'purple';

      try {

        if (!req.cookies['config-theme'])
          res.cookie('config-theme', theme, {
            maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
            sameSite: 'Strict',
            httpOnly: true
          });
        else
          theme = req.cookies['config-theme'];

        if (req.cookies.constructor.name != 'Object')
          return res.status(200).render(viewRenderPath, { login: undefined, recovery, theme });

        let { apiKey, login, remember } = req.cookies;

        if (this.cache.apiKey.exist(apiKey))
          return res.redirect('/control');

        let { usuario, clave } = login;

        if (!remember)
          return res.status(200).render(viewRenderPath, { login: { usuario }, recovery, theme });

        let data_Usuario = await this.model.tb_usuarios.login(usuario, clave);

        this.model.tb_asistencias.insertUserId(data_Usuario.id);

        let dataPackage = this.cache.packageJSON.readJSON();
        apiKey = this.cache.apiKey.create({
          theme,
          usuario: data_Usuario,
          version: dataPackage.version,
          author: dataPackage.author
        });

        res.cookie('apiKey', apiKey, {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        return res.redirect('/control');
      } catch (e) {
        res.clearCookie('apiKey');
        res.clearCookie('remember');
        res.status(200).render(viewRenderPath, { login: undefined, recovery, theme });
      }
    }
  )
  .postAdd(
    async function (req, res, next) {
      let recovery = this.bot.state() == 'CONNECTED';
      let theme = req.cookies['config-theme'];

      try {
        if (req.session.intent == 3) {

          let timeAway = (5 * 60 * 1000) - (Date.now() - req.session.intentDate);

          return res.status(404).render(viewRenderPath, {
            alert: {
              timer: '1500',
              icon: 'error',
              title: 'Se acabaron los intentos',
              text: `Espera ${this.time.format('mm : ss', new Date(timeAway))}`
            },
            login: undefined,
            recovery,
            theme
          })
        }


        let { usuario, clave, recuerdame } = req.body;

        let data_Usuario = await this.model.tb_usuarios.login(usuario, clave);

        await this.model.tb_asistencias.insertUserId(data_Usuario.id);

        let theme = 'purple';

        if (!req.cookies['config-theme'])
          res.cookie('config-theme', 'purple', {
            maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
            sameSite: 'Strict',
            httpOnly: true
          });
        else
          theme = req.cookies['config-theme'];

        let dataPackage = this.cache.packageJSON.readJSON()
        let apiKey = this.cache.apiKey.create({
          theme,
          usuario: data_Usuario,
          version: dataPackage.version,
          author: dataPackage.author
        });

        res.cookie('login', { usuario, clave }, {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        res.cookie('remember', recuerdame == 'on', {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        res.cookie('apiKey', apiKey, {
          maxAge: recuerdame
            ? 30 * 24 * 60 * 60 * 60 * 1000
            : 1 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        req.session.intent = 0;

        res.status(200).render(viewRenderPath, {
          alert: {
            timer: '1500',
            icon: 'success',
            title: `Iniciando Sesión ${usuario}`,
            text: `Redirigiendo...`,
            redirect: '/control'
          },
          login: { usuario, clave, recuerdame: recuerdame == 'on' },
          recovery,
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
              login: undefined,
              recovery,
              theme
            })

          if (code == 'RESPONSE_DATA_EMPTY' || code == 'RESPONSE_DATA_DISABLED')

            return res.status(404).render(viewRenderPath, {
              alert: {
                timer: '1500',
                icon: 'warning',
                title: 'Advertencia',
                text: message
              },
              login: undefined,
              recovery,
              theme
            })

          if (code == 'RESPONSE_DATA_DIFERENT') {
            req.session.intent ??= 0;
            req.session.intent++;

            if (req.session.intent == 3) {
              req.session.intentDate = Date.now();

              setTimeout(() => {
                req.session.intent = 0;
                delete req.session.intentDate;
              }, 5 * 60 * 1000);

              return res.status(404).render(viewRenderPath, {
                alert: {
                  timer: '1500',
                  icon: 'warning',
                  title: message,
                  text: `Se acabaron los intentos, espera 5 min para volver a intentarlo`
                },
                login: undefined,
                recovery,
                theme
              })
            }

            return res.status(404).render(viewRenderPath, {
              alert: {
                timer: '1500',
                icon: 'warning',
                title: `Advertencia, ${3 - req.session.intent} intentos`,
                text: message
              },
              login: undefined,
              recovery,
              theme
            })
          }
        }
      }
    }
  )

export { route }