import { Router } from "https://deno.land/x/oak/mod.ts";
import controller from "../controllers/users.ts";
import { jwtAuth } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/me", jwtAuth, controller.getMe.bind(controller))
  .post("/login", controller.login.bind(controller))
  .post("/register", controller.register.bind(controller));

export default router;
