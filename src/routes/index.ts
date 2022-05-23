import { Router } from "../deps.ts";
import controller from "../controllers/index.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/", controller.index.bind(controller));

export default router;
