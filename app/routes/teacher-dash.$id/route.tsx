import { Link, useLoaderData, Form, useNavigate, useParams } from "react-router";
import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { db } from "~/src/index";
import { tests } from "~/src/db/schema";
import { eq, and} from "drizzle-orm";
import { closeTest } from "~/server/close-test";

export const loader: LoaderFunction = async ({ params }) => {
  const teacherId = params.id!;

  // ✅ Fetch only active tests for the teacher
  const activeTests = await db
    .select()
    .from(tests)
    .where(and(eq(tests.teacherId, teacherId), eq(tests.isActive, true)));

  return json({ activeTests });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const testId = formData.get("testId") as string;
  await closeTest(testId);
  return null;
};

export default function TeacherDashboard() {
  const { activeTests } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { id } = useParams(); // teacher's ID from URL

  const handleNewTestClick = () => {
    navigate(`/teacher-dash/${id}/new-test`);
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>

      {/* Create new test */}
      <div className="mb-6">
        <button
          onClick={handleNewTestClick}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create New Test
        </button>
      </div>

      {/* Active Tests List */}
      <h2 className="text-xl font-semibold mb-4">Active Tests</h2>
      {activeTests.length === 0 ? (
        <p>No active tests found.</p>
      ) : (
        <div className="space-y-4">
          {activeTests.map((test) => (
            <div
              key={test.id}
              className="p-4 border rounded-lg flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold text-lg">{test.title}</h3>
                <p className="text-sm text-gray-600">{test.description}</p>
                <p className="text-xs text-gray-400">ID: {test.id}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/test/${test.id}`}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  View / Add Questions
                </Link>

                <Form method="post">
                  <input type="hidden" name="testId" value={test.id} />
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Close Test
                  </button>
                </Form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}