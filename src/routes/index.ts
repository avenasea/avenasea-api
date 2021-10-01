import { Router } from "https://deno.land/x/oak/mod.ts";
import controller from "../controllers/index.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/", controller.index.bind(controller));

export default router;
