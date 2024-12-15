
/** @typedef {import('../../Structure')} Structure */
/** @typedef {Map<string, { start: number, intent: number }>} OnCooldown */
/** @typedef {(err: Error | string) => void} Complete */
/** @typedef {(this: Structure, phone: string, message: import('whatsapp-web.js').Message, arg: string[], complete: Complete) => (void | Promise<void>)} Run */

export class Command {
  /** @type {OnCooldown} */
  onCooldown = new Map;
  cooldown = 0;
  description = '';
  /** @type {Run} */
  run;

  constructor(name = '', load = true) {
    this.name = name;
    this.load = load;
  }

  /** @param {number} cooldown  */
  setCoolDown(cooldown) {
    this.cooldown = cooldown;
    return this;
  }

  /** @param {string[]} description  */
  setDescription(...description) {
    this.description = description.join('\n');
    return this;
  }

  /** @param {Run} fun  */
  exec(fun) {
    this.run = fun;
    return this;
  }
}