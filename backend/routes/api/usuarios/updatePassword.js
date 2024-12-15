import { Route } from "../../../utils/template/Route.js";

let route = new Route('/api/usuarios/profile/updatePassword')
  .postAdd(
    async function (req, res, next) {
      try {
        let session = this.cache.apiKey.read(req.cookies.apiKey);

        let permiso = await this.model.tb_permisos.userPathUpdate(session.usuario.id, module.exports.nameRoute);

        if (!permiso) return res.status(403).json({ err: 'Tu usuario no tiene Permisos para esta peticion.' });

        let { id } = session.usuario;

        let {
          passwordCurrent,
          passwordNew
        } = req.body;

        await this.model.tb_usuarios.hasIdPassword(id, passwordCurrent);

        let OkPacket = await this.model.tb_usuarios.updateIdPassword(id, passwordNew);

        res.cookie('login', { usuario: session.usuario.usuario, clave: passwordNew }, {
          maxAge: 30 * 24 * 60 * 60 * 60 * 1000,
          sameSite: 'Strict',
          httpOnly: true
        });

        res.status(200).json({ OkPacket })
      } catch (e) {
        this.responseErrorApi(req, res, next, e)
      }
    }
  )

export { route }