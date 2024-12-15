import { Route } from '../../../utils/template/Route.js';
import { Upload } from '../../../utils/Upload.js';
import { resolve, relative, join, basename } from 'path';

const dirwork = resolve();
const dest = join(dirwork, '.temp', 'img');
const destSrc = join(dirwork, 'src', 'resource', 'productos');

let upload = new Upload({
  directory: dest,
  validFormats: /jpeg|jpg|png|webp|tiff|gif|avif/
})

let nameRoute = "/control/mantenimiento/inventario";
let viewRenderPath = resolve('frontend', 'view', 'control', 'mantenimiento', 'inventario.ejs');
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

      /** 
       * @typedef {Map<number, {
       *   data:Upload.DataUpdate,
       *   dataSave: {}
       *   chunkLength:number,
       *   chunkSize:number,
       *   chunks:Uint8Array[]
       * }>} MapUpload 
       */

      /** @param {import('datatables.net-dt').AjaxData} tableReq @param {(res:import('datatables.net-dt').AjaxResponse)=>void} res */
      let readTable = async (tableReq, res) => {
        let result = {
          draw: tableReq.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_productos.readInParts(tableReq);
          let recordsFiltered = this.model.tb_productos.readInPartsCount(tableReq);
          let recordsTotal = this.model.tb_productos.readCount(null, true);

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
          let data = await this.model.tb_productos.readJoinId(id);
          res(data)
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
      }

      /** 
       * @param {number} myId 
       * @param {MapUpload} uploadMap
       * @param {{
       *   id:number,
       *   data?:Upload.DataUpdate,
       *   chunkLength?:number,
       *   chunk?:Uint8Array,
       * }?} fileData
       * @param {()=>void} res 
       */
      let insertTable = async (myId, uploadMap, productoData, fileData, res) => { // id, file
        let fileId = fileData?.id;

        try {
          let has = uploadMap.has(fileId);

          if (!has) {
            permiso = await this.model.tb_permisos.userPathUpdate(myId, nameRoute);
            if (!permiso) return res('No tienes Permisos para insertar nuevos productos.');
          }

          let foto_id = 2;

          if (fileId) {

            if (!has) {
              let { chunkLength, data } = fileData;

              if (!chunkLength || !data) return res('Imagen sin campos especificos');

              uploadMap.set(fileId, { data, chunkLength, producto: productoData, chunks: [] });

              return res(null, {
                index: 0,
                complete: false
              })
            }

            let collector = uploadMap.get(fileId);
            if (!collector) return res('A ocurrido un error inesperado, intentalo de nuevo');

            let { data, producto, chunkLength, chunks } = collector;
            let { chunk } = fileData;

            if (!(chunk instanceof Uint8Array)) {
              uploadMap.delete(fileId);
              return res('Imagen dañada, vuelve a intentarlo');
            }
            chunks.push(chunk);

            let complete = chunkLength == chunks.length;
            if (!complete)
              return res(null, {
                index: chunks.length,
                complete
              })

            data.buffer = new Uint8Array(data.size);
            let offset = 0;

            for (let chunk of chunks) {
              data.buffer.set(chunk, offset);
              offset += chunk.length;
            }

            let imagenData = upload.single(data);
            let imagenHash = imagenData.hash();

            let dataFoto = await this.model.tb_fotos.readHash(imagenHash);

            if (!dataFoto) {
              await imagenData.save();

              let baseFile = basename(imagenData.path);
              let ext = imagenData.ext;

              let normalSizePath = join(destSrc, 'normal', baseFile);
              let smallSizePath = join(destSrc, 'small', baseFile);

              let asyncNormal = imagenData.resize(normalSizePath, 500);
              let asyncSmall = imagenData.resize(smallSizePath, 50);

              await asyncNormal;
              await asyncSmall;

              let src = '/' + relative(dirwork, normalSizePath).replaceAll('\\', '/');
              let src_small = '/' + relative(dirwork, smallSizePath).replaceAll('\\', '/');

              let { insertId } = await this.model.tb_fotos.insert({
                hash: imagenHash,
                tipo: ext,
                tabla: this.model.tb_usuarios.name,
                nombre: imagenData.originalname,
                src_small,
                src
              });

              if (insertId)
                dataFoto = { id: insertId, src, src_small }
              else {
                uploadMap.delete(fileId);
                return res('Ocurrió un error al crear la imagen.');
              }
            }

            foto_id = dataFoto.id;
            productoData = producto;
            uploadMap.delete(fileId);
          }

          let {
            categoria_id,
            descripcion,
            producto,
            estado,
            venta,

            avanzado,
            cantidad,
            compra,
            proveedor_id,
            transaccion_id
          } = productoData;

          let codigo = await this.model.tb_productos.getCodigo();

          let result = await this.model.tb_productos.insert({
            foto_id,
            codigo,

            categoria_id,
            descripcion,
            producto,
            estado,
            venta,

            stock_disponible: 0
          });

          let producto_id = result.insertId;

          if (result.affectedRows) res(null, { complete: true });

          if (avanzado) {

            let isRefresh = !!transaccion_id;

            if (!transaccion_id) {
              let resultTransCompra = await this.model.tb_transacciones_compras.insert({
                codigo: await this.model.tb_transacciones_compras.getCodigo(),
                usuario_id: myId,
                proveedor_id,
                importe_total: cantidad * compra,
                metodo_pago_id: 1
              })

              transaccion_id = resultTransCompra.insertId;
            }

            this.model.tb_compras.insert({
              transaccion_id,
              producto_id,
              cantidad,
              compra
            })

            if (isRefresh)
              await this.model.tb_transacciones_compras.refreshId(Number(transaccion_id));

            this.model.tb_compras.io.tagsName.get(`usr:${myId}`)?.emit(
              '/transacciones_compras/data/insert',
              _ => [{
                transaccion_id,
                producto_id,
                cantidad,
                compra
              }]
            )
          }
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          if (fileId) uploadMap.delete(fileId);
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** 
       * @param {number} myId 
       * @param {MapUpload} uploadMap
       * @param {{
       *   id:number,
       *   data?:Upload.DataUpdate,
       *   chunkLength?:number,
       *   chunk?:Uint8Array,
       * }?} fileData
       * @param {()=>void} res 
       */
      let updateIdTable = async (myId, uploadMap, productoData, fileData, res) => {
        let fileId = fileData?.id;

        try {
          let has = uploadMap.has(fileId);

          if (!has) {
            let permiso = await this.model.tb_permisos.userPathUpdate(myId, nameRoute);
            if (!permiso) return res('No tienes Permisos para editar los productos.');
          }

          let foto_id = 0;

          if (fileId) {

            if (!has) {
              let { chunkLength, data } = fileData;

              if (!chunkLength || !data) return res('Imagen sin campos especificos');

              uploadMap.set(fileId, { data, chunkLength, dataSave: productoData, chunks: [] });

              return res(null, {
                index: 0,
                complete: false
              })
            }

            let collector = uploadMap.get(fileId);
            if (!collector) return res('A ocurrido un error inesperado, intentalo de nuevo');

            let { data, dataSave, chunkLength, chunks } = collector;
            let { chunk } = fileData;

            if (!(chunk instanceof Uint8Array)) {
              uploadMap.delete(fileId);
              return res('Imagen dañada, vuelve a intentarlo');
            }

            chunks.push(chunk);

            let complete = chunkLength == chunks.length;
            if (!complete)
              return res(null, {
                index: chunks.length,
                complete
              })

            data.buffer = new Uint8Array(data.size);
            let offset = 0;

            for (let chunk of chunks) {
              data.buffer.set(chunk, offset);
              offset += chunk.length;
            }


            let imagenData = upload.single(data);
            let imagenHash = imagenData.hash();

            let dataFoto = await this.model.tb_fotos.readHash(imagenHash);

            if (!dataFoto) {
              await imagenData.save();

              let baseFile = basename(imagenData.path);
              let ext = imagenData.ext;

              let normalSizePath = join(destSrc, 'normal', baseFile);
              let smallSizePath = join(destSrc, 'small', baseFile);

              let asyncNormal = imagenData.resize(normalSizePath, 500);
              let asyncSmall = imagenData.resize(smallSizePath, 50);

              await asyncNormal;
              await asyncSmall;

              let src = '/' + relative(dirwork, normalSizePath).replaceAll('\\', '/');
              let src_small = '/' + relative(dirwork, smallSizePath).replaceAll('\\', '/');

              let { insertId } = await this.model.tb_fotos.insert({
                hash: imagenHash,
                tipo: ext,
                tabla: this.model.tb_usuarios.name,
                nombre: imagenData.originalname,
                src_small,
                src
              });

              if (insertId)
                dataFoto = { id: insertId, src, src_small }
              else {
                uploadMap.delete(fileId);
                return res('Ocurrió un error al crear la imagen.');
              }
            }

            foto_id = dataFoto.id;
            productoData = dataSave;
            uploadMap.delete(fileId);
          }

          let {
            id: producto_id,
            producto,
            descripcion,
            categoria_id,
            venta
          } = productoData;

          let result = await this.model.tb_productos.updateId(producto_id, {
            foto_id,

            categoria_id,
            descripcion,
            producto,
            venta,
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
          if (!permiso) return res('No tienes Permisos para controlar el estado de los productos.');

          let result = await this.model.tb_productos.updateIdState(id, estado ? 1 : 0);
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
          if (!permiso) return res('No tienes Permisos para controlar la eliminacion de los productos.');

          let result = await this.model.tb_productos.deleteId(id);
          if (result.affectedRows) res();
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      /** @param {number} precio_compra @param {()=>void} res */
      let predictPrecioVenta = async (precio_compra, res) => {
        try {
          let precio_venta = await this.neuralNetwork.precio_venta.predict(precio_compra)
          res(precio_venta);
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
        }
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

      /** @param {SelectorRequest} selectorReq @param {SelectorEnd} res */
      let selectorProveedor = async (selectorReq, res) => {
        let result = {
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_proveedores.SelectorInParts(selectorReq);
          let recordsFiltered = this.model.tb_proveedores.SelectorInPartsCount(selectorReq);
          let recordsTotal = this.model.tb_proveedores.readCount(null, true);

          result.data = await data;
          result.recordsFiltered = await recordsFiltered;
          result.recordsTotal = await recordsTotal;
        } catch (e) {
          return this.logError.writeStart(e.message, e.stack)
        }

        res(result)
      }

      /** @param {number} myId @param {SelectorRequest} selectorReq @param {SelectorEnd} res */
      let selectorCompra = async (myId, selectorReq, res) => {
        let result = {
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        }

        try {
          let data = this.model.tb_transacciones_compras.SelectorInParts(selectorReq, myId);
          let recordsFiltered = this.model.tb_transacciones_compras.SelectorInPartsCount(selectorReq, myId);
          let recordsTotal = this.model.tb_transacciones_compras.readCount();

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
        /** @type {MapUpload} */
        let upload = new Map;

        socket.on('/read/table', readTable)
        socket.on('/readId/table', readIdTable)
        socket.on('/insert/table', insertTable.bind(null, myId, upload))
        socket.on('/updateId/table', updateIdTable.bind(null, myId, upload))
        socket.on('/stateId/table', stateIdTable.bind(null, myId))
        socket.on('/deleteId/table', deleteIdTable.bind(null, myId))
        socket.on('/predict/precio_venta', predictPrecioVenta)
        socket.on('/selector/categorias', selectorCategoria)
        socket.on('/selector/proveedor', selectorProveedor)
        socket.on('/selector/compra', selectorCompra.bind(null, myId))
      })
    }
  )

export { route }