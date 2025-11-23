import { Form, useNavigate, useParams } from "react-router";
import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { createTest } from "~/server/create-test";
import { useState } from "react";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const durationMinutes = formData.get("durationMinutes") as string; // ✅ new field

  const teacherId = params.id;
  if (!teacherId) throw new Error("Missing teacher ID in route params.");

  await createTest({ title, description, teacherId, durationMinutes });
  return redirect(`/teacher-dash/${teacherId}`);
};

export default function NewTest() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isFormActive, setIsFormActive] = useState(false);

  return (
    <section className="text-white/85 bg-gradient-to-b from-[#142E29] to-[#031B1D] min-h-screen w-full flex items-center justify-center p-4 fixed inset-0">
      {/* Glass Card */}
      <img
          src="https://qblapbmmhjyxpoeyhjrf.supabase.co/storage/v1/object/public/question-images/assets/bg-grad-get-started.png"
          className={`
            w-full h-full object-contain absolute inset-0 scale-75
            transition-opacity duration-500 
            pointer-events-none
            ${isFormActive ? 'opacity-100' : 'opacity-0'}
          `}
        />
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl"
          onMouseEnter={() => setIsFormActive(true)}
          onMouseLeave={() => setIsFormActive(false)}
        >
        
        <h1 className="text-2xl font-semibold text-white/85 mb-6 text-center">
          Create New Test
        </h1>

        <Form method="post" className="flex flex-col gap-4 !text-sm">
          <input type="hidden" name="teacherId" value={id} />

          {/* Title */}
          <input
            name="title"
            placeholder="Test Title"
            required
            className="bg-white/10 border border-white/20 text-white/85 placeholder-white/60 rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-400 outline-none"
          />

          {/* Description */}
          <textarea
            name="description"
            placeholder="Description"
            required
            rows={3}
            className="bg-white/10 border border-white/20 text-white/85 placeholder-white/60 rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-400 outline-none"
          />

          {/* Duration */}
          <input
            name="durationMinutes"
            type="number"
            placeholder="Duration (in minutes)"
            min="1"
            required
            className="bg-white/10 border border-white/20 text-white/85 placeholder-white/60 rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-400 outline-none"
          />

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-500 text-white/85 font-semibold py-3 rounded-xl transition-all shadow-lg"
          >
            Create Test
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-white/85 border border-emerald-400 hover:bg-emerald-500 text-sm text-center py-3 rounded-xl"
          >
            Cancel
          </button>
        </Form>
      </div>
    </section>
  );
}