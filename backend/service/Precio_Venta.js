import { resolve } from 'path';
import NeuralNetwork from '../utils/lib/brain.js';
import { FileJSON } from '../utils/FileJSON.js';

/** @typedef {{min_compra:number, max_compra:number, min_venta:number, max_venta:number}} Limits  */
/** @typedef {{iterations:number, time:number, error:Number}} TrainResult  */

export class Precio_venta {
  optionNeural = { hiddenLayers: [10, 10] };

  /** @type {FileJSON<{netJson:{}, trainResult:TrainResult, create:number, limit:Limits }>} */
  fileJSON = new FileJSON(resolve('.cache', 'brain', 'precio_venta.json'), true);

  /** @param {import('../Structure.js').Structure} main  */
  constructor(main) {
    this.main = main;

    this.io = main.socket.node.selectNode('/control/servidor/cerebro');

    let { create, netJson, limit, optionNeural = this.optionNeural } = this.fileJSON.readJSON();

    this.neural = new NeuralNetwork(optionNeural);

    // si pasaron mas de 6 horas desde el ultimo guardado, refresca el cache.
    if (!create)
      this.chargeTrain = this.refresh();
    // sino pasaron mas de 6 horas, carga el cache guardado.
    else {
      this.neural.fromJSON(netJson);
      this.limit = limit;
    };
  }
  /** @param {number} value  */
  normalizeBuys(value) {
    return (value - this.limit.min_compra) / (this.limit.max_compra - this.limit.min_compra);
  }
  /** @param {number} value  */
  denormalizeBuys(value) {
    return value * (this.limit.max_compra - this.limit.min_compra) + this.limit.min_compra;
  }
  /** @param {number} value  */
  normalizeSale(value) {
    return (value - this.limit.min_venta) / (this.limit.max_venta - this.limit.min_venta);
  }
  /** @param {number} value  */
  denormalizeSale(value) {
    return value * (this.limit.max_venta - this.limit.min_venta) + this.limit.min_venta;
  }
  async refresh(iterations, errorThresh) {
    if (!this.main.model.estado && !await this.main.model._run()) return;

    let [limitsResult] = await this.main.model.pool(`
      SELECT
        MIN(c.compra) AS min_compra,
        MAX(c.compra) AS max_compra,
        MIN(p.venta) AS min_venta,
        MAX(p.venta) AS max_venta
      FROM
        tb_productos AS p
      RIGHT
      	JOIN
        	tb_compras AS c
        ON
        	c.producto_id = p.id
      WHERE
        p.estado = 1;
    `)

    this.limit = limitsResult[0];

    let [data] = await this.main.model.pool(`
      SELECT
        ((c.compra - sub.min_compra) / (sub.max_compra - sub.min_compra)) AS input,
        ((p.venta - sub.min_venta) / (sub.max_venta - sub.min_venta)) AS output
      FROM
        tb_productos p
      INNER JOIN
        (
          SELECT
            c.producto_id,
            c.compra,
            t.creacion
          FROM
            tb_compras c
          INNER JOIN
            tb_transacciones_compras t
          ON
            c.transaccion_id = t.id
          WHERE
            t.creacion = (
              SELECT MAX(t2.creacion)
              FROM tb_compras c2
              INNER JOIN tb_transacciones_compras t2 ON c2.transaccion_id = t2.id
              WHERE c2.producto_id = c.producto_id
            )
        ) c ON c.producto_id = p.id
      INNER JOIN
        (
          SELECT
            MIN(c.compra) AS min_compra,
            MAX(c.compra) AS max_compra,
            MIN(p.venta) AS min_venta,
            MAX(p.venta) AS max_venta
          FROM
            tb_productos p
          INNER JOIN
            tb_compras c
          ON
            c.producto_id = p.id
          WHERE
            p.estado = 1 AND c.compra IS NOT NULL
        ) sub ON c.producto_id = p.id
      WHERE
        p.estado = 1 AND c.compra IS NOT NULL;
    `)

    data.forEach(d => {
      d.input = [d.input];
      d.output = [d.output];
    })

    iterations ??= 25000;
    errorThresh ??= 0.005;

    let trainResult = this.neural.train(data, { iterations, errorThresh });

    let netJson = this.neural.toJSON();

    let size = data.length;
    let limit = limitsResult[0];
    let create = Date.now();

    let json = { netJson, trainResult, create, size, limit, iterations, errorThresh, optionNeural: this.optionNeural };
    this.fileJSON.writeJSON(json);
    this.io.sockets.emit('/cerebro/data/precioVenta', {
      data: json,
      optionNeural: this.optionNeural,
      prediccion: this.toFunction.toString()
    });
  }
  /**
   * @param {number} price
   * @returns {Promise<Number>}
   */
  predict(price) {
    return new Promise(async (res, rej) => {
      try {
        await this.chargeTrain;
        let normalizedInput = this.normalizeBuys(price);
        let [normalizedOutput] = this.neural.run([normalizedInput]);
        let result = this.denormalizeSale(normalizedOutput);
        res(result);
      } catch (e) {
        rej(e);
      }
    })
  }
  /** @returns {(input:number)=>number} */
  get toFunction() {
    let funNet = this.neural.toFunction().toString();
    return new Function('input', `if(input < ${this.limit.min_compra}) return ${this.limit.min_venta}; if(${this.limit.max_compra} < input) return ${this.limit.max_venta}; return ((${funNet}([(input - ${this.limit.min_compra}) / (${this.limit.max_compra} - ${this.limit.min_compra})])[0]) * (${this.limit.max_venta} - ${this.limit.min_venta})) + ${this.limit.min_venta};`)
  }
}