import { Server } from "socket.io";
import cookie from 'cookie'
import { SocketNode } from "../utils/SocketNode.js";

export class Socket {
  /** @param {import('../Structure').Structure} main  */
  constructor(main) {
    this.main = main;

    this.io = new Server(main.server.http);

    this.node = new SocketNode;

    this.io.use(async (socketClient, next) => {
      try {
        let cookies = socketClient.handshake.headers.cookie;

        if (!cookies)
          throw new Error('No se encontraron cookies');

        let referer = socketClient.handshake.headers.referer;

        if (!referer)
          throw new Error('No Existe la referencia');

        let parsedCookies = cookie.parse(cookies);
        let apikey = parsedCookies.apiKey;

        if (!apikey)
          throw new Error('ApiKey no encontrada en las cookies');

        socketClient.session = { apikey };

        if (!this.main.cache.apiKey.exist(apikey))
          throw new Error('ApiKey no válida');

        socketClient.session.apikey = apikey;


        let { usuario } = this.main.cache.apiKey.read(apikey);
        let route = new URL(referer)

        let tags = [`rol:${usuario.rol_id}`, `usr:${usuario.id}`, `api:${apikey}`, `url:${route.pathname}`];
        socketClient.session.data = usuario;
        socketClient.session.route = route.pathname;
        socketClient.session.usuario_id = usuario.id;
        socketClient.session.rol_id = usuario.rol_id;
        socketClient.session.tags = tags;

        next();
      } catch (error) {
        next(error);
      }
    })
    this.io.on('connection', socketClient => {
      this.node.addSocket(
        socketClient.session.route,
        socketClient,
        socketClient.session.tags
      );

      socketClient.on('disconnect', () => {
        this.main.model.tb_asistencias.updateUserId(socketClient.session.usuario_id);
      })

      socketClient.on('/err/client', ({ message, stack, urlScript }) => {
        this.main.logError.writeStart(`route: ${urlScript}\nuser: ${socketClient.session.data.usuario}\nmessage: ${message}\nstack: ${stack}`);
      })
    })
  }
}