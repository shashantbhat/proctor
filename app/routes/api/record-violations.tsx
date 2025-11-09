export const action = async ({ request }: { request: Request }) => {
  const data = await request.json();
  console.log("Violation:", data);
  return Response.json({ success: true });
};