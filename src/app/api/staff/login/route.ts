// Staff login is now handled by Supabase Auth directly from the client.
// This endpoint is no longer used.
export async function POST() {
  return Response.json({ error: "Use Supabase Auth directly" }, { status: 410 });
}
