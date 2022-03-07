import { Router } from "../deps.ts";
import controller from "../controllers/affiliates.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/affiliates", validateJWT, controller.getAll.bind(controller))
  .get("/affiliates/:id", validateJWT, controller.getOne.bind(controller))
  .put("/affiliates/:id", validateJWT, controller.update.bind(controller))
  .post("/affiliates", validateJWT, controller.post.bind(controller))
  .delete("/affiliates/:id", validateJWT, controller.delete.bind(controller));

export default router;
