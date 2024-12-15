import { Table } from '../utils/template/Table.js';

const name = 'tipo_documento';
const columns = {
  id: { name: 'id', null: false, type: 'Integer', limit: 11 },
  nombre: { name: 'nombre', null: false, type: 'String', limit: 20 },
  descripcion: { name: 'descripcion ', null: false, type: 'String', limit: 50 },
  estado: { name: 'estado', null: false, type: 'Integer', limit: 1 }
}

/**
 * @typedef {{
 *   id: number,
 *   nombre: string,
 *   estado: number
 * }} COLUMNS_TIPO_DOCUMENTO
 */

/** @extends {Table<COLUMNS_TIPO_DOCUMENTO>} */
export class Tipo_documento extends Table {
  /** @param {import('../../main')} main */
  constructor(main) {
    super(name);
    this.columns = columns;
    this.main = main;
  }
  /*
    ====================================================================================================
    =============================================== Tabla ===============================================
    ====================================================================================================
  */
  /**
   * @param {import('datatables.net-dt').AjaxData} option
   * @returns {Promise<COLUMNS_TIPO_DOCUMENTO[]>}
   */
  readInParts(option) {
    return new Promise(async (res, rej) => {
      try {
        let { order, start, length, search } = option;

        let query = `
          SELECT
            id,
            nombre,
            descripcion,
            estado
          FROM
            tipo_documento
        `, queryParams = [];

        if (search.value) {
          query += `
            WHERE
              nombre LIKE ?
              OR descripcion LIKE ?
          `;

          queryParams.push(
            `%${search.value}%`,
            `%${search.value}%`
          );
        }

        let columnsSet = new Set([
          'id',
          'nombre',
          'descripcion',
          'estado'
        ]);

        order = order.filter(d => columnsSet.has(d.name));

        if (order?.length) {
          query += `
            ORDER BY
          `
          order.forEach(({ dir, name }, index) => {
            query += `
              ${name} ${dir == 'asc' ? 'ASC' : 'DESC'}`;

            if (index < order.length - 1)
              query += ', ';
          })
        }

        query += `
          LIMIT ? OFFSET ?
        `;
        queryParams.push(length, start);

        let [result] = await this.main.model.pool(query, queryParams);

        res(result);
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {import('datatables.net-dt').AjaxData} option
   * @returns {Promise<number>}
   */
  readInPartsCount(option) {
    return new Promise(async (res, rej) => {
      try {
        let { search } = option;

        let query = `
          SELECT
            COUNT(id) AS cantidad
          FROM
            tipo_documento
        `, queryParams = [];

        if (search.value) {
          query += `
            WHERE
              nombre LIKE ?
              OR descripcion LIKE ?
          `;

          queryParams.push(
            `%${search.value}%`,
            `%${search.value}%`
          );
        }

        let [result] = await this.main.model.pool(query, queryParams);

        res(result[0].cantidad);
      } catch (e) {
        rej(e);
      }
    })
  }
  /*
    ====================================================================================================
    ============================================== Selector ==============================================
    ====================================================================================================
  */
  /**
   * @param {SelectorRequest} option
   * @returns {Promise<COLUMNS_TIPO_DOCUMENTO[]>}
   */
  SelectorInParts(option) {
    return new Promise(async (res, rej) => {
      try {
        let { order, start, length, search, byId, noInclude } = option;

        let query = `
          SELECT
            id,
            nombre AS name
          FROM
            tipo_documento
          WHERE
            estado = 1
        `, queryParams = [];

        if (search) {
          if (byId) {
            query += `
              AND id = ?
            `;

            queryParams.push(search);
          }
          else {
            query += `
              AND nombre LIKE ?
            `;

            queryParams.push(`%${search}%`);
          }
        }

        if (noInclude.length && noInclude.every(id => typeof id == 'number')) {
          query += `
            AND id NOT IN (${noInclude.map(_ => '?').join(',')})
          `
          queryParams.push(...noInclude);
        }

        if (order) {
          query += `
            ORDER BY
              nombre ${order == 'asc' ? 'ASC' : 'DESC'}
          `
        }

        query += `
          LIMIT ? OFFSET ?
        `;

        queryParams.push(length, start);

        let [result] = await this.main.model.pool(query, queryParams);

        res(result);
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {SelectorRequest} option
   * @returns {Promise<number>}
   */
  SelectorInPartsCount(option) {
    return new Promise(async (res, rej) => {
      try {
        let { search, noInclude } = option;

        let query = `
          SELECT
            COUNT(id) AS cantidad
          FROM
            tipo_documento
          WHERE
            estado = 1
        `, queryParams = [];

        if (typeof search == 'string' && search != '') {
          query += `
            AND nombre LIKE ?
          `;

          queryParams.push(`%${search}%`);
        }

        if (noInclude.length && noInclude.every(id => typeof id == 'number')) {
          query += `
            AND id NOT IN (${noInclude.map(_ => '?').join(',')})
          `
          queryParams.push(...noInclude);
        }

        let [result] = await this.main.model.pool(query, queryParams);

        res(result[0].cantidad);
      } catch (e) {
        rej(e);
      }
    })
  }
  /*
    ====================================================================================================
    ============================================== Grafico ==============================================
    ====================================================================================================
  */
  /**
   * @returns {Promise<{label:string[], data:number[]}>}
   */
  chartCountTypeDocument() {
    return new Promise(async (res, rej) => {
      try {
        let [result] = await this.main.model.pool(`
          SELECT
            td.nombre AS nombre,
            COALESCE(COUNT(c.id), 0) AS cantidad_tipo_cliente
          FROM
            tipo_documento AS td
          LEFT JOIN
            tb_clientes AS c
            ON
              c.tipo_cliente_id = td.id
          WHERE
            td.id IN (1, 2, 3)
            AND c.estado = 1
          GROUP BY
            td.nombre;
          `)

        let label = [], data = [];

        result.forEach(({ nombre, cantidad_tipo_cliente }) => {
          label.push(nombre);
          data.push(cantidad_tipo_cliente);
        })

        res({ label, data });
      } catch (e) {
        rej(e);
      }
    })
  }
}