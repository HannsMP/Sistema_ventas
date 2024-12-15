import { Route } from '../../../utils/template/Route.js';

let route = new Route('/auth/logout')
  .getAdd(
    function (req, res, next) {
      let apiKey = req.cookies?.apiKey;
      if (apiKey) {
        this.cache.apiKey.delete(apiKey);
        res.clearCookie('apiKey');
        res.clearCookie('remember');

        this.nodeControl.allTagsName.get(`api:${apiKey}`)?.emit('/session/usuario/logout');
      }
      res.status(200).redirect('/auth/login');
    }
  )

export { route }