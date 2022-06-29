import { Router } from "../deps.ts";
import controller from "../controllers/contracts.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({
  prefix: "/api/1/contracts",
});

router.post("/", validateJWT, controller.create.bind(controller));
router.get("/:contractID", validateJWT, controller.getById.bind(controller));
router.post(
  "/:contractID/update-field",
  validateJWT,
  controller.updateField.bind(controller)
);

export default router;
