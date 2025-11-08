import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  const { url } = await request.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Use Grok to analyze the URL and generate notes
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
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
                  "You are an expert note-taking AI assistant. Analyze content from URLs and create structured, comprehensive notes. Break down complex topics into clear sections with titles and detailed explanations.",
              },
              {
                role: "user",
                content: `Analyze this URL and create detailed study notes: ${url}\n\nFirst, provide a title for these notes. Then suggest 3-5 relevant tags. Finally, create 5-8 sections with titles and detailed content covering the key concepts. Format your response as JSON with this structure: { "title": "note title", "tags": ["tag1", "tag2", ...], "sections": [{ "title": "section name", "content": "detailed explanation" }] }`,
              },
            ],
            temperature: 0.7,
            stream: false,
          }),
        })

        if (!response.ok) {
          throw new Error("Grok API request failed")
        }

        const data = await response.json()
        const result = JSON.parse(data.choices[0].message.content)

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
        console.error("Error generating notes:", error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: "Failed to generate notes" })}\n\n`),
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
