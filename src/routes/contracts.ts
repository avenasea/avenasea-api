import { Router } from "../deps.ts";
import controller from "../controllers/contracts.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({
  prefix: "/api/1/contracts",
});

router.get("/", validateJWT, controller.getMyContracts.bind(controller));
router.post("/", validateJWT, controller.create.bind(controller));
router.get(
  "/:contractID",
  validateJWT,
  controller.getContractById.bind(controller)
);
router.get(
  "/:contractID/fields/:fieldName",
  validateJWT,
  controller.getFieldByName.bind(controller)
);
router.post(
  "/:contractID/fields/:fieldName/hidden/:type",
  validateJWT,
  controller.hideOrUnhideField.bind(controller)
);
router.post(
  "/:contractID/update-field",
  validateJWT,
  controller.updateField.bind(controller)
);
router.post(
  "/:contractID/comments",
  validateJWT,
  controller.createComment.bind(controller)
);
router.post(
  "/:contractID/approve-field",
  validateJWT,
  controller.approveField.bind(controller)
);
router.post(
  "/:contractID/add-party",
  validateJWT,
  controller.addParty.bind(controller)
);

export default router;
