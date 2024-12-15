import { Command } from '../utils/template/Command.js';

let command = new Command('apache')
  .setCoolDown(30 * 1000)
  .setDescription(
    'Permite controlar el estado del servidor Apache.',
    '  Uso: */apache [accion]*',
    '  si no se especifica accion: retorna informacion sobre el servidor Apache.',
    '  accion:',
    '    *start*: enciende el servidor Apache.',
    '    *restart*: Reinicia el servidor Apache.',
    '    *stop*: Detiene el servidor Apache.'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);

    if (!permiso) return

    let [action = 'status'] = arg;

    let sendMsg = [];
    try {
      await this.system.apache(action);
      sendMsg.push(`👨‍🚀 [Apache] ${action} orden ejecutada Exitosamente!`);
    } catch (e) {
      sendMsg.push(`👨‍🚀 ⚠ Ocurrio un error al intentar Ejecutar la orden ${action}.`, e.message, e.stack);
    }

    msg.reply(sendMsg.join('\n'));

    complete();
  });

export { command };