const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const analyzeTicket = async (ticket) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `You are a ticket triage agent. Only return a strict JSON object with no extra text, headers, or markdown.

Analyze the following support ticket and return a JSON object with exactly these fields:

- summary: A short 1-2 sentence summary of the issue.
- priority: One of "low", "medium", or "high".
- helpfulNotes: A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.
- relatedSkills: An array of relevant skills required to solve the issue (e.g., ["React", "MongoDB"]).

Respond ONLY with this JSON format. Do not include any markdown, code fences, or extra text:

{
  "summary": "Short summary of the ticket",
  "priority": "high",
  "helpfulNotes": "Here are useful tips...",
  "relatedSkills": ["React", "Node.js"]
}

Ticket information:
- Title: ${ticket.title}
- Description: ${ticket.description}`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(30000), // 30s hard timeout
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini API error:", data?.error?.message);
      return null;
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      console.error("Gemini returned empty content");
      return null;
    }

    try {
      // Strip markdown fences if the model added them despite instructions
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonString = match ? match[1] : raw.trim();
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini response:", e.message);
      console.error("Raw output was:", raw);
      return null;
    }
  } catch (e) {
    console.error("Gemini fetch error:", e.message);
    return null;
  }
};

export default analyzeTicket;
