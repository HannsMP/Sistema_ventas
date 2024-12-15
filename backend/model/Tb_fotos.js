import { resolve } from 'path';

import { Table } from '../utils/template/Table.js';
import { deletePath } from '../utils/function/deletePath.js';

const name = 'tb_fotos'
const columns = {
  id: { name: 'id', null: false, type: 'Integer', limit: 11 },
  hash: { name: 'hash', null: false, type: 'String', limit: 64, unic: true },
  src: { name: 'src', null: false, type: 'String', limit: 250 },
  src_small: { name: 'src_small', null: false, type: 'String', limit: 250 },
  tipo: { name: 'tipo', null: false, type: 'String', limit: 10 },
  tabla: { name: 'tabla', null: false, type: 'String', limit: 50 },
  nombre: { name: 'nombre', null: false, type: 'String', limit: 100 },
  creacion: { name: 'creacion', null: false, type: 'String', limit: 25 }
}

/**
 * @typedef {{
*   id: number,
*   hash: string,
*   src: string,
*   src_small: string,
*   tipo: string,
*   tabla: string,
*   nombre: string,
*   creacion: string
* }} COLUMNS_FOTOS
*/

/** @extends {Table<COLUMNS_FOTOS>} */
export class Tb_fotos extends Table {
  cacheImg = resolve('.temp', 'img')
  /** @param {import('../Structure').Structure} main */
  constructor(main) {
    super(name);
    this.columns = columns;
    this.main = main;
    deletePath(this.cacheImg);
  }
  /**
   * @param {COLUMNS_FOTOS} data
   * @returns {Promise<import('mysql').OkPacket>}
   */
  insert(data) {
    return new Promise(async (res, rej) => {
      try {
        let {
          hash,
          nombre,
          tabla,
          tipo,
          src,
          src_small
        } = data;

        this.constraint('hash', hash);
        this.constraint('nombre', nombre);
        this.constraint('tabla', tabla);
        this.constraint('tipo', tipo);
        this.constraint('src', src);
        this.constraint('src_small', src_small);

        let [result] = await this.main.model.pool(`
          INSERT INTO
            tb_fotos (
              hash,
              nombre,
              tabla,
              tipo,
              src,
              src_small
            )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `, [
          hash,
          nombre,
          tabla,
          tipo,
          src,
          src_small
        ])

        res(result);
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {string} hash
   * @returns {Promise<COLUMNS_FOTOS>}
   */
  readHash(hash) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('hash', hash);

        let [result] = await this.main.model.pool(`
          SELECT
            *
          FROM
            tb_fotos
          WHERE
            hash = ?
        `, [
          hash
        ])

        res(result[0])
      } catch (e) {
        rej(e)
      }
    })
  }
}