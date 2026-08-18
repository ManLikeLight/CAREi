import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import authRouter from "./auth";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(authRouter);
router.use(messagesRouter);

export default router;
