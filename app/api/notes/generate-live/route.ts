import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint for live note generation from transcript chunks
 * Accepts transcript chunks and existing notes, returns incremental note updates
 * Uses Gemini to generate/update notes with context awareness
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { transcriptChunk, existingNotes, meetingTitle } = await request.json()

  if (!transcriptChunk || typeof transcriptChunk !== "string") {
    return new Response(JSON.stringify({ error: "Transcript chunk is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build context from existing notes
        const existingContext = existingNotes && existingNotes.length > 0
          ? existingNotes.map((note: { title: string; content: string }, idx: number) => 
              `Section ${idx + 1}: ${note.title}\n${note.content}`
            ).join("\n\n")
          : "No existing notes yet."

        // Prompt: prioritize updating existing sections, only create new ones for truly distinct topics
        const prompt = existingNotes && existingNotes.length > 0
          ? `You are summarizing a meeting transcript chunk. Your goal is to CONSOLIDATE content into fewer, well-organized sections.

EXISTING NOTES:
${existingContext}

NEW TRANSCRIPT CHUNK:
${transcriptChunk}

IMPORTANT INSTRUCTIONS:
1. STRONGLY prefer updating existing sections over creating new ones
2. Only create a new section if the chunk discusses a COMPLETELY different topic that doesn't fit any existing section
3. When updating, add the new information to the existing section's content (append, don't replace)
4. Group related topics together - don't create micro-sections for every small detail
5. Aim for 3-6 total sections maximum - consolidate similar topics

Return ONLY a JSON array:
[
  {
    "action": "update" | "add",
    "index": number (for "update" use existing section index, for "add" use -1),
    "title": "brief section title (keep existing title when updating)",
    "content": "consolidated summary including both existing and new information"
  }
]

Prioritize consolidation over fragmentation.`
          : `You are summarizing a meeting transcript chunk. Your goal is to create CONSOLIDATED notes with fewer, well-organized sections.

TRANSCRIPT CHUNK:
${transcriptChunk}
${meetingTitle ? `\nMeeting: ${meetingTitle}` : ""}

IMPORTANT: Group related topics together. Don't create a new section for every small detail.
- Aim for 1-3 sections maximum per chunk
- Group similar topics under the same section
- Only create separate sections for distinctly different topics

Return JSON:
{
  "title": "meeting title (if first chunk)",
  "sections": [
    {
      "title": "broad topic name",
      "content": "consolidated summary of related points"
    }
  ]
}

Keep sections consolidated and well-organized.`

        // Call Gemini API - use model with available quota
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
              },
            }),
          },
        )

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error("Gemini API error:", errorText)
          throw new Error(`Gemini API request failed: ${errorText}`)
        }

        const geminiData = await geminiResponse.json()

        if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts) {
          throw new Error("Invalid response from Gemini API")
        }

        const responseText = geminiData.candidates[0].content.parts[0].text
        console.log("[Generate Live] Raw Gemini response:", responseText.substring(0, 500))

        // Extract JSON from response
        let jsonText = responseText.trim()
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "")
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "")
        }

        let result
        try {
          result = JSON.parse(jsonText)
          console.log("[Generate Live] Parsed JSON:", JSON.stringify(result).substring(0, 500))
        } catch (parseError) {
          console.error("[Generate Live] JSON parse error:", parseError)
          console.error("[Generate Live] Text that failed to parse:", jsonText.substring(0, 500))
          throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`)
        }

        // Send updates based on whether we have existing notes
        if (existingNotes && existingNotes.length > 0) {
          // Incremental update mode
          if (Array.isArray(result)) {
            // Array of update actions
            for (const update of result) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: update.action === "update" ? "update-section" : "add-section",
                    index: update.index,
                    content: { title: update.title, content: update.content },
                  })}\n\n`,
                ),
              )
            }
          } else if (result.sections) {
            // Fallback: treat as new sections
            for (const section of result.sections) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "add-section",
                    index: -1,
                    content: section,
                  })}\n\n`,
                ),
              )
            }
          }
        } else {
          // First chunk - initial note creation
          if (result.title) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "title", content: result.title })}\n\n`),
            )
          }

          if (result.sections && Array.isArray(result.sections)) {
            for (const section of result.sections) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "add-section", index: -1, content: section })}\n\n`,
                ),
              )
            }
          }
        }

        // Send done signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
        controller.close()
      } catch (error) {
        console.error("Error generating live notes:", error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              content: error instanceof Error ? error.message : "Failed to generate notes",
            })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

