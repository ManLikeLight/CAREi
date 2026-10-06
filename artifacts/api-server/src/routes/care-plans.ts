import { Router, type IRouter } from "express";
import { desc, eq, max, sql } from "drizzle-orm";
import { db, carePlanVersions } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  ConfirmCarePlanBody,
  ConfirmCarePlanParams,
  GenerateCarePlanBody,
  GenerateCarePlanResponse,
  GetCarePlanVersionsParams,
  GetCarePlanVersionsResponseItem,
} from "@workspace/api-zod";
import { requireSession } from "../auth-session";

const router: IRouter = Router();

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}

router.post("/care-plans/generate", requireSession, async (req, res): Promise<void> => {
  const parsed = GenerateCarePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { client, assessmentInput } = parsed.data;
  const prompt = `You are assisting a qualified UK domiciliary care planner.

Create a DRAFT care plan using only the assessment text and the client details supplied below. Do not invent diagnoses, medicines, risks, preferences, routines, or facts. When information is missing, use an empty suggestion rather than guessing.

Return JSON only, with exactly this structure:
{
  "personalDetailsAndPreferences": {
    "summary": { "suggestion": "string", "source": "exact short quote from assessment or null" }
  },
  "needs": {
    "personalCare": { "suggestion": "string", "source": "exact short quote from assessment or null" },
    "mobility": { "suggestion": "string", "source": "exact short quote from assessment or null" },
    "nutrition": { "suggestion": "string", "source": "exact short quote from assessment or null" },
    "medication": { "suggestion": "string", "source": "exact short quote from assessment or null" },
    "social": { "suggestion": "string", "source": "exact short quote from assessment or null" }
  },
  "identifiedRisks": [{ "suggestion": "string", "source": "exact short quote from assessment or null" }],
  "goalsAndDesiredOutcomes": [{ "suggestion": "string", "source": "exact short quote from assessment or null" }],
  "dailyRoutine": [{ "suggestion": "string", "source": "exact short quote from assessment or null" }],
  "notes": [{ "suggestion": "string", "source": "exact short quote from assessment or null" }]
}

Rules:
- Use professional, person-centred UK care language.
- Keep each suggestion concise and directly editable.
- Source must be an exact short quote from the assessment input wherever possible.
- Never use the client details as the source quote.
- Return at least one item in each array; use an empty suggestion and null source if the assessment gives no relevant information.
- This is a draft for human review, not clinical advice.

CLIENT
Name: ${client.name}
Age: ${client.age}
Address: ${client.address}

ASSESSMENT INPUT
${assessmentInput}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    const raw = block?.type === "text" ? block.text : "";
    const draft = GenerateCarePlanResponse.shape.draft.parse(extractJson(raw));
    res.json({ draft });
  } catch {
    res.status(502).json({
      error:
        "The care plan draft could not be generated. Your assessment has been kept so you can try again.",
    });
  }
});

router.get(
  "/care-plans/:clientId/versions",
  async (req, res): Promise<void> => {
    const params = GetCarePlanVersionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const rows = await db
      .select()
      .from(carePlanVersions)
      .where(eq(carePlanVersions.clientId, params.data.clientId))
      .orderBy(desc(carePlanVersions.version));

    res.json(rows.map((row) => GetCarePlanVersionsResponseItem.parse(row)));
  },
);

router.post(
  "/care-plans/:clientId/versions",
  requireSession,
  async (req, res): Promise<void> => {
    const params = ConfirmCarePlanParams.safeParse(req.params);
    const body = ConfirmCarePlanBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${params.data.clientId}))`,
      );
      const [current] = await tx
        .select({ version: max(carePlanVersions.version) })
        .from(carePlanVersions)
        .where(eq(carePlanVersions.clientId, params.data.clientId));
      const [row] = await tx
        .insert(carePlanVersions)
        .values({
          clientId: params.data.clientId,
          version: (current?.version ?? 0) + 1,
          assessmentInput: body.data.assessmentInput,
          plan: body.data.plan,
          confirmedBy: req.authenticatedCarer!.name,
        })
        .returning();
      return row;
    });

    res.status(201).json(GetCarePlanVersionsResponseItem.parse(created));
  },
);

export default router;