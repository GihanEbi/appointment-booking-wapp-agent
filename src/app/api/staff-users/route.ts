import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const staff = (data.users ?? [])
    .filter((u) =>
      u.app_metadata?.role === "staff" &&
      u.app_metadata?.managed_by === user.id
    )
    .map((u) => ({
      id: u.id,
      name: (u.user_metadata?.full_name as string) ?? "",
      email: u.email ?? "",
      bio: (u.user_metadata?.bio as string) ?? "",
      is_active: u.app_metadata?.is_active ?? true,
      created_at: u.created_at,
    }));

  return Response.json(staff);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, email, password, bio } = body;

  if (!name || !email || !password) {
    return Response.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: (email as string).toLowerCase().trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: name, bio: bio ?? "" },
    app_metadata: { role: "staff", managed_by: user.id, is_active: true },
  });

  if (createError) return Response.json({ error: createError.message }, { status: 500 });

  return Response.json({
    id: created.user.id,
    name,
    email: created.user.email ?? email,
    bio: bio ?? "",
    is_active: true,
    created_at: created.user.created_at,
  }, { status: 201 });
}
