import { useEffect, useState } from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "react-router";
import TestInterface from "~/components/test-interface";
import { getQuestionsByTestId } from "~/server/get-questions-with-testID";
import { sessionStorage } from "~/server/session.server";

const sentences = [
  "this is to check."
];

export const loader: LoaderFunction = async ({ request, params }) => {
  const testId = params.testId;
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!testId) {
    throw new Response("Test ID is missing", { status: 400 });
  }

  const data = await getQuestionsByTestId(testId);

  if (!data.success) {
    throw new Response("Failed to load questions", { status: 500 });
  }

  // ✅ Return both questions and userId
  return json({
    questions: data.questions,
    userId,
  });
};

export default function StartTest() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [micTestVisible, setMicTestVisible] = useState(false);
  const [micPassed, setMicPassed] = useState(false);
  const [index, setIndex] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { questions, userId } = useLoaderData<typeof loader>();

  // Step 1: Ask for camera and mic permission immediately
  useEffect(() => {
    const askPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPermissionsGranted(true);
        setMicTestVisible(true);
      } catch (err) {
        alert("Please allow camera and microphone permissions to continue.");
        console.error("Permission error:", err);
      }
    };
    askPermissions();
  }, []);

  // Step 2: Setup SpeechRecognition
  // Step 2: Setup SpeechRecognition
  useEffect(() => {
    const SR =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recog = new SR();
      recog.lang = "en-US";
      recog.continuous = false;
      recog.interimResults = false;

      let fullTranscript = "";

      recog.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
        fullTranscript = finalTranscript.trim();
        setTranscript(fullTranscript);
        console.log("Captured transcript:", fullTranscript);
      };

      recog.onend = () => {
        console.log("Recognition ended with transcript:", fullTranscript);
        if (fullTranscript.trim()) {
          compareText(sentences[index], fullTranscript);
        } else {
          alert("No speech detected. Please try again.");
          setRecording(false);
        }
      };

      recog.onerror = (e: any) => {
        console.error("Speech error:", e);
        alert("Microphone error. Please retry.");
        setRecording(false);
      };

      setRecognition(recog);
    } else {
      alert("Speech Recognition not supported in this browser.");
    }
  }, [index]);

  // Compare the spoken text to the sentence
  const compareText = (original: string, spoken: string) => {
    const clean = (text: string) =>
      text.toLowerCase().replace(/[.,!?]/g, "").split(/\s+/);

    const o = clean(original);
    const s = clean(spoken);

    let matched = 0;
    o.forEach((word) => {
      if (s.some((w) => w.includes(word) || word.includes(w))) {
        matched++;
      }
    });

    const score = Math.round((matched / o.length) * 100);
    console.log("Original:", o);
    console.log("Spoken:", s);
    console.log("Matched:", matched, "Score:", score);
    setAccuracy(score);
    setRecording(false);
  };

  const startRecording = () => {
    if (recognition) {
      setTranscript(""); // Reset previous transcript
      setRecording(true);
      setAccuracy(null);
      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setRecording(false);
    }
  };

  const handleNextSentence = () => {
    if (index < sentences.length - 1) {
      setIndex(index + 1);
      setAccuracy(null);
    } else {
      if (accuracy && accuracy >= 60) {
        setMicPassed(true);
        setMicTestVisible(false);
      } else {
        alert("Microphone test failed. Please retry.");
        setIndex(0);
        setAccuracy(null);
      }
    }
  };

  const startTest = async () => {
    if (document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
    }
    setTestStarted(true);
  };


  useEffect(() => {
    if (!testStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        alert("⚠️ Escape key detected! Leaving fullscreen is not allowed.");
        recordViolation("Escape key pressed");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("⚠️ You switched tabs! This will be flagged.");
        recordViolation("Tab switch detected");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [testStarted]);

  const recordViolation = async (message: string) => {
    console.log("Violation recorded:", message);
    await fetch("/api/record-violations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, timestamp: new Date().toISOString() }),
    });
  };

  // 🎤 Microphone Test Modal
  const MicTestPopup = () => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-2xl p-8 w-[90%] max-w-md text-center shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">Microphone Test</h2>
        <p className="mb-2">Read this aloud:</p>
        <p className="text-yellow-400 text-lg font-semibold mb-4">
          "{sentences[index]}"
        </p>

        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-300"
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700"
          >
            ⏹ Stop Recording
          </button>
        )}

        {recording && (
          <p className="mt-4 text-sm text-gray-400">
            Listening... Speak clearly into your mic
          </p>
        )}

        {accuracy !== null && (
          <p className="mt-4 text-lg">
            Accuracy: <span className="text-green-400">{accuracy}%</span>
          </p>
        )}

        {accuracy !== null && (
          <button
            onClick={handleNextSentence}
            className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
          >
            {index < sentences.length - 1 ? "Next Sentence" : "Finish Test"}
          </button>
        )}
      </div>
    </div>
  );

  // 🧩 Rendering logic
  if (!permissionsGranted)
    return (
      <div className="h-screen flex items-center justify-center text-white bg-black">
        <h1 className="text-2xl">Requesting Camera & Mic Permissions...</h1>
      </div>
    );

  if (micTestVisible) return <MicTestPopup />;

  if (!testStarted && micPassed)
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

  if (testStarted)
    
    return (
      <TestInterface questions={questions} userId={userId} />
    );

  return null;
}