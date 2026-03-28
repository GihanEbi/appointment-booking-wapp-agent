// Staff logout is now handled by Supabase Auth signOut() on the client.
// This endpoint is no longer used.
export async function POST() {
  return Response.json({ ok: true });
}
