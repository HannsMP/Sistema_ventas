import { existsSync, mkdirSync, closeSync, openSync } from 'fs';
import { writeFile, rm } from 'fs/promises';
import { join, isAbsolute, resolve, extname } from 'path';
import { createHash } from 'crypto';
import sharp from 'sharp';

/**
 * @typedef {{
 *   id: number,
 *   chunkSize: number,
 *   totalChunks: number,
 *   lastModified: number,
 *   originalname: string,
 *   destination: string,
 *   mimetype: string,
 *   buffer: Buffer,
 *   size: number,
 * }} DataUpdate
 * @typedef {{
 *   directory: string,
 *   validFormats?: RegExp,
 *   renameCallback?: (data: DataUpdate & {ext:string})=>string
 * }} Option
 */

export class Data {
  isSave = false;
  /** @param {DataUpdate & {path:string, ext:string}} data  */
  constructor(data) {
    this.lastModified = data.lastModified;
    this.originalname = data.originalname;
    this.destination = data.destination;
    this.mimetype = data.mimetype;
    this.buffer = data.buffer;
    this.size = data.size;

    this.path = data.path;
    this.ext = data.ext;
  }

  hash() {
    return createHash('sha256').update(this.buffer).digest('hex');
  }

  async save() {
    if (this.isSave)
      throw new Error('El archivo ya fue Guardado');

    let asyncWrite = writeFile(this.path, this.buffer);
    this.isSave = true;
    return await asyncWrite;
  }

  /** 
   * @param {string} to 
   * @param {number|import('sharp').ResizeOptions} width 
   * @param {number|import('sharp').ResizeOptions} heigth  
   */
  async resize(to, width, heigth) {
    if (!this.isSave)
      throw new Error('El archivo aun no fue Guardado');

    let fd = openSync(this.path, 'r');
    let result = await sharp(this.path).resize(width, heigth).toFile(to);
    closeSync(fd);

    return result;
  }

  async remove() {
    if (!this.isSave)
      throw new Error('El archivo aun no fue Guardado');

    let fd = openSync(this.path, 'r');
    await sharp(this.path).toBuffer();
    closeSync(fd);

    return rm(this.path);
  }

  async empty() {
    if (!this.isSave)
      throw new Error('El archivo aun no fue Guardado');

    let fd = openSync(this.path, 'r');
    await sharp(this.path).toBuffer();
    closeSync(fd);

    return writeFile(this.path, '');
  }
}

export class Upload {
  #directory;
  #validFormats;
  /** @type {(data: DataUpdate & {ext:string}) => string} */
  #renameCallback = (d) => Date.now() + extname(d.originalname).toLowerCase();
  /** @param {Option} option */
  constructor(option) {
    this.#directory = isAbsolute(option.directory)
      ? option.directory
      : resolve(option.directory);

    this.#validFormats = option?.validFormats;
    if (option?.renameCallback) this.#renameCallback = option?.renameCallback;

    if (!existsSync(option.directory)) mkdirSync(option.directory, { recursive: true });
  }

  /** @param {DataUpdate} data */
  single(data) {
    return this.#processFile(data);
  }

  /** @param {DataUpdate[]} datas */
  multi(datas) {
    return datas.map(data => this.#processFile(data));
  }

  /**
   * @param {DataUpdate} data
   */
  #processFile(data) {
    let { mimetype, originalname } = data;

    if (this.#validFormats) {
      let isExtname = this.#validFormats.test(extname(originalname).toLowerCase());
      let isMimetype = this.#validFormats.test(mimetype);
      if (!isMimetype || !isExtname)
        throw new Error(`Formato inválido: ${mimetype}`);
    }

    let ext = mimetype.split('/')[1].toLowerCase();
    let newFileName = this.#renameCallback({ ...data, ext }) || originalname;
    let path = join(this.#directory, newFileName);

    return new Data({ ...data, path, ext });
  }
}