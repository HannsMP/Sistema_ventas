import { Upload } from '../../utils/Upload.js';
import { Route } from '../../utils/template/Route.js';
import { resolve, relative, join, basename } from 'path';

let dirwork = resolve();
let dest = join(dirwork, '.temp', 'img');
let destSrc = join(dirwork, 'src', 'resource', 'usuarios');

let upload = new Upload({
  directory: dest,
  validFormats: /jpeg|jpg|png|webp|tiff|gif|avif/
})

let nameRoute = "/control/perfil";
let viewRenderPath = resolve('frontend', 'view', 'control', 'perfil.ejs');
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
       *   chunkLength:number,
       *   chunks:Uint8Array[]
       * }>} MapUpload 
       */

      /** 
       * @param {number} myId 
       * @param {MapUpload} uploadMap
       * @param {{
       *   id:number,
       *   data?:Upload.DataUpdate,
       *   chunkLength?:number,
       *   chunk?:Uint8Array,
       * }} fileData
       * @param {()=>void} res 
       */
      let updateAvatarProfile = async (myId, uploadMap, fileData, res) => {
        let fileId = fileData?.id;

        try {
          if (!fileId) return res('Imagen no definida');

          let has = uploadMap.has(fileId);

          if (!has) {
            let { chunkLength, data } = fileData;

            if (!chunkLength && !data) return res('Imagen sin campos especificos');

            let permiso = await this.model.tb_permisos.userPathUpdate(myId, nameRoute);
            if (!permiso) return res('No tienes Permisos para actualizar el avatar de tu usuario.');

            uploadMap.set(fileId, { data, chunkLength, chunks: [] });

            return res(null, {
              index: 0,
              complete: false
            })
          }

          let collector = uploadMap.get(fileId);
          if (!collector) return res('A ocurrido un error inesperado, intentalo de nuevo');

          let { data, chunkLength, chunks } = collector;
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
              return res('Ocurrio un error, al crear la imagen.');
            }
          }

          let result = await this.model.tb_usuarios.updateIdFotoId(myId, dataFoto.id, {
            id: dataFoto.id,
            src: dataFoto.src,
            src_small: dataFoto.src_small
          });

          uploadMap.delete(fileId);
          if (result.affectedRows) res(null, { complete });
        } catch (e) {
          this.logError.writeStart(e.message, e.stack)
          uploadMap.delete(fileId);
          res('Ocurrio un error, ponte en contacto con el administrador.');
        }
      }

      node.ev.on('connected', socket => {
        let myId = socket.session.usuario_id;
        socket.on('/updateAvatar/profile', updateAvatarProfile.bind(null, myId, new Map))
      })
    }
  )

export { route }