// import { db } from "~/src";
// import { studentResponses } from "~/src/db/schema";
// import { sessionStorage } from "~/server/session.server";

// export const action = async ({ request }: { request: Request }) => {
//   try {
//     const session = await sessionStorage.getSession(
//       request.headers.get("Cookie")
//     );

//     const studentId = session.get("userId");

//     if (!studentId) {
//       return Response.json(
//         { success: false, message: "Unauthorized: No active session" },
//         { status: 401 }
//       );
//     }

//     const body = await request.json();
//     const { testId, answers, submittedAt } = body;

//     if (!testId || !answers) {
//       return Response.json(
//         { success: false, message: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     await db.insert(studentResponses).values({
//       testId,
//       studentId,
//       answers, // already a JSON array in correct format
//       submittedAt: new Date(submittedAt),
//     });

//     return Response.json({
//       success: true,
//       message: "Responses saved successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error saving test responses:", error);
//     return Response.json(
//       { success: false, message: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// };


import { db } from "~/src";
import { violations, studentResponses } from "~/src/db/schema";
import { json } from "@remix-run/node";

interface ViolationPayload {
  timestamp: string;
  type: string;
  severity: string;
  details: string;
}

interface SubmitTestPayload {
  testId: string;
  studentId: string;
  answers: {
    questionId: string;
    selectedOption: string | null;
    writtenAnswer: string | null;
  }[];
  submittedAt: string;
  proctoringLog: ViolationPayload[];
  violationCount: number;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload: SubmitTestPayload = await request.json();
    const { testId, studentId, answers, submittedAt, proctoringLog } = payload;

    let violationId: string | null = null;

    // Step 1: If there are violations, insert them as a single row with events array
    if (proctoringLog && proctoringLog.length > 0) {
      // Transform proctoringLog to the events array format
      const events = proctoringLog.map((v) => ({
        event: v.type,
        severity: v.severity,
        message: v.details,
        occurredAt: v.timestamp,
      }));

      // Insert single row with all events
      const [insertedViolation] = await db
        .insert(violations)
        .values({
          testId,
          studentId,
          events,
        })
        .returning({ id: violations.id });

      violationId = insertedViolation.id;
    }

    // Step 2: Insert the student response with the single violation ID
    await db.insert(studentResponses).values({
      testId,
      studentId,
      answers,
      violationId, // Single ID that contains all violations
      submittedAt: new Date(submittedAt),
    });

    return json({ success: true, message: "Test submitted successfully" });
  } catch (error) {
    console.error("Error submitting test:", error);
    return json(
      { success: false, message: "Failed to submit test" },
      { status: 500 }
    );
  }
}