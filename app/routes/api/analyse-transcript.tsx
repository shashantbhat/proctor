import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function analyzeTranscript(transcript: string) {
  const prompt = `
You are an exam proctoring AI.

Given the student's speech transcript, detect if they were cheating.

Return JSON ONLY in this format:

{
  "cheating_probability": 0-100 number,
  "issues_detected": ["list"],
  "summary": "short summary"
}

Transcript:
"""${transcript}"""
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You must respond ONLY in JSON." },
      { role: "user", content: prompt }
    ]
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    throw new Error("Failed to parse Groq JSON: " + err);
  }
}