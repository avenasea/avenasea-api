import { Router } from "../deps.ts";
import controller from "../controllers/searches.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/searches", validateJWT, controller.getAll.bind(controller))
  .get(
    "/candidates/:id",
    validateJWT,
    controller.getCandidates.bind(controller)
  )
  .get("/searches/history", controller.getAllHistory.bind(controller))
  .get("/searches/:id", controller.getOne.bind(controller))
  .put("/searches/:id", validateJWT, controller.update.bind(controller))
  .get("/searches/tags/:tag", controller.getByTag.bind(controller))
  .get("/searches/users/:username", controller.getByUsername.bind(controller))
  .post("/searches", validateJWT, controller.post.bind(controller))
  .delete("/searches/:id", validateJWT, controller.delete.bind(controller));

export default router;
