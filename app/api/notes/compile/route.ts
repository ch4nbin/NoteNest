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
            content: `Compile these ${notes.length} notes into one comprehensive note:\n\n${notes.map((note, i) => `Note ${i + 1}: ${note.title}\n${JSON.stringify(note.content)}\n\n`).join("")}\n\nProvide the output as a JSON object with this structure: { "title": "compiled title", "sections": [{ "title": "section name", "content": "section content" }] }`,
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

    // Save the compiled note
    const { data: compiledNote, error: saveError } = await supabase
      .from("compiled_notes")
      .insert({
        user_id: user.id,
        title: compiledContent.title,
        content: { sections: compiledContent.sections },
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
