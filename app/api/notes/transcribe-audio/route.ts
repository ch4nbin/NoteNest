import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint to transcribe audio using Gemini
 * Accepts audio file (base64 or FormData) and returns transcript
 */
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
    console.log("[Transcribe API] Received transcription request")
    
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      console.error("[Transcribe API] No audio file provided")
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log(`[Transcribe API] Audio file received: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`)

    if (audioFile.size === 0) {
      console.error("[Transcribe API] Audio file is empty")
      return NextResponse.json({ error: "Audio file is empty" }, { status: 400 })
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = audioFile.type || "audio/webm"

    console.log(`[Transcribe API] Converted to base64: ${base64Audio.length} chars, mimeType: ${mimeType}`)

    if (!process.env.GEMINI_API_KEY) {
      console.error("[Transcribe API] GEMINI_API_KEY is not set")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    console.log("[Transcribe API] Calling Gemini API...")
    
    // Try models with available quota (unused models from your list)
    // Priority: models with highest limits first
    const modelsToTry = [
      { name: "gemini-2.0-flash-lite", version: "v1beta" }, // 0/30 RPM, 0/200 RPD
      { name: "gemini-2.5-flash-lite", version: "v1beta" }, // 0/15 RPM, 0/1K RPD
      { name: "gemini-2.0-flash", version: "v1beta" }, // 0/15 RPM, 0/200 RPD
      { name: "gemini-2.5-flash", version: "v1beta" }, // 5/10 RPM, 5/250 RPD (has some usage but might work)
    ]
    
    let lastError: any = null
    let geminiResponse: Response | null = null
    let geminiData: any = null
    
    // Try each model until one works
    for (const modelConfig of modelsToTry) {
      try {
        console.log(`[Transcribe API] Trying model: ${modelConfig.name} (${modelConfig.version})`)
        
        geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/${modelConfig.version}/models/${modelConfig.name}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Transcribe this audio recording. Return ONLY the spoken words and dialogue. Do not include sound descriptions like [Music], [Sound of...], or any other audio identifiers. Do not include introductory phrases like 'Okay, here is the transcription' or 'Here is the transcript'. Just return the actual spoken content with proper punctuation and paragraph breaks.",
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Audio,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            }),
          },
        )

        console.log(`[Transcribe API] Model ${modelConfig.name} response status: ${geminiResponse.status}`)

        if (geminiResponse.ok) {
          geminiData = await geminiResponse.json()
          console.log(`[Transcribe API] Model ${modelConfig.name} succeeded!`)
          break // Success, exit loop
        } else {
          const errorText = await geminiResponse.text()
          console.warn(`[Transcribe API] Model ${modelConfig.name} failed:`, errorText.substring(0, 200))
          
          // Check for rate limit - stop trying if rate limited
          if (geminiResponse.status === 429) {
            lastError = { 
              model: modelConfig.name, 
              version: modelConfig.version, 
              status: 429,
              error: "Rate limit exceeded",
              retryAfter: geminiResponse.headers.get("Retry-After") || "60"
            }
            break // Stop trying other models if rate limited
          }
          
          lastError = { 
            model: modelConfig.name, 
            version: modelConfig.version, 
            status: geminiResponse.status, 
            error: errorText 
          }
          // Continue to next model
        }
      } catch (err) {
        lastError = { 
          model: modelConfig.name, 
          version: modelConfig.version, 
          error: err instanceof Error ? err.message : String(err) 
        }
        console.warn(`[Transcribe API] Model ${modelConfig.name} exception:`, err)
        // Continue to next model
      }
    }
    
    // If all models failed
    if (!geminiResponse || !geminiResponse.ok) {
      console.error("[Transcribe API] All models failed. Last error:", lastError)
      
      if (lastError?.status === 429) {
        return NextResponse.json(
          { 
            error: "Rate limit exceeded", 
            details: "You've reached the API rate limit. Please wait a moment or set up billing to increase limits.",
            status: 429,
            retryAfter: lastError.retryAfter
          },
          { status: 429 },
        )
      }
      
      return NextResponse.json(
        { 
          error: "Failed to transcribe audio with any available model", 
          details: lastError,
          tried_models: modelsToTry.map(m => `${m.name} (${m.version})`)
        },
        { status: 500 },
      )
    }

    // geminiData should already be set from the successful model
    if (!geminiData) {
      return NextResponse.json(
        { error: "No response from Gemini API" },
        { status: 500 },
      )
    }
    
    console.log("[Transcribe API] Gemini response received:", JSON.stringify(geminiData).substring(0, 200))

    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts) {
      console.error("[Transcribe API] Invalid response structure:", geminiData)
      return NextResponse.json({ 
        error: "Invalid response from Gemini API",
        details: JSON.stringify(geminiData)
      }, { status: 500 })
    }

    let transcript = geminiData.candidates[0].content.parts[0].text
    console.log(`[Transcribe API] Transcript extracted: ${transcript.length} characters`)

    // Remove common acknowledgment messages and introductory phrases
    const unwantedPhrases = [
      "Okay, I'm ready. Please provide the audio recording. I will do my best to transcribe it accurately and cleanly.",
      "Okay, here is the transcription of the audio recording:",
      "Here is the transcription of the audio recording:",
      "Here is the transcript:",
      "Okay, here is the transcription:",
      "Transcription:",
      "Transcript:",
      "Okay, I'm ready. Please provide the audio recording.",
      "I'm ready. Please provide the audio recording.",
      "Please provide the audio recording.",
      "I will do my best to transcribe it accurately and cleanly.",
    ]
    
    for (const phrase of unwantedPhrases) {
      transcript = transcript.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
    }
    
    // Remove sound identifiers and audio descriptions in brackets
    // Examples: [Music], [Sound of car engine], [Applause], etc.
    transcript = transcript.replace(/\[.*?\]/g, '').trim()
    
    // Remove patterns like "(Sound of...)" or "(Music playing)"
    transcript = transcript.replace(/\(Sound of[^)]*\)/gi, '').trim()
    transcript = transcript.replace(/\(Music[^)]*\)/gi, '').trim()
    transcript = transcript.replace(/\([^)]*sound[^)]*\)/gi, '').trim()
    
    // Remove duplicate lines (consecutive identical lines)
    const lines = transcript.split('\n')
    const deduplicatedLines: string[] = []
    let lastLine = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      // Only add if it's different from the last line and not empty
      if (trimmedLine && trimmedLine !== lastLine) {
        deduplicatedLines.push(trimmedLine)
        lastLine = trimmedLine
      }
    }
    
    transcript = deduplicatedLines.join('\n')
    
    // Clean up multiple spaces (but preserve newlines for paragraphs)
    transcript = transcript.replace(/[ \t]+/g, ' ').trim() // Replace multiple spaces/tabs with single space
    transcript = transcript.replace(/\n\s*\n\s*\n+/g, '\n\n').trim() // Replace 3+ newlines with 2
    transcript = transcript.replace(/^\s+|\s+$/gm, '') // Trim each line

    if (!transcript || transcript.trim().length === 0) {
      console.warn("[Transcribe API] Empty transcript received")
      return NextResponse.json({
        transcript: "",
        warning: "No speech detected in audio",
        duration: audioFile.size,
      })
    }

    return NextResponse.json({
      transcript,
      duration: audioFile.size,
    })
  } catch (error) {
    console.error("[Transcribe API] Error transcribing audio:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[Transcribe API] Error stack:", errorStack)
    
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio", 
        details: errorMessage,
        stack: errorStack 
      },
      { status: 500 },
    )
  }
}
