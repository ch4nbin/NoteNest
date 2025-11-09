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

  // Validate input
  if (!text || (typeof text !== "string" && typeof text !== "object")) {
    return NextResponse.json(
      { error: "Invalid text input. Text is required." },
      { status: 400 }
    )
  }

  // Check for API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("[TTS] ELEVENLABS_API_KEY is not set")
    return NextResponse.json(
      { error: "Text-to-speech service is not configured. Please add ELEVENLABS_API_KEY to your environment variables." },
      { status: 500 }
    )
  }

  try {
    // Convert JSON content to readable text
    let readableText = ""
    
    // If text is already a string, try to parse it as JSON first
    if (typeof text === "string") {
      try {
        const content = JSON.parse(text)
        // If parsing succeeded, check if it's an object with sections
        if (content && typeof content === "object" && content.sections && Array.isArray(content.sections)) {
          readableText = content.sections
            .map((section: { title: string; content: string }) => `${section.title}. ${section.content}`)
            .join(". ")
        } else if (typeof content === "string") {
          // If parsed content is a string, use it
          readableText = content
        } else {
          // If it's some other object, stringify it
          readableText = JSON.stringify(content)
        }
      } catch {
        // If parsing fails, use the text as-is
        readableText = text
      }
    } else {
      // If text is already an object, handle it directly
      if (text.sections && Array.isArray(text.sections)) {
        readableText = text.sections
          .map((section: { title: string; content: string }) => `${section.title}. ${section.content}`)
          .join(". ")
      } else {
        readableText = JSON.stringify(text)
      }
    }

    if (!readableText || readableText.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content to convert to speech" },
        { status: 400 }
      )
    }

    console.log(`[TTS] Generating audio for text (${readableText.slice(0, 100).length} chars)...`)

    // Call ElevenLabs API
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: readableText.slice(0, 2500), // Limit to 2500 chars for free tier
        model_id: "eleven_turbo_v2_5", // Fast, multilingual model (recommended for free tier)
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "ElevenLabs API request failed"
      
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.detail?.message || errorData.message || errorText
        console.error("[TTS] ElevenLabs API error:", errorData)
      } catch {
        console.error("[TTS] ElevenLabs API error (raw):", errorText)
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
      }
      
      return NextResponse.json(
        { 
          error: "Failed to generate audio",
          details: errorMessage,
          status: response.status
        },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Received empty audio response from ElevenLabs" },
        { status: 500 }
      )
    }
    
    console.log(`[TTS] Successfully generated audio (${audioBuffer.byteLength} bytes)`)

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
    console.error("[TTS] Error generating TTS:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: "Failed to generate audio",
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
