import { Table } from '../utils/template/Table.js';
import { Id } from '../utils/Id.js';

const name = 'tb_transacciones_ventas';
const columns = {
  id: { name: 'id', null: false, type: 'Integer', limit: 11 },
  codigo: { name: 'codigo ', null: false, type: 'String', limit: 50 },
  cliente_id: { name: 'cliente_id', null: false, type: 'Integer', limit: 11 },
  usuario_id: { name: 'usuario_id', null: false, type: 'Integer', limit: 11 },
  importe_total: { name: 'importe_total ', null: false, type: 'Number', limit: 10, decimal: 2 },
  metodo_pago_id: { name: 'metodo_pago_id', null: false, type: 'Integer', limit: 11 },
  descuento: { name: 'descuento ', null: false, type: 'Number', limit: 10, decimal: 2 },
  serie: { name: 'serie', null: true, type: 'String', limit: 20 },
  comentario: { name: 'comentario', null: true, type: 'String', limit: 250 },
  creacion: { name: 'creacion', null: false, type: 'String', limit: 25 }
}

/**
 * @typedef {{
 *   id: number,
 *   codigo: string,
 *   cliente_id: number,
 *   usuario_id: number,
 *   importe_total: number,
 *   metodo_pago_id: number,
 *   descuento: number,
 *   serie: string,
 *   comentario: string,
 *   creacion: string
 * }} COLUMNS_TRANSACCIONES_VENTAS
 */

/** @extends {Table<COLUMNS_TRANSACCIONES_VENTAS>} */
export class Tb_transacciones_ventas extends Table {
  id = new Id('S        ', { letters: true, numeric: true });

