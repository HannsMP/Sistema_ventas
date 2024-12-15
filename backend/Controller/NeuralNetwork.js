import { Precio_venta } from '../service/Precio_Venta.js';

export class NeuralNetwork {
  /** @param {import('../Structure.js').Structure} main  */
  constructor(main) {
    this.main = main;
    this.precio_venta = new Precio_venta(main);
  }
}