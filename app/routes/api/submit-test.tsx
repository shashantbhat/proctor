import { db } from "~/src";
import { studentResponses } from "~/src/db/schema";
import { sessionStorage } from "~/server/session.server";

export const action = async ({ request }: { request: Request }) => {
  try {
    const session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    const studentId = session.get("userId");

    if (!studentId) {
      return Response.json(
        { success: false, message: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testId, answers, submittedAt } = body;

    if (!testId || !answers) {
      return Response.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    await db.insert(studentResponses).values({
      testId,
      studentId,
      answers,
      submittedAt: new Date(submittedAt),
    });

    return Response.json({
      success: true,
      message: "Responses saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving test responses:", error);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
};