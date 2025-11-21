import { supabase } from "~/lib/supabase";

export async function uploadQuestionImage(file: File, questionId: string) {
  const path = `questions/${questionId}/${file.name}`;

  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error("Upload failed:", error);
    return null;
  }

  const { data } = supabase.storage
    .from("question-images")
    .getPublicUrl(path);

  return data.publicUrl;
}