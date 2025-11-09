import { useState } from "react";
import { useParams } from "react-router";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  imageUrls?: string[];
}


export default function TestInterface({ questions, userId }: { questions: Question[], userId: string }) {
  const { testId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  // const navigate = useNavigate();

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

    try {
      const payload = {
        testId, // assuming testId is available from props or useParams
        answers,
        submittedAt: new Date().toISOString(),
        userId, // ✅ directly use from props
      };

      const res = await fetch("/api/submit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Test submitted successfully!");
        document.exitFullscreen();

        // ✅ Redirect student to their dashboard
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