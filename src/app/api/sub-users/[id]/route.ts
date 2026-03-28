import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/staff-password";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, email, password, bio, is_active } = body;

  const update: Record<string, unknown> = {};
  if (name     !== undefined) update.name      = name;
  if (email    !== undefined) update.email     = email;
  if (bio      !== undefined) update.bio       = bio;
  if (is_active !== undefined) update.is_active = is_active;
  if (password)               update.password  = hashPassword(password);

  const { data, error } = await supabase
    .from("sub_users")
    .update(update)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id, name, email, bio, is_active, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("sub_users")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
