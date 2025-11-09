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

    // Combine the most relevant tags from source notes
    const tagCounts: Record<string, number> = {}
    
    // Count tag frequency across all source notes
    notes.forEach((note) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })

    // Sort tags by frequency (most common first) and take the top tags
    // Prioritize tags that appear in multiple notes (more relevant)
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => {
        // First sort by frequency (descending)
        if (b[1] !== a[1]) {
          return b[1] - a[1]
        }
        // If same frequency, sort alphabetically
        return a[0].localeCompare(b[0])
      })
      .map(([tag]) => tag)

    // Take the most relevant tags (up to 5, or all if less than 5)
    // Prefer tags that appear in at least 2 notes, but include top tags even if they only appear once
    const compiledTags = sortedTags
      .filter((tag, index) => {
        const count = tagCounts[tag]
        // Include if it appears in multiple notes, or if it's in the top 5
        return count > 1 || index < 5
      })
      .slice(0, 5) // Limit to 5 tags max

    console.log("[Compile] Combined tags from source notes:", compiledTags)

    console.log("[Compile] Final tags to save:", compiledTags)

    // Save the compiled note
    // Try with tags first, if that fails (column might not exist), try without tags
    let compiledNote
    let saveError
    
    const insertData: any = {
      user_id: user.id,
      title: compiledContent.title,
      content: { sections: sectionsWithCitations },
      source_note_ids: noteIds,
    }

    // Always try to insert with tags - ensure tags is always an array
    const tagsToSave = Array.isArray(compiledTags) && compiledTags.length > 0 ? compiledTags : []
    console.log("[Compile] Inserting with tags:", tagsToSave)
    
    const { data: noteWithTags, error: errorWithTags } = await supabase
      .from("compiled_notes")
      .insert({
        ...insertData,
        tags: tagsToSave,
      })
      .select()
      .single()

    if (errorWithTags) {
      console.warn("[Compile] Failed to insert with tags, trying without tags:", errorWithTags.message)
      console.warn("[Compile] Error details:", JSON.stringify(errorWithTags, null, 2))
      // If tags column doesn't exist, try without it
      const { data: noteWithoutTags, error: errorWithoutTags } = await supabase
        .from("compiled_notes")
        .insert(insertData)
        .select()
        .single()
      
      compiledNote = noteWithoutTags
      saveError = errorWithoutTags
      
      if (!errorWithoutTags) {
        console.warn("[Compile] Note saved without tags - tags column may not exist in database")
      }
    } else {
      compiledNote = noteWithTags
      saveError = null
      console.log("[Compile] Note saved successfully with tags:", noteWithTags?.tags)
    }

    if (saveError) {
      console.error("[Compile] Database save error:", saveError)
      return NextResponse.json(
        { 
          error: "Failed to save compiled note",
          details: saveError.message || String(saveError)
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, note: compiledNote })
  } catch (error) {
    console.error("[Compile] Error compiling notes:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Compile] Error details:", errorMessage)
    return NextResponse.json(
      { 
        error: "Failed to compile notes",
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
