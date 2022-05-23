import { Router } from "../deps.ts";
import controller from "../controllers/payments.ts";
import { validateJWT } from "../middleware/jwt.ts";

const router = new Router({ prefix: "/api/1/payments" });

router.post(
  "/create-subscription",
  validateJWT,
  controller.createSubscription.bind(controller)
);
router.post(
  "/cancel-subscription",
  validateJWT,
  controller.cancelSubscription.bind(controller)
);
router.post("/webhook", controller.webhook.bind(controller));
router.post(
  "/coinpayments-webhook",
  controller.coinpaymentsWebhook.bind(controller)
);

export default router;
