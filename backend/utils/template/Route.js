/** @typedef {import('../../Structure').Structure} Structure */
/** @typedef {import('../../utils/SocketNode')} SocketNode */
/** @typedef {(this: Structure, req: import('express').Request, res: import('express').Response, next?: import('express').NextFunction) => void} routeFun */
/** @typedef {{last?:boolean, tagsName?:boolean, collector?:boolean}} OptionNode */

export class Route {
  /** @type {routeFun[]} */
  get = [];
  /** @type {routeFun[]} */
  post = [];
  /** @type {routeFun[]} */
  use = [];
  constructor(name = '', load = true) {
    this.name = name;
    this.load = load;
  }

  /** @param {Structure} app  */
  bind(app) {
    this.get = this.get.map(r => r.bind(app));
    this.post = this.post.map(r => r.bind(app));
    this.use = this.use.map(r => r.bind(app));

    if (typeof this.node == 'function')
      this.node = this.node.bind(app);
  }

  /** @param {...routeFun} fun  */
  getAdd(...fun) {
    this.get.push(...fun);
    return this;
  }

  /** @param {...routeFun} fun  */
  postAdd(...fun) {
    this.post.push(...fun);
    return this;
  }

  /** @param {...routeFun} fun  */
  useAdd(...fun) {
    this.use.push(...fun);
    return this;
  }

  /** @param {OptionNode | (this: Structure, node: SocketNode)=>void} node */
  socket(node) {
    this.node = node
    return this;
  }
}