import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/mantenimiento/clientes";
let viewRenderPath = resolve('frontend', 'view', 'control', 'mantenimiento', 'clientes.ejs');
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
          let data = this.model.tb_clientes.readInParts(tableReq);
          let recordsFiltered = this.model.tb_clientes.readInPartsCount(tableReq);
          let recordsTotal = this.model.tb_clientes.readCount();

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
          let data = await this.model.tb_clientes.readJoinId(id);
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {number} myId @param {()=>void} res */
      let insertTable = async (myId, data, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathAdd(myId, nameRoute);
          if (!permiso) return res('No tienes Permisos para controlar la creacion de los clientes.');

          let {
            nombres,
            telefono,
            direccion,
            tipo_cliente_id,
            tipo_documento_id,
            num_documento,
            estado
          } = data;

          let result = await this.model.tb_clientes.insert({
            nombres,
            telefono,
            direccion,
            tipo_cliente_id: Number(tipo_cliente_id),
            tipo_documento_id: Number(tipo_documento_id),
            num_documento,
            estado: Number(estado)
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
          if (!permiso) return res('No tienes Permisos para controlar la edicion de los clientes.');

          let {
            id,
            nombres,
            telefono,
            direccion,
            tipo_cliente_id,
            tipo_documento_id,
            num_documento
          } = data;

          let result = await this.model.tb_clientes.updateId(Number(id), {
            nombres,
            telefono,
            direccion,
            tipo_cliente_id: Number(tipo_cliente_id),
            tipo_documento_id: Number(tipo_documento_id),
            num_documento
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
          if (!permiso) return res('No tienes Permisos para controlar el estado de los clientes.');

          let result = await this.model.tb_clientes.updateIdState(id, estado ? 1 : 0);
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
          if (!permiso) return res('No tienes Permisos para controlar la eliminacion de los clientes.');

          let result = await this.model.tb_clientes.deleteId(Number(id))
          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      let unicColumns = new Set(['telefono', 'num_documento'])
      /** @param {{column: string, value: any, id?: number}} req @param {(valid: boolean)=>void} res */
      let readUnic = async (req, res) => {
        try {
          let { column, value, id } = req;
          if (!unicColumns.has(column)) return;
          if (!this.model.tb_clientes.isColumnUnic(column)) return;

          let result = await this.model.tb_clientes.isUnic(column, value, id);
          res(result);
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** @param {SelectorRequest} selectorReq @param {SelectorEnd} res */
      let selectorTipoCliente = async (selectorReq, res) => {
        let result = {
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_cliente.SelectorInParts(selectorReq);
          let recordsFiltered = this.model.tipo_cliente.SelectorInPartsCount(selectorReq);
          let recordsTotal = this.model.tipo_cliente.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result)
      }

      /** @param {SelectorRequest} selectorReq @param {SelectorEnd} res */
      let selectorTipoDocumento = async (selectorReq, res) => {
        let result = {
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_documento.SelectorInParts(selectorReq);
          let recordsFiltered = this.model.tipo_documento.SelectorInPartsCount(selectorReq);
          let recordsTotal = this.model.tipo_documento.readCount(null, true);

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result)
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
        socket.on('/selector/tipoCliente', selectorTipoCliente)
        socket.on('/selector/tipoDocumento', selectorTipoDocumento)
      })
    }
  )

export { route }