import { Form, useNavigate, useParams } from "react-router";
import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { createTest } from "~/server/create-test";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  // ✅ Get teacher ID from route params (from /teacher-dash.$id/new-test)
  const teacherId = params.id;

  if (!teacherId) {
    throw new Error("Missing teacher ID in route params.");
  }

  await createTest({ title, description, teacherId });
  return redirect(`/teacher-dash/${teacherId}`);
};

export default function NewTest() {
  const navigate = useNavigate();
  const { id } = useParams(); // ✅ client-side usage is okay here

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Test</h1>

      <Form method="post" className="flex flex-col gap-4">
        {/* ✅ Hidden field not needed since we get it from params, but you can keep it if you prefer */}
        <input type="hidden" name="teacherId" value={id} />

        <input
          name="title"
          placeholder="Test Title"
          required
          className="border rounded px-3 py-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          required
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Test
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-gray-600 underline"
        >
          Cancel
        </button>
      </Form>
    </div>
  );
}