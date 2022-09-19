import { Router } from "../deps.ts";
import controller from "../controllers/users.ts";
import { validateJWT, validateJWTOptionally } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get(
    "/users/:username",
    validateJWTOptionally,
    controller.getUsername.bind(controller)
  )
  .get("/users", validateJWT, controller.getAll.bind(controller))
  .get("/me", validateJWT, controller.getMe.bind(controller))
  .post("/login", controller.login.bind(controller))
  .post("/register", controller.register.bind(controller))
  .put("/me", validateJWT, controller.update.bind(controller))
  .post("/password/request-reset", controller.requestReset.bind(controller))
  .put("/password/reset", controller.passwordReset.bind(controller))
  .post("/newsletters", controller.newsletter.bind(controller))
  .delete("/newsletters/:id", controller.unsubscribeNewsletter.bind(controller))
  .get("/logout", controller.logout.bind(controller));
export default router;
