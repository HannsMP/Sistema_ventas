import { Command } from '../utils/template/Command.js';

let command = new Command('recuperar')
  .setCoolDown(5 * 60 * 1000)
  .setDescription(
    'Envia un codigo de verificacion para recupera tu cuenta, por razones de seguridad para recuperarla se tiene que hacer la solicitud desde el numero registrado,',
    '  ¿cambiaste numero? ponte en contacto con el administrador',
    '  Uso: */recuperar*',
    '  No tiene parametros'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);

    if (!permiso) return

    let code = this.cache.codeRecovery.create({ phone });

    let msgCurrent = await msg.reply(`Tu codigo de recuperacion es: '${code}'`);

    this.cache.codeRecovery.ev.on('expire', c => {
      if (c != code) return;
      msgCurrent.edit(`El codigo Caduco`);
    }, { once: true });

    complete();
  });

export { command };