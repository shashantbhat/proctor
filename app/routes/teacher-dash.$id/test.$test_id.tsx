import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, Form } from "react-router";
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

  return json({existingQuestions, TestDetails });

};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();

  const questionText = form.get("questionText") as string;
  const options = form.getAll("options") as string[];
  const file = form.get("image") as File | null;
  const testId = params.test_id!;

  let imageUrl = null;

  // Upload file to Supabase if provided
  if (file && typeof file !== "string" && file.size > 0) {
    const { uploadQuestionImage } = await import("~/server/image-upload");
    imageUrl = await uploadQuestionImage(file, crypto.randomUUID());
  }

  await addQuestion({
    testId,
    questionText,
    options,
    imageUrl,
  });

  return null;
};

export default function TestDetails() {
  const { existingQuestions, TestDetails } = useLoaderData<typeof loader>();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6"> {TestDetails.test.title}</h1>

      {/* Add Question Form */}
      <Form method="post" encType="multipart/form-data" className="border p-4 rounded-lg mb-8 space-y-3">
        <textarea
          name="questionText"
          placeholder="Question text"
          required
          className="border rounded w-full px-3 py-2"
        />

        <input
          name="options"
          placeholder="Option 1"
          className="border rounded w-full px-3 py-2"
        />
        <input
          name="options"
          placeholder="Option 2"
          className="border rounded w-full px-3 py-2"
        />
        <input
          name="options"
          placeholder="Option 3"
          className="border rounded w-full px-3 py-2"
        />
        <input
          name="options"
          placeholder="Option 4"
          className="border rounded w-full px-3 py-2"
        />

        <div>
          <label className="font-medium block mb-1">Upload Question Image (optional)</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="border rounded w-full px-3 py-2"
            />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Question
        </button>
      </Form>

      {/* Existing Questions */}
      <h2 className="text-xl font-semibold mb-3">Existing Questions</h2>
      {existingQuestions.length === 0 ? (
        <p>No questions added yet.</p>
      ) : (
        <ul className="space-y-4">
          {existingQuestions.map((q) => (
            <li key={q.id} className="border p-3 rounded">
              <p className="font-medium">{q.questionText}</p>
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt="Question"
                  className="w-full max-w-sm mt-2 rounded border"
                />
              )}
              <ul className="list-disc ml-6 mt-2">
                {q.options.map((opt: string, idx: number) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}