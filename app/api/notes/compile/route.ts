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

  const { noteIds } = await request.json()

  if (!noteIds || noteIds.length < 2) {
    return NextResponse.json({ error: "At least 2 notes required" }, { status: 400 })
  }

  // Fetch the notes
  const { data: notes, error: notesError } = await supabase.from("notes").select("*").in("id", noteIds)

  if (notesError || !notes) {
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }

  // Use Grok AI to compile the notes
  try {
    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at synthesizing multiple sets of notes into a comprehensive, well-organized compiled note. Combine the key information, remove redundancies, and present it in a clear structure with sections.",
          },
          {
            role: "user",
            content: `Compile these ${notes.length} notes into one comprehensive note:\n\n${notes.map((note, i) => `Note ${i + 1} (ID: ${note.id}): ${note.title}\n${JSON.stringify(note.content)}\n\n`).join("")}\n\nProvide the output as a JSON object with this structure: { "title": "compiled title", "sections": [{ "title": "section name", "content": "section content", "source_note_ids": ["note-id-1", "note-id-2"] }] }. For each section, include a "source_note_ids" array containing the IDs of the notes that contributed to that section. If a section draws from multiple notes, include all relevant note IDs.`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!grokResponse.ok) {
      throw new Error("Grok AI request failed")
    }

    const grokData = await grokResponse.json()
    const compiledContent = JSON.parse(grokData.choices[0].message.content)

    // Check if a compiled note with the same source_note_ids was created very recently (within last 10 seconds)
    // This prevents duplicates from cancelled requests that still complete
    const sortedNoteIds = [...noteIds].sort()
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()
    
    const { data: recentCompiledNotes, error: checkError } = await supabase
      .from("compiled_notes")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", tenSecondsAgo)
      .order("created_at", { ascending: false })

    if (!checkError && recentCompiledNotes) {
      // Check if any recent compiled note has the same source_note_ids (order-independent)
      const duplicate = recentCompiledNotes.find((note) => {
        const noteSourceIds = [...(note.source_note_ids || [])].sort()
        return JSON.stringify(noteSourceIds) === JSON.stringify(sortedNoteIds)
      })

      if (duplicate) {
        // Return the existing note instead of creating a duplicate
        return NextResponse.json({ success: true, note: duplicate, isDuplicate: true })
      }
    }

    // Ensure each section has source_note_ids (fallback to all note IDs if not provided)
    const sectionsWithCitations = compiledContent.sections.map((section: any) => ({
      ...section,
      source_note_ids: section.source_note_ids || noteIds, // Fallback to all notes if AI didn't specify
    }))

    // Save the compiled note
    const { data: compiledNote, error: saveError } = await supabase
      .from("compiled_notes")
      .insert({
        user_id: user.id,
        title: compiledContent.title,
        content: { sections: sectionsWithCitations },
        source_note_ids: noteIds,
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: "Failed to save compiled note" }, { status: 500 })
    }

    return NextResponse.json({ success: true, note: compiledNote })
  } catch (error) {
    console.error("Error compiling notes:", error)
    return NextResponse.json({ error: "Failed to compile notes" }, { status: 500 })
  }
}
