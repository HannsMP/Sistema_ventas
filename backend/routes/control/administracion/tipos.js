import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/administracion/tipos";
let viewRenderPath = resolve('frontend', 'view', 'control', 'administracion', 'tipos.ejs');
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
      let readTipoMetodoPago = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_metodo_pago.readInParts(tableReq);
          let recordsFiltered = this.model.tipo_metodo_pago.readInPartsCount(tableReq);
          let recordsTotal = this.model.tipo_metodo_pago.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTipoCliente = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_cliente.readInParts(tableReq);
          let recordsFiltered = this.model.tipo_cliente.readInPartsCount(tableReq);
          let recordsTotal = this.model.tipo_cliente.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTipoDocumento = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_documento.readInParts(tableReq);
          let recordsFiltered = this.model.tipo_documento.readInPartsCount(tableReq);
          let recordsTotal = this.model.tipo_documento.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTipoProveedor = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_proveedor.readInParts(tableReq);
          let recordsFiltered = this.model.tipo_proveedor.readInPartsCount(tableReq);
          let recordsTotal = this.model.tipo_proveedor.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTipoRoles = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tipo_roles.readInParts(tableReq);
          let recordsFiltered = this.model.tipo_roles.readInPartsCount(tableReq);
          let recordsTotal = this.model.tipo_roles.readCount();

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      node.ev.on('connected', socket => {
        socket.on('/read/tipoMetodoPago', readTipoMetodoPago)
        socket.on('/read/tipoCliente', readTipoCliente)
        socket.on('/read/tipoDocumento', readTipoDocumento)
        socket.on('/read/tipoProveedor', readTipoProveedor)
        socket.on('/read/tipoRoles', readTipoRoles)
      })
    }
  )

export { route }