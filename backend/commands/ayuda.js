import { Command } from '../utils/template/Command.js';

let command = new Command('ayuda')
  .setCoolDown(30 * 1000)
  .setDescription(
    'Ayuda mostrando la descripcion de los comandos existentes.',
    '  Uso: */ayuda [comando]*',
    '  comando: escribe un solo comando para que te muestre sus utilidades.'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);
    if (!permiso) return

    let [JustComand] = arg

    let permisos = await this.model.tb_permisos.phonePathAll(phone, JustComand);

    if (!permisos.length) {
      msg.reply('No se encontro el comando especificado o puede que no tengas permisos para verlo.');
      return complete();
    }

    permisos.forEach(({ commando, ver }) => {
      if (!ver) return;
      let { name, description, cooldown } = this.bot.collection[commando]
      let sendMsg = [
        `======== *${name.toUpperCase()}* ========`,
        `📄 ${description}`,
        `⏰ Tiempo de enfriamiento: _${cooldown / 1000} seg_`,
        ''
      ];

      msg.reply(sendMsg.join('\n'));
    })

    complete();
  });

export { command };