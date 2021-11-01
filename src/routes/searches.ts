import { Router } from "https://deno.land/x/oak/mod.ts";
import controller from "../controllers/searches.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/searches", validateJWT, controller.getAll.bind(controller))
  .get("/searches/:id", validateJWT, controller.getOne.bind(controller))
  //.put("/searches/:id", validateJWT, controller.update.bind(controller))
  .post("/searches", validateJWT, controller.post.bind(controller))
  .delete("/searches/:id", validateJWT, controller.delete.bind(controller));

export default router;
