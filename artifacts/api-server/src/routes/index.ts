import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import authRouter from "./auth";
import messagesRouter from "./messages";
import carePlansRouter from "./care-plans";
import careAssistantRouter from "./care-assistant";
import documentsRouter from "./documents";
import careRecordsRouter from "./care-records";
import reportsRouter from "./reports";
import familyUpdatesRouter from "./family-updates";
import complianceRouter from "./compliance";
import closeToHomeRouter from "./close-to-home";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(authRouter);
router.use(messagesRouter);
router.use(carePlansRouter);
router.use(careAssistantRouter);
router.use(documentsRouter);
router.use(careRecordsRouter);
router.use(reportsRouter);
router.use(familyUpdatesRouter);
router.use(complianceRouter);
router.use(closeToHomeRouter);

export default router;
