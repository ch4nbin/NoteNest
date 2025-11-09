import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint to generate notes from a transcript using Gemini
 * Accepts transcript text and returns structured notes
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

  const { transcript } = await request.json()

  if (!transcript || typeof transcript !== "string") {
    return new Response(JSON.stringify({ error: "Transcript is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Use Gemini to generate notes from transcript
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                      text: `You are an expert note-taking AI assistant. Analyze this transcript from a Zoom meeting and create structured, comprehensive notes.

Transcript:
${transcript}

Create detailed study notes with the following structure:
1. First, provide a title for these notes based on the meeting content
2. Suggest 3-5 relevant tags
3. Create 5-8 sections with titles and detailed content covering the key concepts discussed

Format your response as valid JSON with this exact structure:
{
  "title": "note title",
  "tags": ["tag1", "tag2", "tag3"],
  "sections": [
    {
      "title": "section name",
      "content": "detailed explanation"
    }
  ]
}

Make sure the JSON is valid and properly formatted.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
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

        // Extract JSON from response (Gemini might wrap it in markdown code blocks)
        let jsonText = responseText.trim()
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "")
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "")
        }

        const result = JSON.parse(jsonText)

        // Send title
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "title", content: result.title })}\n\n`))

        // Send tags
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tags", content: result.tags })}\n\n`))

        // Send sections one by one with delays to simulate streaming
        for (const section of result.sections) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "section", content: section })}\n\n`))
          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        // Send done signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))

        controller.close()
      } catch (error) {
        console.error("Error generating notes from transcript:", error)
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

