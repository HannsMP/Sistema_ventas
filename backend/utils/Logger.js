import { colors, optionColors } from '../utils/function/color.js';
import { Time } from '../utils/Time.js';
import { File } from '../utils/File.js';
import { mergeObjects } from '../utils/function/merge.js';
import { Event } from '../utils/Event.js';

/**
 * @type {{
 *   colorTime: keyof optionColors,
 *   colorLog: keyof optionColors,
 *   autoSave: boolean,
 *   emit: boolean,
 *   log: boolean
 * }}
 */
const defaultOption = {
  colorTime: 'reset',
  colorLog: 'reset',
  autoSave: false,
  log: true
}

export class Logger extends File {
  /** 
   * @type {Event<{
   *   write: string,
   *   writeStart: string,
   *   writeEnd: string,
   *   read: string
   * }>} 
   */
  ev = new Event;

  #option;

  /**
   * @param {string} pathFile
   * @param {Time} time
   * @param {defaultOption} option
   */
  constructor(pathFile, time, option) {
    option = mergeObjects(defaultOption, option);
    super(pathFile, { extname: '.log', autoSave: option.autoSave });
    this.#option = option;

    if (!optionColors?.[this.#option.colorTime])
      throw new Error("No existe el color seleccionado");

    if (!optionColors?.[this.#option.colorLog])
      throw new Error("No existe el color seleccionado");

    if (!time instanceof Time)
      throw new TypeError("El parametro de tiempo debe ser de instancia Time.");

    this.time = time;
  }
  reset() {
    this.writeFile('');
  }
  /** @param {keyof optionColors} color  */
  changeColor(color) {
    if (optionColors?.[color])
      this.#option.colorLog = color;
  }
  writeStart(...msg) {
    let dataText = this.readFile();
    let time = this.time.format();

    let log = 1 < msg.length
      ? `${time} ${msg.join(' ')}`
      : `${time} ${msg[0]}`;

    if (this.#option.log)
      this.#log(time, ...msg);

    dataText = log + "\n" + dataText;
    this.ev.emit('writeEnd', log);
    this.writeFile(dataText);

    return log
  }
  writeEnd(...msg) {
    let dataText = this.readFile();
    let time = this.time.format();

    let log = `${time} ${msg.join(' ')}`

    if (this.#option.log)
      this.#log(time, ...msg);

    dataText = dataText + "\n" + log;
    this.ev.emit('writeEnd', log);
    this.writeFile(dataText);

    return log
  }
  #log(start, ...log) {
    console.log(
      colors(this.#option.colorTime, start),
      colors(this.#option.colorLog, ...log)
    );
  }
}


// if (this.#option.emit)
//   this.io.sockets.emit(
//     `/logger/${this.property.name}/writeEnd`,
//     { log, stat: this.statFile() }
//   )
