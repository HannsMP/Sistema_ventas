import { Command } from '../utils/template/Command.js';
import { deletePath } from '../utils/function/deletePath.js';

import { resolve } from 'path';

let command = new Command('cache')
  .setCoolDown(30 * 1000)
  .setDescription(
    'Permite controlar la cache del backend.',
    '  Uso: */cache [accion] [carpeta]*',
    '  accion:',
    '    *clear*: limpia el interior de una c,arpeta cache.',
    '  carpeta:',
    '    *img*'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);

    if (!permiso) return

    let [accion, carpeta] = arg;

    let sendMsg = [];

    if (accion == 'clear') {
      if (carpeta == 'img') {
        try {
          let countFileDelete = await deletePath(resolve('.temp', 'img'));
          sendMsg.push(`👨‍🚀 Cantidad de contenido eliminado en ${carpeta}: ${countFileDelete}`);
        } catch (e) {
          sendMsg.push(`👨‍🚀 ⚠ Ocurrio un error al intentar limpiar la carpeta ${carpeta}`, e.message, e.stack);
        }
      }
    }

    msg.reply(sendMsg.join('\n'));

    complete();
  });

export { command };