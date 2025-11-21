import { Form, useParams } from "react-router";
import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/src";
import { testParticipants } from "~/src/db/schema";
import { getUserSession } from "~/server/session.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { testId } = params;
  const user = await getUserSession(request);

  if (!user) return redirect(`/sign-in?redirectTo=/test/${testId}`);

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const enrollmentNo = formData.get("enrollmentNo") as string;
  const semester = formData.get("semester") as string;
  const batch = formData.get("batch") as string;
  const branch = formData.get("branch") as string;
  const email = formData.get("email") as string;

  await db.insert(testParticipants).values({
    testId: testId!,
    studentId: user.id,
    name,
    enrollmentNo,
    semester,
    batch,
    branch,
    email,
  });

  // redirect to test start
  return redirect(`/test/${testId}/start`);
};

export default function StudentDetailsForm() {
  const { testId } = useParams();

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Enter Your Details</h2>
      <Form method="post" className="flex flex-col gap-3">
        <input name="name" placeholder="Full Name" required className="border rounded p-2" />
        <input name="enrollmentNo" placeholder="Enrollment Number" required className="border rounded p-2" />
        <input name="semester" placeholder="Semester" required className="border rounded p-2" />
        <input name="batch" placeholder="Batch" required className="border rounded p-2" />
        <input name="branch" placeholder="Branch" required className="border rounded p-2" />
        <input name="email" type="email" placeholder="Email ID" required className="border rounded p-2" />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Start Test
        </button>
      </Form>
    </div>
  );
}