import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = supabase
    .from("appointments")
    .select("*")
    .eq("profile_id", user.id)
    .order("scheduled_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status.toLowerCase());
  }
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,service.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { customer_name, customer_phone, service, scheduled_at, notes } = body;

  if (!customer_name || !customer_phone || !service || !scheduled_at) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      profile_id: user.id,
      customer_name,
      customer_phone,
      service,
      scheduled_at,
      notes,
      status: "pending",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
