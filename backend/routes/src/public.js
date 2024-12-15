import { Route } from '../../utils/template/Route.js';
import express from 'express';
import { resolve } from 'path';

let route = new Route('/src/public')
  .useAdd(
    express.static(resolve('src', 'public'))
  )

export { route }