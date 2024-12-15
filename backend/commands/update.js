import { Command } from '../utils/template/Command.js';

let command = new Command('update')
  .setCoolDown(5 * 60 * 1000)
  .setDescription(
    'Actualiza el sistema git a la ultima version del git remoto.',
    '  Uso: */update *'
  )
  .exec(async function (phone, msg, arg, complete) {
    let permiso = await this.model.tb_permisos.phonePathView(phone, module.exports.name);
    if (!permiso) return

    let msgCurrent = await msg.reply('Iniciando actualizacion remota...');
    complete();

    let timeoutId = setTimeout(() => {
      this.system.reboot();
    }, 30 * 1000);

    try {
      let [respnoseCmd] = await this.system.cmd('(cd /home/eliux/servidor && git fetch origin && git reset --hard origin/main) >> /home/eliux/logs/server_cron_log.log 2>&1');
    } catch (e) {
      clearTimeout(timeoutId);
    }

    setTimeout(() => {
      msgCurrent.edit('⚠ El proceso fallo.');
    }, 60 * 1000);
  });

export { command };