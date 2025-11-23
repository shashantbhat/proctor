import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import FaceDetection from "~/components/face-detection";
import SpeechRecognition from "~/routes/speech-recognition/route";
import { useParams } from "react-router";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  imageUrl: string;
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
  duration?: number;
}

interface Toast {
  id: string;
  message: string;
  severity: "success" | "error" | "warning" | "info";
  showConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function TestInterface({
  questions,
  userId,
  durationMinutes,
  startTime,
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
  const [timeLeft, setTimeLeft] = useState(0);
  const endTimeRef = useRef<number | null>(null);

  const autoSubmitTriggeredRef = useRef(false);

  // Flags
  const isEndingTestRef = useRef(false);
  const mountedRef = useRef(true);

  // ✅ FIX: Ref to always have latest answers for auto-submit
  const answersRef = useRef<Record<string, string>>({});
  const proctoringActivitiesRef = useRef<SuspiciousActivity[]>([]);

  // ✅ FIX: Keep refs in sync with state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    proctoringActivitiesRef.current = proctoringActivities;
  }, [proctoringActivities]);

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
        // ✅ FIX: Use ref instead of state to prevent multiple calls
        if (!autoSubmitTriggeredRef.current && !isEndingTestRef.current) {
          autoSubmitTriggeredRef.current = true;
          console.log("⏰ Timer expired - triggering auto-submit");
          handleTimeUp();
        }
      } else {
        setTimeLeft(diff);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);

    return () => clearInterval(id);
  // ✅ FIX: Removed hasSubmitted from dependencies - use refs instead
  }, [durationMinutes]);

  // ---------- Toasts ----------
  const showToast = (
    message: string,
    severity: "success" | "error" | "warning" | "info" = "info",
    options?: { showConfirm?: boolean; onConfirm?: () => void; onCancel?: () => void }
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        severity,
        showConfirm: options?.showConfirm,
        onConfirm: options?.onConfirm,
        onCancel: options?.onCancel
      },
    ]);

    // Auto-remove after 5 seconds if not a confirmation toast
    if (!options?.showConfirm) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
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
  const handleFaceActivity = useCallback((activity: SuspiciousActivity) => {
    console.log("📹 Face activity received:", activity);

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
        setProctoringActivities(prev => [...prev, activity]);

        const messages: Record<string, string> = {
          "looking_away": "⚠️ Please keep your eyes on the screen",
          "looking_down": "⚠️ Please look at the screen, not down",
          "looking_sideways": "⚠️ Please look straight at the screen",
          "looking_up": "⚠️ Please look at the screen, not up",
        };
        showToast(messages[activity.type], activity.severity);

        consecutiveNonCenterCount.current = 0;
      }
    } else {
      consecutiveNonCenterCount.current = 0;

      if (activity.type === "face_not_detected" || activity.type === "multiple_faces") {
        setProctoringActivities(prev => [...prev, activity]);

        const messages: Record<string, string> = {
          "face_not_detected": "⚠️ Face not detected. Stay in view",
          "multiple_faces": "⚠️ Multiple faces detected",
        };
        showToast(messages[activity.type], activity.severity);
      }
    }
  }, []);

  // ---------- Time Up Handler ----------
  const handleTimeUp = () => {
    // ✅ FIX: Additional safety check
    if (isEndingTestRef.current || submitting) {
      console.log("⚠️ Auto-submit blocked - already submitting");
      return;
    }
    
    console.log("⏰ Time's up - triggering auto-submit");
    showToast("⏰ Time's up! Your test is being submitted automatically.", "warning");
    
    setTimeout(() => {
      finishTest(true);
    }, 2000);
  };


  // ---------- Finish Test ----------
  const finishTest = async (auto = false) => {
  // ✅ FIX: Enhanced guard to prevent duplicate submissions
  if (isEndingTestRef.current) {
    console.log("⚠️ Submission already in progress, skipping...");
    return;
  }
  
  if (submitting) {
    console.log("⚠️ Already submitting, skipping...");
    return;
  }
  
  if (!auto && hasSubmitted) {
    console.log("⚠️ Already submitted, skipping...");
    return;
  }

  // ✅ FIX: Set flag immediately to prevent race conditions
  isEndingTestRef.current = true;
  setSubmitting(true);
  setHasSubmitted(true);
  setTestActive(false);

  console.log(`📤 Starting ${auto ? 'auto-' : ''}submission...`); // ✅ FIXED: Added parentheses

  const safeAnswers = answersRef.current;
  const safeActivities = proctoringActivitiesRef.current;
  const safeTranscript = finalTranscript; // ✅ Capture current transcript

  const payload = {
    testId,
    studentId: userId,
    answers: Object.entries(safeAnswers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
      writtenAnswer: null,
    })),
    submittedAt: new Date().toISOString(),
    proctoringLog: safeActivities,
    violationCount: safeActivities.length,
  };

  console.log("📤 Submitting payload:", payload);

  try {
    // Step 1: Submit test answers
    const res = await fetch("/api/submit-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to submit test");
    }

    console.log("✅ Test submission successful");

    // Exit fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {
        console.warn("Could not exit fullscreen");
      });
    }

    // -------------------------------
    // SPEECH ANALYSIS USING API 🔥
    // -------------------------------
    try {
      if (safeTranscript && safeTranscript.trim().length > 0) {
        console.log("🎤 Sending transcript to process-speech-analysis API");
        
        const speechRes = await fetch("/api/process-speech-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId,
            studentId: userId,
            transcript: safeTranscript,
          }),
        });

        const speechData = await speechRes.json();

        if (!speechRes.ok || !speechData.success) {
          console.error("❌ Speech analysis failed:", speechData.message);
        } else {
          console.log("✅ Speech analysis stored:", speechData.analysis);
        }
      } else {
        console.warn("⚠️ No transcript found. Skipping speech analysis.");
      }
    } catch (speechErr) {
      // Don't fail the entire submission if speech analysis fails
      console.error("❌ Error calling speech analysis API:", speechErr);
    }

    // Notify success
    setSubmitting(false);
    showToast(
      auto
        ? "⏰ Time's up! Test auto-submitted successfully."
        : "✅ Test submitted successfully!",
      "success"
    );

    console.log("✅ Submission complete, redirecting...");

    setTimeout(() => {
      window.location.href = `/student-dash/${userId}`;
    }, 2000);
    
  } catch (err) {
    console.error("❌ Test submission error:", err);
    // ✅ FIX: Reset ALL flags on error to allow retry
    setHasSubmitted(false);
    setSubmitting(false);
    isEndingTestRef.current = false;
    autoSubmitTriggeredRef.current = false; // ✅ ADDED: Reset this too
    showToast("❌ Failed to submit test. Please try again.", "error");
  }
};

  // ---------- Navigation ----------
  const handleAnswerSelect = (qid: string, opt: string) => {
    setAnswers(prev => ({ ...prev, [qid]: opt }));
  };

  const handleSubmit = async () => {
    await finishTest(false);
  };

  const handleNext = () => {
    if (currentIndex === questions.length - 1) {
      // Show confirmation toast
      showToast(
        "Are you sure you want to submit the test? This action cannot be undone.",
        "warning",
        {
          showConfirm: true,
          onConfirm: handleSubmit,
          onCancel: () => { }
        }
      );
    } else {
      setCurrentIndex((prev) => prev + 1);
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
      case "success": return "bg-emerald-600 border-none";
      case "error": return "bg-red-600 border-red-500";
      case "warning": return "bg-yellow-600 border-yellow-500";
      default: return "bg-blue-600 border-blue-500";
    }
  };

  console.log('these are the proctoring activities', proctoringActivities)

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#142E29] to-[#031B1D] text-white relative">

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-[9998] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${getSeverityColor(t.severity)} border-2 rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px] pointer-events-auto animate-slide-in backdrop-blur-md bg-opacity-90`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{t.message}</p>
                {t.severity === "warning" && t.showConfirm && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (t.onConfirm) t.onConfirm();
                        removeToast(t.id);
                      }}
                      className="bg-white text-gray-900 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-100 transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        if (t.onCancel) t.onCancel();
                        removeToast(t.id);
                      }}
                      className="bg-transparent border border-white text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {(!t.showConfirm) && (
                <button onClick={() => removeToast(t.id)} className="hover:opacity-70 transition">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-4">Submitting...</h2>
          <p className="text-lg">Please wait</p>
          <div className="mt-6 animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-500"></div>
        </div>
      )}

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
      <div className="w-64 bg-white/10 backdrop-blur-md p-4 flex flex-col z-10 border-r border-white/20">
        <h2 className="text-lg font-bold mb-4">Questions</h2>

        <div className="space-y-2 overflow-y-auto flex-1">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              disabled={submitting || hasSubmitted}
              className={`w-full p-3 rounded-lg font-medium transition-all ${i === currentIndex
                  ? "bg-gradient-to-r from-emerald-700 to-emerald-500 text-white shadow-lg"
                  : answers[q.id]
                    ? "bg-emerald-600/30 text-emerald-100 border border-emerald-500/50"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20"
                } disabled:opacity-50`}
            >
              Q{i + 1}
            </button>
          ))}
        </div>

        {/* Violation counter */}
        <div className="mt-auto pt-4 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
            <p className="text-xs text-gray-300 mb-1">Proctoring</p>
            <p className="text-sm font-semibold text-white">
              {proctoringActivities.length} violations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Timer - Centered in main content area */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/85 backdrop-blur-md px-6 py-3 rounded-xl text-lg font-bold z-50 shadow-lg text-gray-900">
          ⏳ {formatTime(timeLeft)}
        </div>

        <div className="p-10 pt-20">
          <h2 className="text-xl font-semibold mb-2 text-white">
            Question {currentIndex + 1} of {questions.length}
          </h2>

          <p className="text-base mb-6 text-gray-100 leading-relaxed">
            {currentQuestion?.questionText}
          </p>

          {currentQuestion?.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Question"
              className="max-w-xs my-6 rounded-lg border border-white/20 shadow-lg"
            />
          )}

          <div className="space-y-3 mt-8 max-w-3xl">
            {currentQuestion?.options?.map(opt => (
              <label
                key={opt}
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === opt
                    ? "bg-gradient-to-r from-emerald-700/50 to-emerald-500/50 border-emerald-400 shadow-lg"
                    : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                  }`}
              >
                <input
                  type="radio"
                  className="mt-1 mr-3"
                  value={opt}
                  name={`q-${currentQuestion.id}`}
                  checked={answers[currentQuestion.id] === opt}
                  onChange={() => handleAnswerSelect(currentQuestion.id, opt)}
                  disabled={submitting || hasSubmitted}
                />
                <span className="text-white flex-1">{opt}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-10 gap-4 max-w-3xl">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg disabled:opacity-50 hover:bg-white/20 transition-all border border-white/20 font-medium"
            >
              ← Previous
            </button>

            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              {currentIndex === questions.length - 1 ? "Finish Test" : "Next →"}
            </button>
          </div>
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