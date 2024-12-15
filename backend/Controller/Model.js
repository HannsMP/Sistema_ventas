import mysql from 'mysql2/promise';

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { exec } from 'child_process';

import { mergeObjects } from '../utils/function/merge.js';

import { Tb_usuarios } from '../model/Tb_usuarios.js';
import { Tb_fotos } from '../model/Tb_fotos.js';
import { Tb_acceso } from '../model/Tb_acceso.js';
import { Tb_permisos } from '../model/Tb_permisos.js';
import { Tb_menus } from '../model/Tb_menus.js';
import { Tb_asistencias } from '../model/Tb_asistencias.js';
import { Tb_categorias } from '../model/Tb_categorias.js';
import { Tb_productos } from '../model/Tb_productos.js';
import { Tb_clientes } from '../model/Tb_clientes.js';
import { Tb_ventas } from '../model/Tb_ventas.js';
import { Tb_transacciones_ventas } from '../model/Tb_transacciones_ventas.js';
import { Tb_proveedores } from '../model/Tb_proveedores.js';
import { Tb_compras } from '../model/Tb_compras.js';
import { Tb_transacciones_compras } from '../model/Tb_transacciones_compras.js';
import { Tb_Yapes } from '../model/Tb_Yapes.js';

import { Tipo_roles } from '../model/Tipo_roles.js';
import { Tipo_cliente } from '../model/Tipo_cliente.js';
import { Tipo_proveedor } from '../model/Tipo_proveedor.js';
import { Tipo_documento } from '../model/Tipo_documento.js';
import { Tipo_metodo_pago } from '../model/Tipo_metodo_pago.js';

import { DatabaseError } from '../utils/error/DataBase.js';
import { QueryError } from '../utils/error/Query.js';

let typeConverters = {
  TINY: Number,
  SHORT: Number,
  LONG: Number,
  LONGLONG: Number,
  INT24: Number,

  FLOAT: Number,
  DOUBLE: Number,
  NEWDECIMAL: (val) => (val === null ? null : parseFloat(val)),

  STRING: String,
  VAR_STRING: String,
  BLOB: String,

  DATE: (val) => (val === null ? null : new Date(val)),
  DATETIME: (val) => (val === null ? null : new Date(val)),
  TIMESTAMP: (val) => (val === null ? null : new Date(val)),
  TIME: String,
  YEAR: Number,

  BIT: (val) => (val === null ? null : val === '\0' ? 0 : 1),
  GEOMETRY: (val) => val
};

export class Model {
  mysql = mysql;
  estado = false;
  version = '1.0.0';

  /** @param {import('../Structure').Structure} main */
  constructor(main) {
    this.main = main;

    this._check();

    let cnfg = main.cache.configJSON.readJSON();

    this.poolQuery = mysql.createPool(
      mergeObjects({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'local',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        typeCast: (field, next) => {
          let value = field.string();
          if (value == null) return null;
          let converter = typeConverters[field.type];
          return converter ? converter(value) : next();
        },
      }, cnfg.DATABASE.production
      )
    );

    this.poolOwn = mysql.createPool(
      mergeObjects({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'local',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        typeCast: (field, next) => {
          let value = field.string();
          if (value == null) return null;
          let converter = typeConverters[field.type];
          return converter ? converter(value) : next();
        },
      }, cnfg.DATABASE.owner
      )
    );

    this.tb_usuarios = new Tb_usuarios(main);
    this.tb_fotos = new Tb_fotos(main);
    this.tb_permisos = new Tb_permisos(main);
    this.tb_menus = new Tb_menus(main);
    this.tb_acceso = new Tb_acceso(main);
    this.tb_asistencias = new Tb_asistencias(main);
    this.tb_categorias = new Tb_categorias(main);
    this.tb_productos = new Tb_productos(main);
    this.tb_clientes = new Tb_clientes(main);
    this.tb_ventas = new Tb_ventas(main);
    this.tb_transacciones_ventas = new Tb_transacciones_ventas(main);
    this.tb_proveedores = new Tb_proveedores(main);
    this.tb_compras = new Tb_compras(main);
    this.tb_transacciones_compras = new Tb_transacciones_compras(main);
    this.tb_Yapes = new Tb_Yapes(main);

    this.tipo_roles = new Tipo_roles(main);
    this.tipo_cliente = new Tipo_cliente(main);
    this.tipo_proveedor = new Tipo_proveedor(main);
    this.tipo_documento = new Tipo_documento(main);
    this.tipo_metodo_pago = new Tipo_metodo_pago(main);
  }

