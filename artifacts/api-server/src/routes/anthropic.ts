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
    const { client, visitDate } = req.body;

    const prompt = `Generate a concise, professional ContinuCare+ handover note for the following domiciliary care visit:

Client: ${client.name}, Age ${client.age}
Address: ${client.address}
Conditions: ${client.conditions.join(", ")}
Allergy: ${client.allergy}
GP: ${client.gp}
Visit Date: ${visitDate}
Medications given: ${client.meds.map((m: { name: string; dose: string }) => `${m.name} ${m.dose}`).join(", ")}

Write a brief (150-200 word) handover note in a professional care setting format. Include: overall impression, 4 bullet points covering Mood, Appetite, Mobility, and Skin condition (positive observations), and a brief note for the next carer. Keep it warm but clinically professional.`;

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
