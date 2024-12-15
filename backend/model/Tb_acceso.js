import { Table } from '../utils/template/Table.js';

const name = 'tb_acceso';
const columns = {
  id: { name: 'id', null: false, type: 'Integer', limit: 11 },
  menu_id: { name: 'menu_id', null: false, type: 'Integer', limit: 11 },
  rol_id: { name: 'rol_id', null: false, type: 'Integer', limit: 11 },
  permiso_id: { name: 'permiso_id', null: false, type: 'Integer', limit: 11 },
  disabled_id: { name: 'disabled_id', null: false, type: 'Integer', limit: 11 }
}

/**
 * @typedef {{
 *   id: number,
 *   menu_id: number,
 *   rol_id: number,
 *   permiso_id: number,
 *   disabled_id: number
 * }} COLUMNS_ACCESOS
 */

/** @extends {Table<COLUMNS_ACCESOS>} */
export class Tb_acceso extends Table {
  /** @param {import('../Structure').Structure} main */
  constructor(main) {
    super(name,);
    this.columns = columns;
    this.main = main;

    this.io = main.socket.node.selectNode('/control/administracion/acceso', true);
  }
  /*
    ====================================================================================================
    =============================================== Tabla ===============================================
    ====================================================================================================
  */
  /**
   * @param {{
   *   menu_id: number,
   *   rol_id: number,
   *   disabled_id: number,
   *   permiso_ver: number,
   *   permiso_agregar: number,
   *   permiso_editar: number,
   *   permiso_eliminar: number,
   *   permiso_ocultar: number,
   *   permiso_exportar: number
   * }} data
   * @returns {Promise<import('mysql').OkPacket>}
   */
  insert(data) {
    return new Promise(async (res, rej) => {
      try {
        let {
          menu_id,
          rol_id,
          disabled_id,
          permiso_ver,
          permiso_agregar,
          permiso_editar,
          permiso_eliminar,
          permiso_ocultar,
          permiso_exportar,
        } = data;

        this.constraint('menu_id', menu_id);
        this.constraint('rol_id', rol_id);
        this.constraint('disabled_id', disabled_id);

        let permiso_id = this.main.model.tb_permisos.computedPermisoId({
          ver: permiso_ver,
          agregar: permiso_agregar,
          editar: permiso_editar,
          eliminar: permiso_eliminar,
          ocultar: permiso_ocultar,
          exportar: permiso_exportar,
        });

        let [result] = await this.main.model.pool(`
          INSERT INTO
            tb_acceso (
              menu_id,
              rol_id,
              permiso_id,
              disabled_id
            )
          VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `, [
          menu_id,
          rol_id,
          permiso_id,
          disabled_id
        ]);

        res(result);
      } catch (e) {
        rej(e);
      }
    })
  }
  /**
   * @param {number} id
   * @param {{
   *   permiso_ver: number,
   *   permiso_agregar: number,
   *   permiso_editar: number,
   *   permiso_eliminar: number,
   *   permiso_ocultar: number,
   *   permiso_exportar: number
   * }} data
   * @returns {Promise<import('mysql').OkPacket>}
   */
  updateIdState(id, data) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('id', id);

        let permiso_id = this.main.model.tb_permisos.computedPermisoId({
          ver: data.permiso_ver,
          agregar: data.permiso_agregar,
          editar: data.permiso_editar,
          eliminar: data.permiso_eliminar,
          ocultar: data.permiso_ocultar,
          exportar: data.permiso_exportar
        });

        let [result] = await this.main.model.pool(`
          UPDATE
            tb_acceso
          SET
            permiso_id = ?
          WHERE
            id = ?;
        `, [
          permiso_id,
          id
        ]);

