import { Form, useParams } from "react-router";
import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/src";
import { testParticipants } from "~/src/db/schema";
import { getUserSession } from "~/server/session.server";
import { useState } from "react";

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
  const [isFormActive, setIsFormActive] = useState(false);

  return (
    <div className="w-screen h-screen relative bg-gradient-to-b from-[#142E29] to-[#031B1D]">
      {/* Form Container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        
        {/* Gradient Background (shows on hover) */}
        <img
          src="https://qblapbmmhjyxpoeyhjrf.supabase.co/storage/v1/object/public/question-images/assets/bg-grad-get-started.png"
          className={`
            w-full h-full object-contain absolute inset-0
            transition-opacity duration-500 
            pointer-events-none
            ${isFormActive ? 'opacity-100' : 'opacity-0'}
          `}
        />

        <div 
          className="bg-white/85 shadow-md rounded-2xl p-8 w-full max-w-md backdrop-blur-md bg-opacity-90 relative z-10"
          onMouseEnter={() => setIsFormActive(true)}
          onMouseLeave={() => setIsFormActive(false)}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">
            Enter Your Details
          </h2>

          <Form method="post" className="flex flex-col gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                placeholder="Enter your full name"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Enrollment Number */}
            <div>
              <label htmlFor="enrollmentNo" className="block text-sm font-medium mb-1">
                Enrollment Number
              </label>
              <input
                type="text"
                name="enrollmentNo"
                id="enrollmentNo"
                required
                placeholder="Enter enrollment number"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Semester */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium mb-1">
                Semester
              </label>
              <input
                type="text"
                name="semester"
                id="semester"
                required
                placeholder="Enter semester"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Batch */}
            <div>
              <label htmlFor="batch" className="block text-sm font-medium mb-1">
                Batch
              </label>
              <input
                type="text"
                name="batch"
                id="batch"
                required
                placeholder="Enter batch"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Branch */}
            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1">
                Branch
              </label>
              <input
                type="text"
                name="branch"
                id="branch"
                required
                placeholder="Enter branch"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email ID
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                placeholder="Enter your email"
                className="w-full p-2 border-1 border-gray-400 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2 font-semibold text-white rounded-lg transition-all bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 hover:shadow-lg mt-2"
            >
              Start Test
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}