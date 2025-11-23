import {
  json,
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";

import { db } from "~/src/index";
import { questions } from "~/src/db/schema";
import { addQuestion } from "~/server/add-question";
import { eq } from "drizzle-orm";
import { getTestDetailsById } from "~/server/get-test-details-with-id";

export const loader: LoaderFunction = async ({ params }) => {
  const testId = params.test_id!;
  const existingQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.testId, testId));

  const TestDetails = await getTestDetailsById(testId);

  return json({ existingQuestions, TestDetails });
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();

  const questionText = form.get("questionText") as string;
  const options = form.getAll("options") as string[];
  const file = form.get("image") as File | null;
  const testId = params.test_id!;

  let imageUrl = null;

  if (file && typeof file !== "string" && file.size > 0) {
    const { uploadQuestionImage } = await import(
      "~/server/image-upload"
    );
    imageUrl = await uploadQuestionImage(file, crypto.randomUUID());
  }

  await addQuestion({
    testId,
    questionText,
    options,
    imageUrl,
  });

  return null; // triggers loader refresh
};

export default function TestDetails() {
  const { existingQuestions, TestDetails } =
    useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const [isFormActive, setIsFormActive] = useState(false);

  // Reset form only after successful submit
  useEffect(() => {
    if (navigation.state === "idle") {
      formRef.current?.reset();
    }
  }, [navigation.state]);

  return (
    <section className="text-white/85 bg-gradient-to-b from-[#142E29] to-[#031B1D] min-h-screen w-full flex items-center justify-center p-4 inset-0">
      <div className="w-full max-w-3xl">
        
        {/* Page Title */}
        <h1 className="text-3xl font-semibold text-center mb-8">
          {TestDetails.test.title}
        </h1>

        <div className="">
          <img
            src="https://qblapbmmhjyxpoeyhjrf.supabase.co/storage/v1/object/public/question-images/assets/bg-grad-get-started.png"
            className={`
              w-full h-full object-contain absolute inset-0 ${existingQuestions.length === 0 ? "" : "-top-50" } scale-90
              transition-opacity duration-500 
              pointer-events-none
              ${isFormActive ? 'opacity-100' : 'opacity-0'}
            `}
          />

          {/* Add Question Form */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl rounded-2xl p-6 mb-10"
            onMouseEnter={() => setIsFormActive(true)}
            onMouseLeave={() => setIsFormActive(false)}
            >
            <h2 className="text-xl font-semibold mb-4">Add Question</h2>

            <Form
              method="post"
              encType="multipart/form-data"
              ref={formRef}
              className="space-y-4 text-sm!"
            >
              <textarea
                name="questionText"
                placeholder="Enter question text..."
                required
                className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2 focus:ring-1 focus:ring-emerald-400 outline-none"
              />

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="options"
                  placeholder="Option 1"
                  className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2 focus:ring-1 focus:ring-emerald-400 outline-none"
                />
                <input
                  name="options"
                  placeholder="Option 2"
                  className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2 focus:ring-1 focus:ring-emerald-400 outline-none"
                />
                <input
                  name="options"
                  placeholder="Option 3"
                  className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2 focus:ring-1 focus:ring-emerald-400 outline-none"
                />
                <input
                  name="options"
                  placeholder="Option 4"
                  className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2 focus:ring-1 focus:ring-emerald-400 outline-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block mb-1 font-medium">Upload Image (Optional)</label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="bg-white/10 border border-white/20 rounded-lg w-full px-3 py-2"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white/85 py-2 rounded-lg hover:bg-emerald-700 transition-all"
              >
                Add Question
              </button>
            </Form>
          </div>
        </div>

        {/* Existing Questions */}
        <h2 className="text-xl font-semibold mb-4 text-center">
          Existing Questions
        </h2>

        {existingQuestions.length === 0 ? (
          <p className="text-gray-300 text-center">No questions added yet.</p>
        ) : (
          <ul className="space-y-4">
            {existingQuestions.map((q) => (
              <li
                key={q.id}
                className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl rounded-xl p-4"
              >
                <p className="font-medium text-white/90">{q.questionText}</p>

                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    alt="Question"
                    className="w-full max-w-sm mt-3 rounded-lg border"
                  />
                )}

                <ul className="list-disc ml-6 mt-2 text-white/70">
                  {q.options.map((opt: string, idx: number) => (
                    <li key={idx}>{opt}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}