  async _check() {
    let cnfg = this.main.cache.configJSON.readJSON();
    let connection;

    try {
      connection = await mysql.createConnection({
        host: cnfg.DATABASE.owner.host,
        user: cnfg.DATABASE.owner.user,
        password: cnfg.DATABASE.owner.password
      });

      let [result] = await connection.query(`
          SELECT 
            schema_db.version AS version
          FROM 
            INFORMATION_SCHEMA.TABLES 
          LEFT 
            JOIN 
                ${cnfg.DATABASE.owner.database}.schema_db 
              ON 
                INFORMATION_SCHEMA.TABLES.TABLE_SCHEMA = '${cnfg.DATABASE.owner.database}'
          WHERE 
            INFORMATION_SCHEMA.TABLES.TABLE_SCHEMA = '${cnfg.DATABASE.owner.database}'
            AND INFORMATION_SCHEMA.TABLES.TABLE_NAME = 'schema_db'
        `)

      if (!result.length) {
        let sql_db = readFileSync(resolve('backend', 'sql', 'db.sql'), 'utf-8');
        await connection.beginTransaction();
        await connection.query(`
          CREATE DATABASE rehf
          CHARACTER SET utf8
          COLLATE utf8_general_ci;
        `);
        await connection.query(sql_db);
        await connection.commit();
      }
    } catch (e) {
      await connection?.rollback();
    } finally {
      connection?.end();
    }
  }

  async _run() {
    try {
      await this.pool(`SELECT 1`);
      this.estado = true;
      this.main.logSuccess.writeStart(`[Sql] Listo: http://localhost/phpmyadmin/`);
    } catch (e) {
      this.estado = false;
      this.main.logError.writeStart(`[Sql] Error: _run`, e.message, e.stack);
    }
    return this.estado;
  }

  /**
   * Ejecuta una consulta con valores opcionales usando una conexión del pool
   * @param {string} query
   * @param {Array<string|number>} [values]
   * @returns {Promise<[import('mysql2').QueryResult, import('mysql2').FieldPacket[]]>}
   */
  async pool(query, values) {
    try {
      let connection = await this.poolQuery.getConnection();
      let res = values
        ? await connection.query(query, values)
        : await connection.query(query);
      connection.release();
      return res;
    } catch (err) {
      if (err.code) throw new QueryError(err);
      throw new DatabaseError(err);
    }
  }

  connection() {
    return this.poolQuery.getConnection();
  }

  /**
   * @returns {Promise<string>}
   */
  backup() {
    return new Promise((res, rej) => {
      let { user, password, database } = this.app.cache.configJSON.readJSON().DATABASE.owner;
      let fileBackup = resolve('.backup', 'sql', Date.now() + '.sql');

      exec(
        `mysqldump -u ${user} -p${password} ${database} > ${fileBackup}`,
        (err, stdout, stderr) => {
          if (err) return rej(`Error al ejecutar el comando: ${err.message}`);
          if (stderr) return rej(`Error en la salida estándar: ${stderr}`);
          res(fileBackup);
        }
      );
    });
  }

  /**
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  restore(filePath) {
    return new Promise((resolve, reject) => {
      let { user, password, database } = this.app.cache.configJSON.readJSON().DATABASE.owner;

      exec(
        `mysql -u ${user} -p${password} ${database} < ${filePath}`,
        (err, stdout, stderr) => {
          if (err) return reject(`Error al ejecutar el comando: ${err.message}`);
          if (stderr) return reject(`Error en la salida estándar: ${stderr}`);
          resolve('Restauración completada.');
        }
      );
    });
  }
}