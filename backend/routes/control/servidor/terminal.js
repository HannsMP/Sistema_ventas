import { Route } from '../../../utils/template/Route.js';
import { resolve, parse, join, normalize, dirname } from 'path';
import { existsSync, readdirSync } from 'fs';

const root = parse(resolve('/')).root;
const cdRegex = /cd\s+((\.{0,2}\/)?\S*)/;

let nameRoute = "/control/servidor/terminal";
let viewRenderPath = resolve('frontend', 'view', 'control', 'servidor', 'terminal.ejs');
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
        last: true,
      })

      /** @param {()=>void} res */
      let osCmd = async (res) => {
        try {
          let data = await this.system.osinfo();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let queryCmd = async (myId, path = '/', command, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathView(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para realizar consultas en la cmd.');

          if (typeof path != 'string')
            return res(null, { path: root });;

          path = path.startsWith(root)
            ? normalize(path)
            : normalize(join(root, path));

          let data = {}

          if (typeof command == 'string' && command != "") {
            if (command.includes('rm') && !permiso.eliminar)
              return res(null, { errCmd: 'No tienes permisos para eliminar archivos.' });
            if (command.includes('mkdir') && !permiso.agregar)
              return res(null, { errCmd: 'No tienes permisos para crear directorios.' });
            if (command.includes('touch') && !permiso.editar)
              return res(null, { errCmd: 'No tienes permisos para modificar archivos.' });
            if (command.includes('cat') && !permiso.ver)
              return res(null, { errCmd: 'No tienes permisos para ver el contenido de archivos.' });

            let cdPath = path;
            for (const c of command.split(/&&|\|\|/)) {
              let match = cdRegex.exec(c);
              if (match) {
                let [_, cd] = match;

                cd = cd == '' ? root : cd;

                cdPath = normalize(join(cdPath, cd));

                if (!cdPath.startsWith(root) || !existsSync(cdPath))
                  return res(null, { errCmd: `No existe el directorio: ${cd}`, path });
              }
            }

            let [result, execException, errCmd] = await this.system.cmd(`cd ${path} && ${command}`);
            data.result = result;
            data.execException = execException;
            data.errCmd = errCmd;

            if (command.includes('cd')) path = cdPath;
          }

          data.path = path;
          try {
            data.dir = readdirSync(path);
          } catch (error) {
            data.dir = readdirSync(dirname(path));
          }

          res(null, data);
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;

        socket.on('/os/cmd', osCmd)
        socket.on('/query/cmd', queryCmd.bind(null, myId))
      })
    }
  )

export { route }