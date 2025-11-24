import { json } from "@remix-run/node";
import { processSpeechAnalysis } from "~/components/process-speech-analysis"
// adjust import path to where your helper actually is

export async function action({ request }) {
  try {
    const form = await request.formData(); // ✅ FIXED

    const testId = form.get("testId");
    const studentId = form.get("studentId");
    const transcript = form.get("transcript");

    if (!testId || !studentId || !transcript) {
      return json({ error: "Missing fields" }, { status: 400 });
    }

    // Call your original helper function
    const analysis = await processSpeechAnalysis(
      testId.toString(),
      studentId.toString(),
      transcript.toString()
    );

    return json({ success: true, analysis });
  } catch (err) {
    console.error("Speech analysis error:", err);
    return json({ error: err.message }, { status: 500 });
  }
}