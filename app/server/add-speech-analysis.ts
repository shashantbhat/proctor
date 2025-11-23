import { db } from "~/src/index";
import { speechAnalysis } from "~/src/db/schema";

export async function storeSpeechAnalysis(testId: string, studentId: string, analysis: any) {
  await db.insert(speechAnalysis).values({
    testId,
    studentId,
    transcript: analysis.fullTranscript ?? "",
    cheatingProbability: analysis.cheating_probability.toString(),
    issuesDetected: analysis.issues_detected,
    summary: analysis.summary,
  })
  .onConflictDoUpdate({
    target: [speechAnalysis.testId, speechAnalysis.studentId],
    set: {
      transcript: analysis.fullTranscript ?? "",
      cheatingProbability: analysis.cheating_probability.toString(),
      issuesDetected: analysis.issues_detected,
      summary: analysis.summary,
      createdAt: new Date(),
    }
  });
}