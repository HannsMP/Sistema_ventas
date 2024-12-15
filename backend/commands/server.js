import { Command } from '../utils/template/Command.js';

let command = new Command('server')
  .setCoolDown(30 * 1000)
  .setDescription(
    'Permite controlar el estado del servidor.',
    '  Uso: */ server[accion] *',
    '  si no se especifica accion: retorna informacion del servidor.',
    '  accion:',
    '    * start *: enciende el servidor.',
    '    * restart *: reinicia el servidor.',
    '    * stop *: apaga el servidor.'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);

    if (!permiso) return

    let [estado] = arg;

    let sendMsg = [];

    if (estado == 'start') {
      if (this.estado)
        sendMsg.push('👨‍🚀 EL servidor ya fue encendido');
      else {
        try {
          await this.listen();
          sendMsg.push('👨‍🚀 Servidor Encendido Exitosamente!');
        } catch (e) {
          sendMsg.push('👨‍🚀 ⚠ Ocurrio un error al intentar encender el servidor.', e.message, e.stack);
        }
      }
    }
    else if (estado == 'stop') {
      if (this.estado) {
        try {
          await this.close();
          sendMsg.push('👨‍🚀 Servidor Apagado Exitosamente!');
        } catch (e) {
          sendMsg.push('👨‍🚀 ⚠ Ocurrio un error al intentar apagar el servidor.', e.message, e.stack);
        }
      }
      else
        sendMsg.push('👨‍🚀 EL servidor ya fue Apagado.');
    }
    else if (estado == 'restart') {
      if (this.estado) {
        try {
          await this.close();
          await this.listen();
          sendMsg.push('👨‍🚀 Servidor se reinicio Exitosamente!');
        } catch (e) {
          sendMsg.push('👨‍🚀 ⚠ Ocurrio un error al intentar reiniciar el servidor.', e.message, e.stack);
        }
      }
      else {
        await this.listen();
        sendMsg.push('👨‍🚀 EL servidor no estaba encendido, pero ahora si.');
      }
    }
    else
      sendMsg.push(
        '*Informacion del Servidor*',
        `Sockets: ${this.socket.io.sockets.sockets.size}`
      )

    msg.reply(sendMsg.join('\n'));

    complete();
  });

export { command };