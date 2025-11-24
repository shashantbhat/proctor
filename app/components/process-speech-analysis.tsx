import { analyzeTranscript } from "../routes/api/analyse-transcript";
import { storeSpeechAnalysis } from "~/server/add-speech-analysis";

export async function processSpeechAnalysis(
  testId: string,
  studentId: string,
  transcript: string
) {
  if (!transcript.trim()) return;

  // 1. Call Groq for analysis
  const analysis = await analyzeTranscript(transcript);

  // 2. Add full transcript to result for DB
  analysis.fullTranscript = transcript;

  // 3. Store in DB
  await storeSpeechAnalysis(testId, studentId, analysis);

  return analysis;
}