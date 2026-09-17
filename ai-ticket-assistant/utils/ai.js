const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

const analyzeTicket = async (ticket) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return null;
  }

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

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(30000), // 30s hard timeout
      });

      const data = await res.json();

      if (!res.ok) {
        console.warn(`Gemini model ${model} error:`, data?.error?.message);
        continue;
      }

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!raw) {
        console.warn(`Gemini model ${model} returned empty content`);
        continue;
      }

      try {
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const jsonString = match ? match[1] : raw.trim();
        const parsed = JSON.parse(jsonString);
        return parsed;
      } catch (e) {
        console.warn(`Failed to parse JSON from ${model}:`, e.message);
        continue;
      }
    } catch (e) {
      console.warn(`Gemini fetch error on ${model}:`, e.message);
    }
  }

  console.error("All Gemini candidate models failed");
  return null;
};

export default analyzeTicket;
