import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { name, bio, password, is_active } = body;

  const service = createServiceClient();

  // Verify this staff user is managed by the calling admin
  const { data: target } = await service.auth.admin.getUserById(id);
  if (!target.user || target.user.app_metadata?.managed_by !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const update: Parameters<typeof service.auth.admin.updateUserById>[1] = {};

  if (password) update.password = password;

  if (name !== undefined || bio !== undefined) {
    update.user_metadata = {
      ...target.user.user_metadata,
      ...(name !== undefined ? { full_name: name } : {}),
      ...(bio  !== undefined ? { bio }            : {}),
    };
  }

  if (is_active !== undefined) {
    update.app_metadata = {
      ...target.user.app_metadata,
      is_active,
    };
  }

  const { data: updated, error } = await service.auth.admin.updateUserById(id, update);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    id: updated.user.id,
    name: (updated.user.user_metadata?.full_name as string) ?? "",
    email: updated.user.email ?? "",
    bio: (updated.user.user_metadata?.bio as string) ?? "",
    is_active: updated.user.app_metadata?.is_active ?? true,
    created_at: updated.user.created_at,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();

  // Verify ownership before deleting
  const { data: target } = await service.auth.admin.getUserById(id);
  if (!target.user || target.user.app_metadata?.managed_by !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
