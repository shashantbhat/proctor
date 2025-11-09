// TestInterface.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router";
import FaceDetection from "~/routes/face-detection/route";
import SpeechRecognition from "~/routes/speech-recognition/route";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  imageUrls?: string[];
}

interface SuspiciousActivity {
  timestamp: string;
  type: string;
  severity: string;
  details: string;
}

export default function TestInterface({ 
  questions, 
  userId 
}: { 
  questions: Question[], 
  userId: string 
}) {
  const { testId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [proctoringActivities, setProctoringActivities] = useState<SuspiciousActivity[]>([]);
  const [testActive, setTestActive] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");

  // Start the test when component mounts
  useEffect(() => {
    setTestActive(true);
    console.log("Test started - speech recognition activated");
    
    // Cleanup on unmount
    return () => {
      setTestActive(false);
    };
  }, []);

  // Handle face detection activities
  const handleActivityLogged = (activity: SuspiciousActivity) => {
    setProctoringActivities(prev => [...prev, activity]);
  };

  // Handle transcript updates
  const handleTranscriptUpdate = (transcript: string) => {
    console.log("Transcript updated:", transcript);
    setFinalTranscript(transcript);
  };

  const handleAnswerSelect = (qid: string, ans: string) => {
    setAnswers({ ...answers, [qid]: ans });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    else finishTest();
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const finishTest = async () => {
    if (!confirm("Are you sure you want to finish the test?")) return;
    setSubmitting(true);
    
    // Stop speech recognition before submitting
    setTestActive(false);

    try {
      // Get all face detection activities
      const allActivities = typeof window !== 'undefined' 
        ? (window as any).getFaceDetectionActivities?.() || proctoringActivities
        : proctoringActivities;

      const payload = {
        testId,
        answers,
        submittedAt: new Date().toISOString(),
        userId,
        // Include proctoring data
        proctoringData: {
          suspiciousActivities: allActivities,
          totalFlags: allActivities.length,
          highSeverityFlags: allActivities.filter((a: any) => a.severity === "high").length,
          mediumSeverityFlags: allActivities.filter((a: any) => a.severity === "medium").length,
          lowSeverityFlags: allActivities.filter((a: any) => a.severity === "low").length,
          // Include the full transcript
          speechTranscript: finalTranscript,
          transcriptLength: finalTranscript.length
        }
      };

      const res = await fetch("/api/submit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Test submitted successfully!");
        
        // Exit fullscreen if active
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }

        // Redirect student to their dashboard
        window.location.href = `/student-dash/${userId}`;
      } else {
        alert("❌ Failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[currentIndex];

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Face Detection Component - overlays on UI */}
      <FaceDetection 
        testId={testId}
        userId={userId}
        onActivityLogged={handleActivityLogged}
        autoStart={true}
      />

      {/* Speech Recognition Component */}
      <SpeechRecognition
        testActive={testActive}
        onTranscriptReady={handleTranscriptUpdate}
      />

      {/* Sidebar */}
      <div className="w-1/5 bg-gray-900 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Questions</h2>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`mb-2 p-2 rounded ${
              i === currentIndex
                ? "bg-blue-600"
                : answers[questions[i].id]
                ? "bg-green-600"
                : "bg-gray-700"
            }`}
          >
            Q{i + 1}
          </button>
        ))}
        
        {/* Optional: Show transcript status */}
        {finalTranscript && (
          <div className="mt-4 p-2 bg-gray-800 rounded text-xs">
            <p className="text-gray-400">Speech detected</p>
            <p className="text-gray-500">{finalTranscript.length} chars</p>
          </div>
        )}
      </div>

      {/* Main Question Area */}
      <div className="flex-1 p-10">
        <h2 className="text-2xl font-semibold mb-4">
          Question {currentIndex + 1} of {questions.length}
        </h2>

        {q.imageUrls && q.imageUrls.length > 0 && (
          <img
            src={q.imageUrls[0]}
            alt="question"
            className="w-64 h-64 object-cover mb-4"
          />
        )}

        <p className="text-lg mb-6">{q.questionText}</p>

        <div className="space-y-3">
          {q.options?.map((opt) => (
            <label
              key={opt}
              className={`block p-3 border rounded cursor-pointer ${
                answers[q.id] === opt ? "bg-blue-700" : "bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name={`q-${q.id}`}
                value={opt}
                checked={answers[q.id] === opt}
                onChange={() => handleAnswerSelect(q.id, opt)}
                className="hidden"
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
            disabled={submitting}
            className="bg-blue-600 px-6 py-2 rounded-lg"
          >
            {currentIndex === questions.length - 1
              ? "Finish Test"
              : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}