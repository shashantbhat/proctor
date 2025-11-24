import { type LoaderFunction, type ActionFunction, json, redirect } from "@remix-run/node";
import { sessionStorage } from "~/server/session.server";
import { getUserById } from "~/server/db.server";
import { getAllTests } from "~/server/get-all-test";
import { getAttemptedTestsByStudentId } from "~/server/get-attempted-tests-with-student_id";
import { Link, useLoaderData, Form, type MetaFunction } from "react-router";
import { db } from "~/src/index";
import { studentResponses, questions } from "~/src/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const meta: MetaFunction = () => {
  return [
    { title: "ProctorSync • Student Dashboard" }   // <-- Your page title
  ];
};

// 🧠 Loader to fetch student info + tests with analytics
export const loader: LoaderFunction = async ({ request }) => {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  if (!userId) throw new Response("Unauthorized", { status: 401 });

  const [user, attemptedTests, availableTests] = await Promise.all([
    getUserById(userId),
    getAttemptedTestsByStudentId(userId),
    getAllTests(),
  ]);

  // ✅ Calculate analytics for attempted tests
  const attemptedTestsWithAnalytics = await Promise.all(
    attemptedTests.map(async (test: any) => {
      // Get student's response for this test
      const response = await db
        .select()
        .from(studentResponses)
        .where(
          and(
            eq(studentResponses.testId, test.testId),
            eq(studentResponses.studentId, userId)
          )
        )
        .limit(1);

      // Get total questions for this test
      const totalQuestions = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(eq(questions.testId, test.testId));

      const questionsCount = Number(totalQuestions[0]?.count || 0);
      const isSubmitted = response[0]?.submittedAt != null;
      const answeredCount = response[0]?.answers?.length || 0;

      return {
        ...test,
        analytics: {
          totalQuestions: questionsCount,
          answeredQuestions: answeredCount,
          isSubmitted,
          submittedAt: response[0]?.submittedAt,
          completionPercentage: questionsCount > 0 
            ? Math.round((answeredCount / questionsCount) * 100) 
            : 0,
        },
      };
    })
  );

  // ✅ Calculate overall student statistics
  const totalTestsAttempted = attemptedTests.length;
  const totalTestsCompleted = attemptedTestsWithAnalytics.filter(
    (t) => t.analytics.isSubmitted
  ).length;
  const totalTestsInProgress = totalTestsAttempted - totalTestsCompleted;

  return json({
    user,
    attemptedTests: attemptedTestsWithAnalytics,
    availableTests,
    overallStats: {
      totalAvailable: availableTests.length,
      totalAttempted: totalTestsAttempted,
      totalCompleted: totalTestsCompleted,
      totalInProgress: totalTestsInProgress,
    },
  });
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


function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Hey Night Owl";
}


// 🧩 Component
export default function StudentDashboard() {
  const { user, availableTests, attemptedTests, overallStats } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#142E29] to-[#031B1D] p-6 md:p-10 text-white/85">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {getGreeting()}, {user?.name || "Student"} 
          </h1>
          <p className="text-sm text-emerald-300 mt-1">{user?.email}</p>
        </div>

        <Form method="post">
          <button
            type="submit"
            className="px-4 py-2 rounded-[10px] transition bg-gradient-to-r from-emerald-700 to-emerald-500 text-white/85"
          >
            Logout
          </button>
        </Form>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-6 relative z-10 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20">
          <div className="flex w-full justify-between">
            <p className="text-sm text-emerald-400 font-semibold">Completed</p>
            <svg xmlns="http://www.w3.org/2000/svg" className="text-emerald-400" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM208,208V48H48V208H208Z"></path></svg>
          </div>
          <p className="text-3xl text-emerald-400 font-bold">
            {overallStats.totalCompleted}
          </p>
        </div>

        <div className="bg-[#0C1219]/85 border border-emerald-400 rounded-lg p-6 relative z-10 transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/20">
          <div className="flex w-full justify-between">
            <p className="text-sm text-emerald-400 font-semibold">Total Attempted</p>
            <svg xmlns="http://www.w3.org/2000/svg" className="text-emerald-400" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.6A16.05,16.05,0,0,0,200,75.64ZM72,40H184V75.64L178.23,80H77.33L72,76Zm56,78L98.67,96h58.4Zm56,98H72V180l48-36v24a8,8,0,0,0,16,0V144.08l48,36.28Z"></path></svg>
          </div>
          <p className="text-3xl text-emerald-400 font-bold">
            {overallStats.totalAttempted}
          </p>
        </div>
      </div>

      {/* MY TESTS */}
      <section>
        <h2 className="text-2xl font-semibold mb-5 text-gray-200">
          My Tests
        </h2>

        {attemptedTests.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {attemptedTests.map((test: any) => {
              const { analytics } = test;
              const isDone = analytics.isSubmitted;

              return (
                <div
                  key={test.testId}
                  className="rounded-2xl bg-[#0C1219]/85 backdrop-blur-lg p-6 transition"
                >
                  {/* Title + Status */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-emerald-400">
                      {test.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-lg font-medium ${
                        isDone
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {isDone ? "Completed" : "Attempted"}
                    </span>
                  </div>

                  <p className="text-sm text-white/85 line-clamp-2 mb-4">
                    {test.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-3">
                    <p className="flex flex-col text-xs text-white/85 mb-1">
                      <span>Attempted Questions:</span>
                      <span className="italic pt-2 text-[11px] text-white/85 mb-1">{isDone ? "" : "Answers don't get marked if test not submitted"}</span>
                    </p>
                    <p className="text-xl font-bold text-emerald-400">
                      {analytics.answeredQuestions}/{analytics.totalQuestions}
                    </p>
                  </div>

                  <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                    <div
                      className={"h-2 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500"}
                      style={{
                        width: `${analytics.completionPercentage}%`,
                      }}
                    />
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-white/85 flex items-center mb-4">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>

                    {isDone && analytics.submittedAt ? (
                      <span>
                        Submitted:{" "}
                        {new Date(
                          analytics.submittedAt
                        ).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>
                        Started: {new Date(test.joinedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Continue Button */}
                  {/* {!isDone && (
                    <Link
                      to={`/start-test/${test.testId}`}
                      className="block text-center bg-yellow-500/90 hover:bg-yellow-600 text-black font-semibold py-2 rounded-xl transition"
                    >
                      Continue Test
                    </Link>
                  )} */}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl p-10 bg-[#0C1219]/80 text-center border border-white/10">
            <p className="text-gray-300">You haven’t attempted any tests yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}