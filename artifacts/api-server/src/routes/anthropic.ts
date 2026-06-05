import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.post("/anthropic/chat", async (req, res) => {
  try {
    const { messages, systemContext } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemContext || "You are a helpful care assistant.",
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    res.json({ content });
  } catch (err) {
    console.error("Anthropic chat error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.post("/anthropic/summary", async (req, res) => {
  try {
    const {
      client,
      visitDate,
      notes,
      confirmedMeds,
      skippedMeds,
      fluidMl,
      completedTasks,
      mealStatus,
      mood,
    } = req.body;

    const confirmedStr = confirmedMeds?.length
      ? confirmedMeds.join(", ")
      : "None recorded";
    const skippedStr = skippedMeds?.length
      ? skippedMeds.join(", ")
      : "None";
    const tasksStr = completedTasks?.length
      ? completedTasks.join(", ")
      : "None recorded";
    const fluidStr = fluidMl ? `${fluidMl}ml` : "Not recorded";
    const notesStr = notes?.trim() || "No notes entered by carer.";
    const moodStr = mood || "Not recorded";
    const mealStr = mealStatus || "Not recorded";

    const prompt = `You are generating a professional ContinuCare+ handover note for a UK domiciliary care visit. Use the carer's own notes as your PRIMARY source — reflect exactly what they recorded. Do not invent or assume anything not stated.

CLIENT
Name: ${client.name}, Age: ${client.age}
Address: ${client.address}
Conditions: ${client.conditions?.join(", ") ?? "See care plan"}
Allergy: ${client.allergy ?? "None known"}
GP: ${client.gp ?? "See care plan"}
Visit Date: ${visitDate}

WHAT THE CARER RECORDED
Mood at visit start: ${moodStr}
Carer's notes (typed/dictated): ${notesStr}
Meal intake: ${mealStr}
Fluid intake: ${fluidStr}
Tasks completed: ${tasksStr}
Medications given: ${confirmedStr}
Medications not given / refused: ${skippedStr}

Write a concise (150–200 word) professional handover note. Structure:
1. One opening sentence summarising the visit.
2. Four bullet points: Mood, Appetite/Fluid, Tasks completed, Medications.
3. One sentence for the next carer (any flags, things to monitor, or "No concerns").

Use the carer's notes as the primary source. Be warm but clinically precise. Do not mention Grace or any client not listed above.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const summary =
      response.content[0].type === "text" ? response.content[0].text : "";

    res.json({ summary });
  } catch (err) {
    console.error("Anthropic summary error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
