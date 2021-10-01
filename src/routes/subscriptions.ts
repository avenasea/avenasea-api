import { Router } from "https://deno.land/x/oak/mod.ts";
import controller from "../controllers/subscriptions.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/subscriptions", controller.getAll.bind(controller))
  .post("/subscriptions", controller.post.bind(controller))
  .delete("/subscriptions/:id", controller.delete.bind(controller));

export default router;
