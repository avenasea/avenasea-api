import { Router } from "../deps.ts";
import controller from "../controllers/users.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/me", validateJWT, controller.getMe.bind(controller))
  .post("/login", controller.login.bind(controller))
  .post("/register", controller.register.bind(controller));

export default router;
