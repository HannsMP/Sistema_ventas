import { Route } from '../../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/reportes";
let viewRenderPath = resolve('frontend', 'view', 'control', 'reportes', 'index.ejs');
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

      // /** @param {number} myId @param {()=>void} res */
      // let cardCompras = async (myId, res) => {
      //   try {
      //     let permiso = await this.model.tb_permisos.userPathView(myId, '/control/reportes/compras');
      //     if (!permiso) return;

      //     let max_creacion = await this.model.tb_productos.cardLastCreation();
      //     let cantidad = await this.model.tb_productos.cardCount();
      //     let { label, data } = await this.model.tb_productos.chartCountProducs();

      //     res(
      //       cantidad,
      //       max_creacion,
      //       label,
      //       [data]
      //     )
      //   } catch (e) {

      //   }
      // }

      // /** @param {number} myId @param {()=>void} res */
      // let cardVentas = async (myId, res) => {
      //   try {
      //     let permiso = await this.model.tb_permisos.userPathView(myId, '/control/reportes/ventas');
      //     if (!permiso) return;

      //     let max_creacion = await this.model.tb_categorias.cardLastCreation();
      //     let cantidad = await this.model.tb_categorias.cardCount();
      //     let { label, data } = await this.model.tb_categorias.chartCountCategory();

      //     res(
      //       cantidad,
      //       max_creacion,
      //       label,
      //       [data]
      //     )
      //   } catch (e) {

      //   }
      // }

      // /** @param {number} myId @param {()=>void} res */
      // let cardYapes = async (myId, res) => {
      //   try {
      //     let permiso = await this.model.tb_permisos.userPathView(myId, '/control/reportes/yapes');
      //     if (!permiso) return;

      //     let max_creacion = await this.model.tb_clientes.cardLastCreation();
      //     let cantidad = await this.model.tb_clientes.cardCount();
      //     let tipo_cliente = await this.model.tipo_cliente.chartCountTypeClient();
      //     let tipo_documento = await this.model.tipo_documento.chartCountTypeDocument();

      //     res(
      //       cantidad,
      //       max_creacion,
      //       [...tipo_cliente.label, ...tipo_documento.label],
      //       [[...tipo_cliente.data, ...tipo_documento.data]]
      //     )
      //   } catch (e) {

      //   }
      // }

      // /** @param {number} myId @param {()=>void} res */
      // let cardAsistencias = async (myId, res) => {
      //   try {
      //     let permiso = await this.model.tb_permisos.userPathView(myId, '/control/reportes/asistencias');
      //     if (!permiso) return;

      //     let max_creacion = await this.model.tb_proveedores.cardLastCreation();
      //     let cantidad = await this.model.tb_proveedores.cardCount();
      //     let tipo_cliente = await this.model.tipo_proveedor.chartCountTypeProvider();
      //     let tipo_documento = await this.model.tipo_documento.chartCountTypeDocument();

      //     res(
      //       cantidad,
      //       max_creacion,
      //       [...tipo_cliente.label, ...tipo_documento.label],
      //       [[...tipo_cliente.data, ...tipo_documento.data]]
      //     )
      //   } catch (e) {
      //     this.logError.writeStart(e.message, e.stack)
      //   }
      // }

      /** @param {number} myId @param {()=>void} res */
      let cardRegistros = async (myId, res) => {
        try {
          let permiso = await this.model.tb_permisos.userPathView(myId, '/control/reportes/registros');
          if (!permiso) return;

          let lastLog = {};
          lastLog.success = this.logSuccess.statFile().mtimeMs;
          lastLog.warning = this.logWarning.statFile().mtimeMs;
          lastLog.error = this.logError.statFile().mtimeMs;
          lastLog.system = this.logSystem.statFile().mtimeMs;

          res(lastLog)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;

        // socket.on('/dash/compras', cardCompras.bind(null, myId));
        // socket.on('/dash/ventas', cardVentas.bind(null, myId));
        // socket.on('/dash/yapes', cardYapes.bind(null, myId));
        // socket.on('/dash/asistencias', cardAsistencias.bind(null, myId));
        socket.on('/dash/registros', cardRegistros.bind(null, myId));
      })
    }
  )

export { route }