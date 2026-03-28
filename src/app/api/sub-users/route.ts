import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/staff-password";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sub_users")
    .select("id, name, email, bio, is_active, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // Table may not exist yet — return empty array so the UI still renders
  if (error) return Response.json([]);
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, email, password, bio } = body;

  if (!name || !email || !password) {
    return Response.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sub_users")
    .insert({
      profile_id: user.id,
      name,
      email: email.toLowerCase().trim(),
      password: hashPassword(password),
      bio: bio || "",
      is_active: true,
    })
    .select("id, name, email, bio, is_active, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