        this.io.sockets.emit(
          '/accesos/permisos/state',
          {
            id,
            permiso_id,
            permiso_ver: data.permiso_ver,
            permiso_agregar: data.permiso_agregar,
            permiso_editar: data.permiso_editar,
            permiso_eliminar: data.permiso_eliminar,
            permiso_ocultar: data.permiso_ocultar,
            permiso_exportar: data.permiso_exportar
          }
        )

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
  deleteMenusId(id) {
    return new Promise(async (res, rej) => {
      try {
        this.constraint('id', id);

        let [result] = await this.main.model.pool(`
          DELETE FROM
            tb_acceso
          WHERE
            menu_id = ?
        `, [
          id
        ]);

        res(result)
      } catch (e) {
        rej(e)
      }
    })
  }
  /**
   * @returns {Promise<{
   *   id: number,
   *   rol_id: number,
   *   menu_id: number,
   *   rol_nombre: string,
   *   permiso_ver: number,
   *   permiso_agregar: number,
   *   permiso_editar: number,
   *   permiso_eliminar: number,
   *   permiso_ocultar: number,
   *   permiso_exportar: number
   * }[]>}
   */
  readJoinMenuId(menu_id) {
    return new Promise(async (res, rej) => {
      try {
        this.main.model.tb_menus.constraint('id', menu_id);

        let [result] = await this.main.model.pool(`
          SELECT
            a.id,
            a.rol_id,
            a.menu_id,
            r.nombre AS rol_nombre,
            a.permiso_id,
            CASE
              WHEN d.ver = 1 THEN -1
              ELSE p.ver
            END AS permiso_ver,
            CASE
              WHEN d.agregar = 1 THEN -1
              ELSE p.agregar
            END AS permiso_agregar,
            CASE
              WHEN d.editar = 1 THEN -1
              ELSE p.editar
            END AS permiso_editar,
            CASE
              WHEN d.eliminar = 1 THEN -1
              ELSE p.eliminar
            END AS permiso_eliminar,
            CASE
              WHEN d.ocultar = 1 THEN -1
              ELSE p.ocultar
            END AS permiso_ocultar,
            CASE
              WHEN d.exportar = 1 THEN -1
              ELSE p.exportar
            END AS permiso_exportar
          FROM
            tb_acceso AS a
          INNER
            JOIN
              tipo_rol AS r
            ON
              r.id = a.rol_id
          INNER
            JOIN
              tb_permisos AS p
            ON
              p.id = a.permiso_id
          INNER
            JOIN
              tb_permisos AS d
            ON
              d.id = a.disabled_id
          WHERE
            menu_id = ?
        `, [
          menu_id
        ]);

        res(result)
      } catch (e) {
        rej(e)
      }
    })
  }
  /*
    ====================================================================================================
    ============================================== Cards ==============================================
    ====================================================================================================
  */
  /**
   * @returns {Promise<string>}
   */
  cardCount() {
    return new Promise(async (res, rej) => {
      try {
        let [result] = await this.main.model.pool(`
            SELECT
              COALESCE(COUNT(id), 0) AS cantidad_accesos
            FROM
              tb_acceso
          `)

        res(result[0].cantidad_accesos);
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
   * @returns {Promise<COLUMNS_ACCESOS[]>}
   */
  chartCountPermits() {
    return new Promise(async (res, rej) => {
      try {
        let [result] = await this.main.model.pool(`
            SELECT
              SUM(p.ver) AS ver,
              SUM(p.agregar) AS agregar,
              SUM(p.editar) AS editar,
              SUM(p.eliminar) AS eliminar,
              SUM(p.ocultar) AS ocultar,
              SUM(p.exportar) AS exportar
            FROM
              tb_acceso a
            JOIN
              tb_permisos p
              ON
                a.permiso_id = p.id;
          `)


        let { ver, agregar, editar, eliminar, ocultar, exportar } = result[0];

        let label = ['ver', 'agregar', 'editar', 'eliminar', 'ocultar', 'exportar'];
        let data = [ver, agregar, editar, eliminar, ocultar, exportar];

        res({ label, data });
      } catch (e) {
        rej(e);
      }
    })
  }
}