import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/reportes/registros";
let viewRenderPath = resolve('frontend', 'view', 'control', 'reportes', 'registros.ejs');
let viewErrorPath = resolve('frontend', 'view', 'error', '403.ejs');

let route = new Route(nameRoute)
  .getAdd(
    async function (req, res, next) {
      let session = this.cache.apiKey.read(req.cookies.apiKey);

      let userLayout = await this.model.tb_permisos.userLayoutAll(session.usuario.id);

      let permiso = userLayout[nameRoute];

      if (!permiso.ver) return res.status(403).render(viewErrorPath, { session, userLayout });

      session.permiso = permiso;

      res.render(viewRenderPath, { session, userLayout });
    }
  )
  .socket(
    function (node) {
      node.setOption({
        last: true
      })

      /** @param {()=>void} res */
      let readSuccess = async (res) => {
        try {
          let text = this.logSuccess.readFile();
          let stat = this.logSuccess.statFile();
          res(text, stat)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let clearSuccess = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el borrado de registros satisfactorios.');

          this.logSuccess.reset();
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {()=>void} res */
      let readWarning = async (res) => {
        try {
          let text = this.logWarning.readFile();
          let stat = this.logWarning.statFile();
          res(text, stat)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let clearWarning = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el borrado de registros satisfactorios.');

          this.logWarning.reset();
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {()=>void} res */
      let readError = async (res) => {
        try {
          let text = this.logError.readFile();
          let stat = this.logError.statFile();
          res(text, stat)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let clearError = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el borrado de registros satisfactorios.');

          this.logError.reset();
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {()=>void} res */
      let readSystem = async (res) => {
        try {
          let exist = this.logSystem.exist();

          let text = exist ? this.logSystem.readFile() : '';
          let stat = exist ? this.logSystem.statFile() : { size: 0 };

          res(text, stat, exist)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let clearSystem = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el borrado de registros satisfactorios.');

          this.logSystem.writeFile('');
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;

        socket.on('/read/success', readSuccess)
        socket.on('/clear/success', clearSuccess.bind(null, myId))
        socket.on('/read/warn', readWarning)
        socket.on('/clear/warn', clearWarning.bind(null, myId))
        socket.on('/read/error', readError)
        socket.on('/clear/error', clearError.bind(null, myId))
        socket.on('/read/system', readSystem)
        socket.on('/clear/system', clearSystem.bind(null, myId))
      })
    }
  )

export { route }