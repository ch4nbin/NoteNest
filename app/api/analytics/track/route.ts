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

  const { noteId, action, timeSpent } = await request.json()

  try {
    // Update or create analytics entry
    const { data: existing } = await supabase
      .from("note_analytics")
      .select("*")
      .eq("note_id", noteId)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      const updates: any = { updated_at: new Date().toISOString() }

      if (action === "view") {
        updates.view_count = (existing.view_count || 0) + 1
        updates.last_viewed_at = new Date().toISOString()
      }

      if (action === "qna") {
        updates.qna_count = (existing.qna_count || 0) + 1
      }

      if (timeSpent) {
        updates.time_spent_seconds = (existing.time_spent_seconds || 0) + timeSpent
      }

      await supabase.from("note_analytics").update(updates).eq("id", existing.id)
    } else {
      await supabase.from("note_analytics").insert({
        note_id: noteId,
        user_id: user.id,
        view_count: action === "view" ? 1 : 0,
        qna_count: action === "qna" ? 1 : 0,
        time_spent_seconds: timeSpent || 0,
        last_viewed_at: action === "view" ? new Date().toISOString() : null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking analytics:", error)
    return NextResponse.json({ error: "Failed to track analytics" }, { status: 500 })
  }
}
