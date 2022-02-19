import { Router } from "https://deno.land/x/oak@/mod.ts";
import controller from "../controllers/stats.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/stats", controller.stats.bind(controller));

export default router;
