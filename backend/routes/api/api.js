import { Route } from "../../utils/template/Route.js";

let route = new Route('/api')
  .useAdd(
    function (req, res, next) {
      let { apiKey } = req.cookies;

      let existApikey = this.cache.apiKey.exist(apiKey);

      if (existApikey)
        return next();

      res.status(401).json({ autorization: 'acceso denegado' });
    }
  )
// .postAdd(
//   async function (req, res, next) {
//     try {
//       let { query, values } = req.body

//       let [result] = values
//         ? await this.model.pool(query, values)
//         : await this.model.pool(query);

//       res.status(200).json({
//         result: result
//       })
//     } catch (e) {
//       res.status(200).json({
//         error: e
//       })
//     }
//   }
// )

export { route }