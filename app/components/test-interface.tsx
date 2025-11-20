import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import FaceDetection from "~/routes/face-detection/route";
import SpeechRecognition from "~/routes/speech-recognition/route";
import { useParams } from "react-router";

interface Question {
  id: string;
  questionText: string;
  options: string[];
}

interface SuspiciousActivity {
  timestamp: string;
  type:
    | "looking_away"
    | "face_not_detected"
    | "multiple_faces"
    | "looking_down"
    | "looking_sideways"
    | "looking_up"
    | "fullscreen-exit"
    | "app-switch"
    | "tab-switch"
    | "escape-pressed";
  severity: "low" | "medium" | "high";
  details: string;
}

interface Toast {
  id: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export default function TestInterface({
  questions,
  userId,
  durationMinutes,
  startTime, // unused but kept for compatibility
}: {
  questions: Question[];
  userId: string;
  durationMinutes: string;
  startTime?: string;
}) {

  // ---------- State ----------
  const { testId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [proctoringActivities, setProctoringActivities] = useState<SuspiciousActivity[]>([]);
  const [finalTranscript, setFinalTranscript] = useState("");

  const [testActive, setTestActive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const endTimeRef = useRef<number | null>(null);

  // Flags
  const isEndingTestRef = useRef(false);
  const mountedRef = useRef(true);

  // Face center detection threshold
  const consecutiveNonCenterCount = useRef(0);
  const CENTER_THRESHOLD = 2;
  

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // activate test when mounted
  useEffect(() => {
    setTestActive(true);
    return () => setTestActive(false);
  }, []);

  // ---------- Timer Logic ----------
  useEffect(() => {
    const dur = parseInt(durationMinutes, 10);
    if (isNaN(dur) || dur <= 0) return;

    const durationMs = dur * 60 * 1000;

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + durationMs;
    }

    const tick = () => {
      const now = Date.now();
      const diff = (endTimeRef.current ?? now) - now;

      if (diff <= 0) {
        setTimeLeft(0);
        if (!hasSubmitted) finishTest(true);
      } else {
        setTimeLeft(diff);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [durationMinutes, hasSubmitted]);

  // ---------- Toasts ----------
  const showToast = (message: string, severity: "low" | "medium" | "high") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, severity }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ---------- Log activity ----------
  const logActivity = (activity: SuspiciousActivity) => {
    if (isEndingTestRef.current) return;

    setProctoringActivities(prev => [...prev, activity]);

    const messages = {
      "looking_away": "⚠️ Please keep your eyes on the screen",
      "looking_down": "⚠️ Please look at the screen, not down",
      "looking_sideways": "⚠️ Please look straight at the screen",
      "looking_up": "⚠️ Please look at the screen, not up",
      "face_not_detected": "⚠️ Face not detected. Stay in view",
      "multiple_faces": "⚠️ Multiple faces detected",
      "fullscreen-exit": "⚠️ Fullscreen exit detected",
      "app-switch": "⚠️ App switching detected",
      "tab-switch": "⚠️ Tab switching detected",
      "escape-pressed": "⚠️ ESC key pressed",
    };

    showToast(messages[activity.type], activity.severity);
  };

  // expose for face detection component
  useEffect(() => {
    (window as any).getFaceDetectionActivities = () => proctoringActivities;
  }, [proctoringActivities]);

  // ---------- Fullscreen & Switch Events ----------
  const previouslyFullscreenRef = useRef(false);

  // fullscreen change
  useEffect(() => {
    const handler = () => {
      if (isEndingTestRef.current) return;

      const isFs = !!document.fullscreenElement;

      if (!isFs && previouslyFullscreenRef.current) {
        logActivity({
          timestamp: new Date().toISOString(),
          type: "fullscreen-exit",
          severity: "high",
          details: "User exited fullscreen",
        });
      }

      previouslyFullscreenRef.current = isFs;
    };

    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEndingTestRef.current) return;
      if (e.key === "Escape") {
        logActivity({
          timestamp: new Date().toISOString(),
          type: "escape-pressed",
          severity: "medium",
          details: "ESC pressed",
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // app switch detection
  useEffect(() => {
    const handler = () => {
      if (isEndingTestRef.current) return;

      logActivity({
        timestamp: new Date().toISOString(),
        type: "app-switch",
        severity: "high",
        details: "Window blur detected",
      });
    };

    window.addEventListener("blur", handler);
    return () => window.removeEventListener("blur", handler);
  }, []);

  // tab switch detection
  useEffect(() => {
    const handler = () => {
      if (isEndingTestRef.current) return;

      if (document.visibilityState === "hidden") {
        logActivity({
          timestamp: new Date().toISOString(),
          type: "tab-switch",
          severity: "high",
          details: "Tab hidden (switch/minimize)",
        });
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ---------- Face Activity ----------
  const handleFaceActivity = (activity: SuspiciousActivity) => {
    if (isEndingTestRef.current) return;

    const lookingTypes = [
      "looking_away",
      "looking_down",
      "looking_sideways",
      "looking_up",
    ];

    if (lookingTypes.includes(activity.type)) {
      consecutiveNonCenterCount.current++;
      if (consecutiveNonCenterCount.current >= CENTER_THRESHOLD) {
        logActivity(activity);
        consecutiveNonCenterCount.current = 0;
      }
    } else {
      consecutiveNonCenterCount.current = 0;

      if (activity.type === "face_not_detected" || activity.type === "multiple_faces") {
        logActivity(activity);
      }
    }
  };

  // ---------- Finish Test ----------
  const finishTest = async (auto = false) => {
    if (submitting || hasSubmitted) return;

    if (!auto) {
      const ok = confirm("Are you sure you want to submit?");
      if (!ok) return;
    }

    isEndingTestRef.current = true;
    setSubmitting(true);
    setHasSubmitted(true);
    setTestActive(false);

    const payload = {
      testId,
      studentId: userId,
      answers,
      submittedAt: new Date().toISOString(),
      proctoringLog: proctoringActivities,
      violationCount: proctoringActivities.length,
    };

    console.log("📤 Submitting", payload);

    try {
      await new Promise(res => setTimeout(res, 2000));

      if (document.fullscreenElement) await document.exitFullscreen();

      alert(auto ? "⏰ Time's up! Auto-submitted." : "✅ Submitted!");
    } catch (err) {
      alert("❌ Error submitting");
      setHasSubmitted(false);
      setSubmitting(false);
      isEndingTestRef.current = false;
    }
  };

  // ---------- Navigation ----------
  const handleAnswerSelect = (qid: string, opt: string) => {
    setAnswers(prev => ({ ...prev, [qid]: opt }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      finishTest();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const currentQuestion = questions[currentIndex];

  // ---------- UI helpers ----------
  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-600 border-red-500";
      case "medium": return "bg-orange-600 border-orange-500";
      case "low": return "bg-yellow-600 border-yellow-500";
      default: return "bg-blue-600 border-blue-500";
    }
  };

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  return (
    <div className="flex h-screen bg-black text-white relative">

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-[9998] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${getSeverityColor(t.severity)} border-2 rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px] pointer-events-auto animate-slide-in flex items-start justify-between`}
          >
            <p className="text-sm font-medium flex-1 pr-2">{t.message}</p>
            <button onClick={() => removeToast(t.id)}>
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Submit overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 text-white">
          <h2 className="text-3xl font-bold mb-4">Submitting...</h2>
          <p className="text-lg">Please wait</p>
          <div className="mt-6 animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      )}

      {/* Timer */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-900 px-6 py-3 rounded-xl text-lg font-bold z-50 shadow-lg">
        ⏳ {formatTime(timeLeft)}
      </div>

      {/* Proctoring */}
      <FaceDetection
        testId={testId}
        userId={userId}
        onActivityLogged={handleFaceActivity}
        autoStart={true}
      />

      <SpeechRecognition
        testActive={testActive}
        onTranscriptReady={setFinalTranscript}
      />

      {/* Sidebar */}
      <div className="w-1/5 bg-gray-900 p-4 flex flex-col z-10">
        <h2 className="text-lg font-bold mb-4">Questions</h2>

        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            disabled={submitting || hasSubmitted}
            className={`mb-2 p-2 rounded ${
              i === currentIndex
                ? "bg-blue-600"
                : answers[q.id]
                ? "bg-green-600"
                : "bg-gray-700"
            } disabled:opacity-50`}
          >
            Q{i + 1}
          </button>
        ))}

        {/* Violation counter */}
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proctoring</p>
            <p className="text-sm font-semibold">
              {proctoringActivities.length} violations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-4">
          Question {currentIndex + 1} of {questions.length}
        </h2>

        <p className="text-lg mb-6">{currentQuestion?.questionText}</p>

        <div className="space-y-3">
          {currentQuestion?.options?.map(opt => (
            <label
              key={opt}
              className={`block p-3 border rounded cursor-pointer ${
                answers[currentQuestion.id] === opt
                  ? "bg-blue-700 border-blue-500"
                  : "bg-gray-800 border-gray-700 hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                className="hidden"
                value={opt}
                name={`q-${currentQuestion.id}`}
                checked={answers[currentQuestion.id] === opt}
                onChange={() => handleAnswerSelect(currentQuestion.id, opt)}
                disabled={submitting || hasSubmitted}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="flex justify-between mt-10">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="bg-gray-700 px-6 py-2 rounded-lg disabled:opacity-50"
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-500"
          >
            {currentIndex === questions.length - 1 ? "Finish Test" : "Next →"}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(200px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in .3s ease-out;
        }
      `}</style>
    </div>
  );
}