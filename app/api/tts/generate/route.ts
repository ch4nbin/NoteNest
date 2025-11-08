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

  const { text, noteId } = await request.json()

  try {
    // Convert JSON content to readable text
    let readableText = ""
    try {
      const content = JSON.parse(text)
      if (content.sections && Array.isArray(content.sections)) {
        readableText = content.sections
          .map((section: { title: string; content: string }) => `${section.title}. ${section.content}`)
          .join(". ")
      } else {
        readableText = text
      }
    } catch {
      readableText = text
    }

    // Call ElevenLabs API
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: readableText.slice(0, 2500), // Limit to 2500 chars for free tier
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      throw new Error("ElevenLabs API request failed")
    }

    const audioBuffer = await response.arrayBuffer()

    // Track analytics
    if (noteId) {
      await supabase.from("note_analytics").upsert(
        {
          note_id: noteId,
          user_id: user.id,
          view_count: 1,
          time_spent_seconds: 0,
        },
        {
          onConflict: "note_id,user_id",
        },
      )
    }

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Error generating TTS:", error)
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 })
  }
}
