import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Find the doc to get its storage path
  const { data: doc, error: findError } = await supabase
    .from("training_docs")
    .select("file_path")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (findError || !doc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const serviceClient = createServiceClient();

  // Delete all chunks that share the same file_path (all chunks of this file)
  const { error: deleteError } = await serviceClient
    .from("training_docs")
    .delete()
    .eq("file_path", doc.file_path)
    .eq("profile_id", user.id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  // Remove the file from Storage
  await serviceClient.storage.from("training-docs").remove([doc.file_path]);

  return Response.json({ success: true });
}
