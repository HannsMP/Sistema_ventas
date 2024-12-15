import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/mantenimiento/categorias";
let viewRenderPath = resolve('frontend', 'view', 'control', 'mantenimiento', 'categorias.ejs');
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

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTable = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_categorias.readInParts(tableReq);
          let recordsFiltered = this.model.tb_categorias.readInPartsCount(tableReq);
          let recordsTotal = this.model.tb_categorias.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {number} id @param {()=>void} res */
      let readIdTable = async (id, res) => {
        try {
          let data = await this.model.tb_categorias.readIdAll(id);
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let insertTable = async (myId, data, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathAdd(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar la creacion de las categorias.');

          let {
            nombre,
            descripcion,
            estado
          } = data;

          let codigo = await this.model.tb_categorias.getCodigo()

          let result = await this.model.tb_categorias.insert({
            nombre,
            descripcion,
            codigo,
            estado: estado ? 1 : 0
          });
          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let updateIdTable = async (myId, data, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathUpdate(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar la edicion de las categorias.');

          let {
            id,
            nombre,
            descripcion
          } = data;

          let result = await this.model.tb_categorias.updateId(Number(id), {
            nombre,
            descripcion
          });
          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {number} myId @param {number} id @param {()=>void} res */
      let stateIdTable = async (myId, id, estado, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathHide(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar el estado de las categorias.');

          let result = await this.model.tb_categorias.updateIdState(id, estado ? 1 : 0);
          this.model.tb_productos.updateStateCategoriaId(Number(id), Number(estado));
          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {number} myId @param {number} id @param {()=>void} res */
      let deleteIdTable = async (myId, id, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathDelete(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar la eliminacion de las categorias.');

          let result
          let count = await this.model.tb_categorias.readIdCount(Number(id))
          if (!count?.producto_cantidad)
            result = await this.model.tb_categorias.deleteId(Number(id))
          else if (!count?.estado)
            result = await this.model.tb_categorias.deleteAllId(Number(id))
          else
            return res('La categoria esta activa y aun tiene productos vinculados.');

          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      let unicColumns = new Set(['nombre'])
      /** @param {{column: string, value: any, id?: number}} req @param {()=>void} res */
      let readUnic = async (req, res) => {
        try {
          let { column, value, id } = req;
          if (!unicColumns.has(column)) return;
          if (!this.model.tb_categorias.isColumnUnic(column)) return;

          let result = await this.model.tb_categorias.isUnic(column, value, id);
          res(result);
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;

        socket.on('/read/table', readTable)
        socket.on('/readId/table', readIdTable)
        socket.on('/insert/table', insertTable.bind(null, myId))
        socket.on('/updateId/table', updateIdTable.bind(null, myId))
        socket.on('/stateId/table', stateIdTable.bind(null, myId))
        socket.on('/deleteId/table', deleteIdTable.bind(null, myId))
        socket.on('/read/unic', readUnic)
      })
    }
  )

export { route }