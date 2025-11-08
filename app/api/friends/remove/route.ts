import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

  try {
    const { friendId } = await request.json()

    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // STEP 1: Get all notes belonging to this friend
    const { data: friendNotes, error: notesError } = await adminClient
      .from("notes")
      .select("id")
      .eq("user_id", friendId)

    if (notesError) {
      console.error("Error fetching friend's notes:", notesError)
    }

    const friendNoteIds = friendNotes?.map((note) => note.id) || []

    // STEP 2: If friend has notes, update compiled notes to remove references
    if (friendNoteIds.length > 0) {
      // Fetch all compiled notes for current user
      const { data: allCompiledNotes, error: fetchError } = await adminClient
        .from("compiled_notes")
        .select("id, content, source_note_ids")
        .eq("user_id", user.id)

      if (!fetchError && allCompiledNotes) {
        // Filter to only those that reference any of the friend's notes
        const compiledNotesToUpdate = allCompiledNotes.filter((cn) =>
          cn.source_note_ids?.some((id: string) => friendNoteIds.includes(id)),
        )

        // Update each compiled note
        for (const compiledNote of compiledNotesToUpdate) {
          // Remove friend's note IDs from top-level source_note_ids
          const updatedSourceNoteIds = (compiledNote.source_note_ids || []).filter(
            (id: string) => !friendNoteIds.includes(id),
          )

          // Remove friend's note IDs from each section's source_note_ids
          const updatedSections = compiledNote.content?.sections?.map((section: any) => ({
            ...section,
            source_note_ids: (section.source_note_ids || []).filter(
              (id: string) => !friendNoteIds.includes(id),
            ),
          }))

          // Update the compiled note
          await adminClient
            .from("compiled_notes")
            .update({
              content: { sections: updatedSections },
              source_note_ids: updatedSourceNoteIds,
            })
            .eq("id", compiledNote.id)
        }
      }
    }

    // STEP 3: Delete both friendship records (bidirectional) using admin client
    // This ensures the friend is removed from both users' friends lists
    const { error: deleteError1, data: deleted1 } = await adminClient
      .from("friendships")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", friendId)
      .select()

    const { error: deleteError2, data: deleted2 } = await adminClient
      .from("friendships")
      .delete()
      .eq("user_id", friendId)
      .eq("friend_id", user.id)
      .select()

    if (deleteError1 || deleteError2) {
      console.error("Error removing friend:", deleteError1 || deleteError2)
      if (deleteError1) console.error("Error deleting friendship (user -> friend):", deleteError1)
      if (deleteError2) console.error("Error deleting friendship (friend -> user):", deleteError2)
      return NextResponse.json({
        error: "Failed to remove friend",
        details: deleteError1 || deleteError2,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Friend removed successfully from both sides",
      deleted: {
        fromYou: deleted1?.length || 0,
        fromThem: deleted2?.length || 0,
      },
    })
  } catch (error) {
    console.error("Error removing friend:", error)
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 })
  }
}

