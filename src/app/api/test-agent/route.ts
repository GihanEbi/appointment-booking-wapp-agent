import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTestAgentTurn } from "@/lib/ai-agent";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message, history = [] } = body as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const reply = await runTestAgentTurn(user.id, message.trim(), history);
  return Response.json({ reply });
}
