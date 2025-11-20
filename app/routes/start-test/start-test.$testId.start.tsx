import { useEffect, useState } from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "react-router";
import TestInterface from "~/components/test-interface";
import { getQuestionsByTestId } from "~/server/get-questions-with-testID";
import { sessionStorage } from "~/server/session.server";
import { getTestDetailsById } from "~/server/get-test-details-with-id";

export const loader: LoaderFunction = async ({ request, params }) => {
  const testId = params.testId;
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!testId) {
    throw new Response("Test ID is missing", { status: 400 });
  }

  const data = await getQuestionsByTestId(testId);
  const testDetails = await getTestDetailsById(testId);

  if (!data.success) {
    throw new Response("Failed to load questions", { status: 500 });
  }

  if (!testDetails.success) {
    throw new Response("Test Not Found", { status: 404 });
  }

  console.log('the duration is' ,testDetails.test?.durationMinutes)

  return json({
    questions: data.questions,
    userId,
    durationMinutes: testDetails.test?.durationMinutes,
    startTime: testDetails.test?.startTime,
    endTime: testDetails.test?.endTime,
  });
};

const recordViolation = async (message: string) => {
  console.log("Violation recorded:", message);
  await fetch("/api/record-violations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, timestamp: new Date().toISOString() }),
  });
};

export default function StartTest() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const { questions, userId, durationMinutes, startTime } = useLoaderData<typeof loader>();

  // Step 1: Ask for camera and mic permission immediately
  useEffect(() => {
    const askPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPermissionsGranted(true);
      } catch (err) {
        alert("Please allow camera and microphone permissions to continue.");
        console.error("Permission error:", err);
      }
    };
    askPermissions();
  }, []);

  const startTest = async () => {
    if (document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
    }
    setTestStarted(true);
  };

  // useEffect(() => {
  //   if (!testStarted) return;

  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "Escape") {
  //       alert("⚠️ Escape key detected! Leaving fullscreen is not allowed.");
  //       recordViolation("Escape key pressed");
  //     }
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       alert("⚠️ You switched tabs! This will be flagged.");
  //       recordViolation("Tab switch detected");
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   document.addEventListener("visibilitychange", handleVisibilityChange);

  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //     document.removeEventListener("visibilitychange", handleVisibilityChange);
  //   };
  // }, [testStarted]);

  // 🧩 Rendering logic
  if (!permissionsGranted){
    return (
      <div className="h-screen flex items-center justify-center text-white bg-black">
        <h1 className="text-2xl">Requesting Camera & Mic Permissions...</h1>
      </div>
    );
  }
  // if (!testStarted && micPassed)
  if (!testStarted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-white bg-black">
        <h1 className="text-3xl font-bold mb-4">System Check Complete ✅</h1>
        <button
          onClick={startTest}
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-300 transition-all"
        >
          Start Test
        </button>
      </div>
    );
  }

  if (testStarted) {
    return (
      <TestInterface 
        questions={questions} 
        userId={userId}
        durationMinutes={durationMinutes}
        startTime={startTime}
      />
    );
  }
  return null;
}