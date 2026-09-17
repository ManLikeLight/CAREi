import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, medicationConfirmationRecords, visitRecords } from "@workspace/db";
import { GetComplianceDashboardResponse } from "@workspace/api-zod";
import { verifyAssistantSession } from "../assistant-session";
import { evaluateComplianceDashboard } from "../compliance-rules";

const router: IRouter = Router();
router.get("/compliance/dashboard", async (req, res): Promise<void> => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim() : "";
  const session = verifyAssistantSession(token);
  if (!session) { res.status(401).json({ error: "A valid bearer token is required." }); return; }
  if (session.role !== "manager") { res.status(403).json({ error: "A manager session is required." }); return; }
  const visits = await db.select().from(visitRecords).where(eq(visitRecords.agency, session.agency));
  const medications = await db.select().from(medicationConfirmationRecords).where(eq(medicationConfirmationRecords.agency, session.agency));
  const result = evaluateComplianceDashboard({ visits, medications });
  res.json(GetComplianceDashboardResponse.parse({
    ...result,
    generatedAt: new Date().toISOString(),
    agency: session.agency,
    dataFreshness: "live",
  }));
});
export default router;