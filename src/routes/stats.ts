import { Router } from "../deps.ts";
import controller from "../controllers/stats.ts";

const router = new Router({ prefix: "/api/1" });

router
  .get("/stats", controller.stats.bind(controller))
  .get("/tags", controller.tags.bind(controller))
  .get("/tags/jobs", controller.jobTags.bind(controller))
  .get("/tags/history", controller.historyTags.bind(controller));

export default router;
