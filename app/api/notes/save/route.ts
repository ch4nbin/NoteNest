import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, content, tags, source_url, source_type, is_public } = await request.json()

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title,
      content,
      tags,
      source_url,
      source_type,
      is_public,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving note:", error)
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 })
  }

  return NextResponse.json({ success: true, note })
}
