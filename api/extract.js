// Turns pasted notes into memorable chunks. The key stays on the server.
// Tries each model in order; if one is overloaded, it retries, then moves to the next.
// If you get "model not found", check AI Studio for current model names.
const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

const SYSTEM = `You split study notes into memorable chunks for a memory palace.
Return ONLY a JSON array of objects: [{"title": "...", "detail": "..."}]. No preamble, no markdown fences.
Rules:
- "title" is a 2-5 word cue for the chunk.
- "detail" is 1-2 short sentences (max 25 words) with the key information to remember.
- Group related ideas so each chunk covers ONE idea. Skip filler and repeats.
- Keep the notes' original order.
- Use only information from the notes; never invent facts.`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(model, userText) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { notes, count } = req.body || {};
  if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
    return res.status(400).json({ error: "Paste at least a few sentences of notes." });
  }
  const n = Math.min(Math.max(parseInt(count) || 8, 3), 15);
  const userText = `Split these notes into exactly ${n} chunks:\n\n${notes.slice(0, 8000)}`;

  try {
    let r = null;
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        r = await callGemini(model, userText);
        if (r.ok) break;
        const busy = r.status === 503 || r.status === 429;
        console.error(model, "failed with", r.status);
        if (!busy) break;          // real error: don't retry
        await sleep(1500);         // busy: wait, then retry
      }
      if (r.ok) break;
    }
    if (!r || !r.ok) {
      return res.status(502).json({ error: "The AI is busy right now. Wait a minute and try again." });
    }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    const chunks = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!Array.isArray(chunks)) throw new Error("Not an array");
    return res.status(200).json({
      chunks: chunks.slice(0, n).map(c => ({ title: String(c.title || ""), detail: String(c.detail || "") }))
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Couldn't read the AI's answer. Try again." });
  }
};