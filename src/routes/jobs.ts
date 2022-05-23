import { Router } from "../deps.ts";
import controller from "../controllers/jobs.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/jobs", controller.getAll.bind(controller))
  .get("/jobs/me", validateJWT, controller.getMyJobs.bind(controller))
  .get("/jobs/:id", controller.getOne.bind(controller))
  .put("/jobs/:id", validateJWT, controller.update.bind(controller))
  .get("/jobs/tags/:tag", controller.getByTag.bind(controller))
  .get("/jobs/users/:username", controller.getByUsername.bind(controller))
  .post("/jobs", validateJWT, controller.post.bind(controller))
  .delete("/jobs/:id", validateJWT, controller.delete.bind(controller));

export default router;
