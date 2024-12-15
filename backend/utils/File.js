import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { isAbsolute, extname, dirname, parse, resolve } from 'path';
import { mergeObjects } from './function/merge.js';
import { Event } from '../utils/Event.js';

const defaultOption = {
  autoSave: true,
  extname: 'ext?',
  default: ''
}

export class File {
  /** 
   * @type {Event<{
   *   write: string,
   *   read: string
   * }>} 
   */
  ev = new Event;

  #pathFile;
  #option;
  /** @param {string} pathFile @param {defaultOption} option  */
  constructor(pathFile, option) {
    this.#option = mergeObjects(defaultOption, option);

    this.#pathFile = isAbsolute(pathFile)
      ? pathFile
      : resolve(pathFile);

    if (extname(pathFile).toLowerCase() != this.#option.extname)
      throw new Error(`Formate del archivo válido. Asegúrese de que la extencion sea ${this.#option.extname}`);

    this.property = parse(this.#pathFile)

    this.mkdir();
  }
  mkdir() {
    if (this.exist()) return true;

    mkdirSync(dirname(this.#pathFile), { recursive: true });
    this.writeFile(this.#option.default);
  }
  /** @param {boolean} state  */
  setAutoSave(state) {
    this.#option.autoSave = state;
  }
  exist() {
    return existsSync(this.#pathFile);
  }
  /** @param {string} data  */
  writeFile(data) {
    if (!this.#option.autoSave) return;
    writeFileSync(this.#pathFile, data);
    this.ev.emit('write', data);
  }
  readFile() {
    let data = readFileSync(this.#pathFile, 'utf-8');
    this.ev.emit('write', data);
    return data;
  }
  statFile() {
    return statSync(this.#pathFile);
  }
}