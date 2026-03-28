import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "staff") {
    return Response.json({ error: "Not a staff account" }, { status: 403 });
  }

  return Response.json({
    id: user.id,
    name: user.user_metadata?.full_name ?? user.email ?? "",
    email: user.email ?? "",
    bio: user.user_metadata?.bio ?? "",
    is_active: user.app_metadata?.is_active ?? true,
  });
}
