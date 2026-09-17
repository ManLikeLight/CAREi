import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, generatedDocuments } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  ConfirmDocumentBody,
  GenerateDocumentBody,
  GenerateDocumentResponse,
  ListDocumentsQueryParams,
  ListDocumentsResponse,
  ListDocumentsResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  incident_report:
    "Prepare a factual incident report with headings Incident summary, Immediate actions, People notified, and Follow-up. Do not make medical or legal findings.",
  care_assessment_summary:
    "Prepare a concise care assessment summary with headings Person and preferences, Current needs, Risks and safeguards, and Review points. Do not diagnose or prescribe.",
  general_letter:
    "Prepare a professional general letter with headings Subject, Main message, and Next steps. Do not claim that actions were taken unless supplied.",
};

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object returned");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function reqLog(req: unknown) {
  return (req as { log?: { warn?: Function; error?: Function } }).log;
}

router.post("/documents/generate", async (req, res): Promise<void> => {
  const parsed = GenerateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    reqLog(req)?.warn?.({ errors: parsed.error.message }, "Invalid document draft request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { templateType, freeText, structuredDetails, identity, client } = parsed.data;
  const prompt = `You are CAREi's document drafting assistant for UK domiciliary care.
This is a DRAFT for human review only, not clinical advice, a legal finding, or a record that has been saved.
${TEMPLATE_INSTRUCTIONS[templateType]}
Use only the supplied source material. Never invent, infer, estimate, or alter facts. If information is absent, write "Not provided".
Return JSON only with exactly: {"documentType":"${templateType}","title":"string","sections":[{"heading":"string","content":"string"}]}.
Keep sections concise, factual, professional, and directly editable. Do not include markdown fences.

TEMPLATE: ${templateType}
AUTHOR ROLE: ${identity.userRole}
CLIENT: ${client ? `${client.name} (${client.id})` : "Not provided"}
FREE TEXT:
<free_text>${freeText}</free_text>
STRUCTURED DETAILS:
<structured_details>${JSON.stringify(structuredDetails)}</structured_details>`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    const raw = block?.type === "text" ? block.text : "";
    const draft = GenerateDocumentResponse.parse(extractJson(raw));
    res.json(draft);
  } catch (error) {
    reqLog(req)?.error?.({ error }, "Document draft generation failed");
    res.status(502).json({
      error: "The document draft could not be generated. No document was saved.",
    });
  }
});

router.post("/documents/confirm", async (req, res): Promise<void> => {
  const parsed = ConfirmDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    reqLog(req)?.warn?.({ errors: parsed.error.message }, "Invalid document confirmation");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentType, title, sections, sourceDetails, identity, client } = parsed.data;
  const [row] = await db
    .insert(generatedDocuments)
    .values({
      documentType,
      title,
      content: { sections },
      status: "confirmed",
      userName: identity.userName,
      userEmail: identity.userEmail,
      userRole: identity.userRole,
      clientId: client?.id,
      clientName: client?.name,
      sourceDetails,
      confirmedAt: new Date(),
    })
    .returning();

  if (!row) {
    res.status(500).json({ error: "The confirmed document was not created" });
    return;
  }

  res.status(201).json(
    ListDocumentsResponseItem.parse({
      ...row,
      sections,
    }),
  );
});

router.get("/documents", async (req, res): Promise<void> => {
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const filters = [];
  if (parsed.data.userEmail) filters.push(eq(generatedDocuments.userEmail, parsed.data.userEmail));
  if (parsed.data.clientId) filters.push(eq(generatedDocuments.clientId, parsed.data.clientId));
  const rows = await db
    .select()
    .from(generatedDocuments)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(generatedDocuments.createdAt));
  const result = ListDocumentsResponse.parse(
    rows.map((row) => ({
      ...row,
      sections:
        typeof row.content === "object" &&
        row.content !== null &&
        "sections" in row.content &&
        Array.isArray(row.content.sections)
          ? row.content.sections
          : [],
    })),
  );
  res.json(result);
});

export default router;