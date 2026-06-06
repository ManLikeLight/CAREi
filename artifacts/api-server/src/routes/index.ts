import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(authRouter);

export default router;
