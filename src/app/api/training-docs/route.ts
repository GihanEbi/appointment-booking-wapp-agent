// SETUP: Create a private Storage bucket named "training-docs" in your
// Supabase Dashboard → Storage → New bucket (toggle off Public).

import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// Must run in Node.js to use pdf-parse and openai
export const runtime = "nodejs";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function chunkText(text: string, maxChars = 800): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 30);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [];
}

async function generateEmbedding(openai: OpenAI, text: string): Promise<number[] | null> {
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // token safety cap
    });
    return res.data[0].embedding;
  } catch {
    return null;
  }
}

// ── GET /api/training-docs ─────────────────────────────────────────
// Returns one row per file (chunk_index = 0 to avoid duplicates)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("training_docs")
    .select("id, file_name, file_path, file_size, uploaded_at")
    .eq("profile_id", user.id)
    .eq("chunk_index", 0)
    .order("uploaded_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

// ── POST /api/training-docs ────────────────────────────────────────
// Expects multipart/form-data with a "file" field (PDF, DOC, DOCX)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const serviceClient = createServiceClient();

  // 1. Upload to Supabase Storage
  const { error: storageError } = await serviceClient.storage
    .from("training-docs")
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (storageError) {
    return Response.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
  }

  // 2. Parse PDF text (graceful failure for non-PDFs)
  let chunks: string[] = [];
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    try {
      // pdf-parse is CJS; use require to avoid ESM/bundling conflicts in Node.js runtime
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(fileBuffer);
      chunks = chunkText(parsed.text);
    } catch {
      // Not parseable — store the filename as a single chunk
    }
  }
  if (chunks.length === 0) chunks = [file.name];

  // 3. Generate embeddings per chunk (skipped if no API key)
  const openai = getOpenAI();
  const rows = await Promise.all(
    chunks.map(async (chunk, i) => ({
      profile_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      chunk_index: i,
      content: chunk,
      embedding: openai ? await generateEmbedding(openai, chunk) : null,
      uploaded_at: new Date().toISOString(),
    }))
  );

  // 4. Insert all chunks into training_docs
  const { data: inserted, error: insertError } = await serviceClient
    .from("training_docs")
    .insert(rows)
    .select("id")
    .limit(1)
    .single();

  if (insertError) {
    // Roll back storage upload if DB insert fails
    await serviceClient.storage.from("training-docs").remove([filePath]);
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({
    data: {
      id: inserted.id,
      file_name: file.name,
      file_size: file.size,
      file_path: filePath,
      uploaded_at: rows[0].uploaded_at,
    },
  });
}
