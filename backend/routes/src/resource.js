import { Route } from '../../utils/template/Route.js';
import express from 'express';
import { resolve } from 'path';

let route = new Route('/src/resource')
  .useAdd(
    express.static(resolve('src', 'resource')),
    function (req, res, next) {
      let { apiKey } = req.cookies;

      let existApikey = this.cache.apiKey.exist(apiKey);

      if (!existApikey)
        return res.status(401).json({ autorization: 'acceso denegado' });

      return next();
    }
  )

export { route }