  /** @param {import('../Structure').Structure} main */
  constructor(main) {
    super(name);
    this.columns = columns;
    this.main = main;

    this.io = main.socket.node.selectNode('/control/reportes/ventas', true);
  }
  /*
    ====================================================================================================
    =============================================== Tabla ===============================================
    ====================================================================================================
  */
  /**
   * @param {import('datatables.net-dt').AjaxData} option
   * @returns {Promise<COLUMNS_TRANSACCIONES_VENTAS[]>}
   */
  readInParts(option) {
    return new Promise(async (res, rej) => {
      try {
        let { order, start, length, search } = option;

        let query = `
          SELECT
            tv.id,
            tv.usuario_id,
            u.usuario,
            tv.metodo_pago_id,
            mp.nombre AS metodo_pago_nombre,
            tv.cliente_id,
            c.nombres,
            tv.codigo,
            tv.importe_total,
            tv.descuento,
            tv.creacion
          FROM
            tb_transacciones_ventas AS tv
          INNER
            JOIN tb_usuarios AS u
              ON
                tv.usuario_id = u.id
          INNER
            JOIN tipo_metodo_pago AS mp
              ON
                tv.metodo_pago_id = mp.id
          INNER
            JOIN tb_clientes AS c
              ON
                tv.cliente_id = c.id
        `, queryParams = [];

        if (search.value) {
          query += `
            WHERE
              tv.codigo LIKE ?
              OR u.usuario LIKE ?
              OR mp.nombre LIKE ?
              OR tv.descuento LIKE ?
              OR tv.importe_total LIKE ?
              OR tv.creacion LIKE ?
          `;

          queryParams.push(
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`
          );
        }

        let columnsSet = new Set([
          'tv.codigo',
          'u.usuario',
          'mp.nombre',
          'tv.descuento',
          'tv.importe_total',
          'tv.creacion'
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
   * @returns {Promise<COLUMNS_TRANSACCIONES_VENTAS[]>}
   */
  readInPartsCount(option) {
    return new Promise(async (res, rej) => {
      try {
        let { search } = option;

        let query = `
          SELECT
            COUNT(tv.id) AS cantidad
          FROM
            tb_transacciones_ventas AS tv
          INNER
            JOIN tb_usuarios AS u
              ON
                tv.usuario_id = u.id
          INNER
            JOIN tipo_metodo_pago AS mp
              ON
                tv.metodo_pago_id = mp.id
          INNER
            JOIN tb_clientes AS c
              ON
                tv.cliente_id = c.id
        `, queryParams = [];

        if (search.value) {
          query += `
            WHERE
              tv.codigo LIKE ?
              OR u.usuario LIKE ?
              OR mp.nombre LIKE ?
              OR tv.descuento LIKE ?
              OR tv.importe_total LIKE ?
              OR tv.creacion LIKE ?
          `;

          queryParams.push(
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`,
            `%${search.value}%`,
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
  /**
   * @param {COLUMNS_TRANSACCIONES_VENTAS} data
   * @returns {Promise<import('mysql').OkPacket>}
   */
  insert(data) {
    return new Promise(async (res, rej) => {
      try {
        let {
          codigo,
          cliente_id,
          usuario_id,
          importe_total,
          metodo_pago_id,
          descuento,
          serie = '',
          comentario = ''
        } = data;

        this.constraint('codigo', codigo);
        this.constraint('cliente_id', cliente_id);
        this.constraint('usuario_id', usuario_id);
        this.constraint('importe_total', importe_total);
        this.constraint('metodo_pago_id', metodo_pago_id);
        this.constraint('descuento', descuento);
        this.constraint('serie', serie);
        this.constraint('comentario', comentario);

        let values = [
          codigo,
          cliente_id,
          usuario_id,
          importe_total,
          metodo_pago_id,
          descuento,
        ]

        if (serie) values.push(serie);
        if (comentario) values.push(comentario);

        let [result] = await this.main.model.pool(`
          INSERT INTO
            tb_transacciones_ventas (
              codigo,
              cliente_id,
              usuario_id,
              importe_total,
              metodo_pago_id,
              descuento
              ${serie ? ',serie' : ''}
              ${comentario ? ',comentario' : ''}
            )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
            ${serie ? ',?' : ''}
            ${comentario ? ',?' : ''}
          )
          `,
          values
        );


        this.io.sockets.emit(
          '/transacciones_ventas/data/insert',
          _ => this.readJoinId(result.insertId)
        )

        res(result)
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {Date | string | number} date
   * @returns {Promise<{
   *   id: number,
   *   usuario: string,
   *   nombre: string,
   *   codigo: string,
   *   importe_total: number,
   *   descuento: number,
   *   creacion: string
   * }[]>}
   */
  readDate(date) {
    return new Promise(async (res, rej) => {
      try {
        date = date instanceof Date
          ? date
          : new Date(date);

        let [result] = await this.main.model.pool(`
          SELECT
            u.usuario,
            mp.nombre,
            tv.id,
            tv.codigo,
            tv.importe_total,
            tv.descuento,
            tv.creacion
          FROM
            tb_transacciones_ventas AS tv
          INNER
            JOIN tb_usuarios AS u
              ON
                tv.usuario_id = u.id
          INNER
            JOIN tipo_metodo_pago AS mp
              ON
                tv.metodo_pago_id = mp.id
          WHERE
            DATE(tv.creacion) = ?;
        `, [
          this.main.time.format('YYYY-MM-DD', date)
        ])

        res(result)
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {number} id
   * @param {COLUMNS_TRANSACCIONES_VENTAS} data
   * @returns {Promise<import('mysql').OkPacket>}
   */
  updateId(id, data) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('id', id);

        let {
          usuario_id,
          importe_total,
          metodo_pago_id
        } = data;

        this.constraint('usuario_id', usuario_id);
        this.constraint('importe_total', importe_total);
        this.constraint('metodo_pago_id', metodo_pago_id);

        let dataEmitBefore = await this.readJoinId(id);

        let [result] = await this.main.model.pool(`
          UPDATE
            tb_transacciones_ventas
          SET
            usuario_id = ?,
            importe_total = ?,
            metodo_pago_id = ?
          WHERE
            id = ?;
        `, [
          usuario_id,
          importe_total,
          metodo_pago_id,
          id
        ]);

        let dataEmitAfter = await this.readJoinId(id);

        this.io.sockets.emit(
          '/transacciones_ventas/data/updateId',
          dataEmitAfter
        )

        if (dataEmitBefore.usuario_id == dataEmitAfter.usuario_id) {
          this.main.model.tb_ventas.io.tagsName.get(`usr:${dataEmitBefore.usuario_id}`)?.emit(
            '/transacciones_ventas/data/deleteId',
            {
              before: dataEmitBefore,
              after: dataEmitAfter,
              usuario_id: dataEmitBefore.usuario_id
            }
          )
          this.main.model.tb_ventas.io.tagsName.get(`usr:${dataEmitAfter.usuario_id}`)?.emit(
            '/transacciones_ventas/data/updateId',
            dataEmitAfter
          )
        }

        res(result)
      } catch (e) {
        rej(e)
      }
    })
  }
  /**
   * @param {number} id
   * @returns {Promise<import('mysql').OkPacket>}
   */
  deleteId(id) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('id', id);

        await this.main.model.pool(`
          UPDATE
            tb_productos p
          JOIN
            tb_ventas v
          ON
            p.id = v.producto_id
          SET
            p.stock_disponible = p.stock_disponible + v.cantidad
          WHERE v.transaccion_id = ?;
        `, [
          id
        ]);

        await this.main.model.pool(`
          DELETE FROM
            tb_ventas
          WHERE
            transaccion_id = ?
        `, [
          id
        ]);

        let [result] = await this.main.model.pool(`
          DELETE FROM
            tb_transacciones_ventas
          WHERE
            id = ?
       `, [
          id
        ]);

        this.io.sockets.emit(
          '/transacciones_ventas/data/deleteId',
          { id }
        )

        this.main.model.tb_ventas.io.sockets.emit(
          '/transacciones_ventas/data/deleteId',
          { id }
        )

        res(result)
      } catch (e) {
        rej(e)
      }
    })
  }
  /**
   * @returns {Promise<{
   *   id: number,
   *   usuario_id: number,
   *   usuario: string,
   *   metodo_pago_id: number,
   *   metodo_pago_nombre: string,
   *   codigo: string,
   *   importe_total: number,
   *   descuento: number,
   *   creacion: string
   * }>}
   */
  readJoinId(id) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('id', id);

        let [result] = await this.main.model.pool(`
          SELECT
            tv.id,
            tv.usuario_id,
            u.usuario,
            tv.cliente_id,
            c.nombres AS cliente_nombres,
            tv.metodo_pago_id,
            mp.nombre AS metodo_pago_nombre,
            tv.codigo,
            tv.importe_total,
            tv.descuento,
            tv.creacion
          FROM
            tb_transacciones_ventas AS tv
          INNER
            JOIN tb_clientes AS c
              ON
                tv.cliente_id = c.id
          INNER
            JOIN tb_usuarios AS u
              ON
                tv.usuario_id = u.id
          INNER
            JOIN tipo_metodo_pago AS mp
              ON
                tv.metodo_pago_id = mp.id
          WHERE
            tv.id = ?
        `, [
          id
        ]);

        res(result[0]);
      } catch (e) {
        rej(e);
      }
    })
  }
  /*
    ====================================================================================================
    ============================================== codigo ==============================================
    ====================================================================================================
  */
  /**
   * @returns {Promise<string>}
   */
  getCodigo() {
    return new Promise(async (res, rej) => {
      try {
        let existKey = 1, uniqueKey = '';

        while (existKey) {
          uniqueKey = this.id.generate();

          let [result] = await this.main.model.pool(`
            SELECT
              1
            FROM
              tb_categorias
            WHERE
              codigo = ?
          `, [
            uniqueKey
          ])

          existKey = result[0] ? 1 : 0;
        }

        res(uniqueKey)
      } catch (e) {
        rej(e);
      }
    })
  }
  /*
    ====================================================================================================
    ============================================== process ==============================================
    ====================================================================================================
  */
  /**
   * @param {number} id
   * @returns {Promise<{
   *   descuento: number
   * }>}
   */
  refreshId(id) {
    return new Promise(async (res, rej) => {
      try {
        let transaccion = await this.readIdAll(id);
        if (!transaccion) return;

        let asyncVentas = this.main.model.tb_ventas.readBusinessId(id);
        let asyncMetodoTransaccion = this.main.model.tipo_metodo_pago.readId(transaccion.metodo_pago_id);

        let ventas = await asyncVentas;
        let { igv } = await asyncMetodoTransaccion;

        /* ========== CONTROLADORES ========== */

        /** @type {Set<number>} */
        let setProdutoId = new Set();
        /** @type {Map<number, {id: number,producto_id: number,cantidad: number,descuento: number,importe: number}[]>} */
        let mapProductos = new Map;
        /** @type {number[]} */
        let dltVentaId = [];

        /* ========== CALCULADOR ========== */

        let totalVentaReal = 0;

        let ventasFilter = ventas.filter(venta => {
          totalVentaReal += venta.importe;

          let has = setProdutoId.has(venta.producto_id);

          if (!has) {
            setProdutoId.add(venta.producto_id);
            return true;
          }

          if (mapProductos.has(venta.producto_id))
            mapProductos.get(venta.producto_id).push(venta);
          else
            mapProductos.set(venta.producto_id, [venta]);

          dltVentaId.push(venta.id);
          return false;
        })

        let importeReal = totalVentaReal + (totalVentaReal * igv);
        let descuento = importeReal - transaccion.importe_total;
        let descuentoUnitario = descuento / ventas.length;

        ventasFilter.forEach(ventaFilter => {
          mapProductos.get(ventaFilter.producto_id)?.forEach(ventaDuplicate => {
            ventaFilter.importe += ventaDuplicate.importe;
            ventaFilter.cantidad += ventaDuplicate.cantidad;
          })
        })

        let [r1] = await this.main.model.pool(`
          UPDATE
            tb_transacciones_ventas
          SET
            descuento = ?
          WHERE
            id = ?;
        `, [
          descuento,
          id
        ]);

        if (r1.affectedRows) {
          if (dltVentaId.length)
            this.main.model.pool(`
            DELETE FROM
              tb_ventas
            WHERE
              id IN (${dltVentaId.join(',')})
          `)

          ventasFilter.forEach(ventaUpdate => {
            this.main.model.pool(`
            UPDATE
              tb_ventas
            SET
              cantidad = ?,
              importe = ?,
              descuento = ?
            WHERE
              id = ?;
          `, [
              ventaUpdate.cantidad,
              ventaUpdate.importe,
              descuentoUnitario,
              ventaUpdate.id
            ])
          })
        }
        this.io.sockets.emit(
          '/transacciones_ventas/data/refreshId',
          { id, descuento }
        )

        res({ descuento })
      } catch (e) {
        rej(e)
      }
    })
  }
  /**
   * @param {{producto_id:number, cantidad:number}[]} productos
   * @param {number} metodo_pago_id
   * @param {number} importe_total
   * @returns {Promise<{
   *   codigo: string,
   *   descuento: number,
   *   importe_total: number,
   *   totalVentaReal: number,
   *   totalCompraReal: number,
   *   descuentoUnitario: number,
   *   listVentas: {
   *     producto_id: number,
   *     cantidad: number,
   *     descuento: number,
   *     importe: number
   *   }[]
   * }>}
   */
  computedBusiness(productos, metodo_pago_id, importe_total) {
    return new Promise(async (res, rej) => {
      try {
        if (productos?.constructor.name != 'Array') return;
        if (!productos.length) return;

        let { igv } = await this.main.model.tipo_metodo_pago.readId(metodo_pago_id);

        let totalVentaReal = 0;

        let precios = productos.map(p => {
          let producto_id = p.producto_id = Number(p.producto_id);
          return this.main.model.tb_productos.readPriceId(producto_id);
        })

        for (let index in productos) {
          let producto = productos[index];
          let { venta } = await precios[index];

          let importe = producto.importe = producto.cantidad * venta;

          totalVentaReal += importe;
        }

        let importeReal = totalVentaReal + (totalVentaReal * igv);

        let descuento = importeReal - importe_total;

        let descuentoUnitario = descuento / productos.length;

        productos.forEach(d => d.descuento = descuentoUnitario);

        let codigo = await this.getCodigo();

        res({
          codigo,
          descuento,
          importe_total: importeReal,
          totalVentaReal,
          descuentoUnitario,
          listVentas: productos,
        })
      } catch (e) {
        rej(e);
      }
    })
  }
}