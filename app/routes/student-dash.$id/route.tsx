import { type LoaderFunction, type ActionFunction, json, redirect } from "@remix-run/node";
import { sessionStorage } from "~/server/session.server";
import { getUserById } from "~/server/db.server";
import { getAllTests } from "~/server/get-all-test";
import { getAttemptedTestsByStudentId } from "~/server/get-attempted-tests-with-student_id";
import { Link, useLoaderData, Form } from "react-router";

// 🧠 Loader to fetch student info + tests
export const loader: LoaderFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) throw new Response("Unauthorized", { status: 401 });

  const [user, attemptedTests, availableTests] = await Promise.all([
    getUserById(userId),
    getAttemptedTestsByStudentId(userId),
    getAllTests(),
  ]);

  return json({ user, attemptedTests, availableTests });
};

// 🚪 Action to handle logout (destroy session)
export const action: ActionFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/get-started", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

// 🧩 Component
export default function StudentDashboard() {
  const { user, availableTests, attemptedTests } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user?.name || "Student"} 👋
        </h1>

        {/* 🚪 Logout Button */}
        <Form method="post">
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </Form>
      </div>

      {/* --- Available Tests --- */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Available Tests</h2>
        {availableTests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTests.map((test: any) => (
              <div
                key={test.id}
                className="p-5 bg-white rounded-2xl shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold text-gray-800">{test.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                {/* You can re-enable this when start-test route works */}
                {/* <Link
                  to={`/start-test/${test.id}`}
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Start Test
                </Link> */}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No tests available right now.</p>
        )}
      </section>

      {/* --- Attempted Tests --- */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Attempted Tests</h2>
        {attemptedTests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attemptedTests.map((test: any) => (
              <div
                key={test.testId}
                className="p-5 bg-white rounded-2xl shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold text-gray-800">{test.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Joined At: {new Date(test.joinedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">You haven’t attempted any tests yet.</p>
        )}
      </section>
    </div>
  );
}