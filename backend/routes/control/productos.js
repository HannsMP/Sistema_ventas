import { Route } from '../../utils/template/Route.js';
import { resolve } from 'path';

let nameRoute = "/control/productos";
let viewRenderPath = resolve('frontend', 'view', 'control', 'productos.ejs');
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

      /** @param {CatalogueRequest} catalogueReq @param {CatalogueEnd} res */
      let readCatalogue = async (catalogueReq, res) => {
        let result = {
          draw: catalogueReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_productos.catalogueInParts(catalogueReq);
          let recordsFiltered = this.model.tb_productos.catalogueInPartsCount(catalogueReq);
          let recordsTotal = this.model.tb_productos.readCount(null, true);

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result);
      }

      /** @param {SelectorRequest} selectorReq @param {SelectorEnd} res */
      let selectorCategoria = async (selectorReq, res) => {
        let result = {
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_categorias.SelectorInParts(selectorReq);
          let recordsFiltered = this.model.tb_categorias.SelectorInPartsCount(selectorReq);
          let recordsTotal = this.model.tb_categorias.readCount(null, true);

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result)
      }

      node.ev.on('connected', socket => {
        socket.on('/read/catalogue', readCatalogue)
        socket.on('/selector/categorias', selectorCategoria)
      })
    }
  )

export { route }