import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/servidor/cpu";
let viewRenderPath = resolve('frontend', 'view', 'control', 'servidor', 'cpu.ejs');
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

      let internalId;

      node.ev.on('remove', () => {
        if (node.sockets.size != 0) return
        clearInterval(internalId);
        internalId = null;
      })

      /** @param {()=>void} res */
      let cpuSytem = async (res) => {
        try {
          let data = await this.system.cpu();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {()=>void} res */
      let coreSytem = async (res) => {
        try {
          let data = await this.system.currentLoad();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {()=>void} res */
      let ramSytem = async (res) => {
        try {
          let data = await this.system.mem();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {()=>void} res */
      let diskSytem = async (res) => {
        try {
          let data = await this.system.diskLayout();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {()=>void} res */
      let fsSytem = async (res) => {
        try {
          let data = await this.system.fsSize();
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let powerSytem = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathUpdate(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el reinicio del sistema.');

          this.system.reboot();
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let resetSytem = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el apagado del sistema.');

          this.system.powerOff();
          res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;

        socket.on('/cpu/sytem', cpuSytem)
        socket.on('/core/sytem', coreSytem)
        socket.on('/ram/sytem', ramSytem)
        socket.on('/disk/sytem', diskSytem)
        socket.on('/fs/sytem', fsSytem)
        socket.on('/power/sytem', powerSytem.bind(null, myId))
        socket.on('/reset/sytem', resetSytem.bind(null, myId))

        if (!internalId)
          internalId = setInterval(() => {
            let CurrentLoadData = this.system.currentLoad();
            let FsSizeData = this.system.fsSize();
            let MemData = this.system.mem();

            node.sockets.forEach(async s => {
              s.emit(
                '/cpu/data/emit',
                {
                  cpu: await CurrentLoadData,
                  disk: await FsSizeData,
                  mem: await MemData
                }
              )
            })
          }, 1000);
      })
    }
  )

export { route }