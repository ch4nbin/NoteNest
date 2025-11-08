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

  const { question, url, context } = await request.json()

  try {
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
              "You are a helpful study assistant. Answer questions based on the provided context and URL. Be concise but thorough. If you don't know the answer from the context, say so and provide general information.",
          },
          {
            role: "user",
            content: `Context from ${url}:\n${JSON.stringify(context)}\n\nQuestion: ${question}\n\nProvide a clear, concise answer.`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error("Grok API request failed")
    }

    const data = await response.json()
    const answer = data.choices[0].message.content

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("Error answering question:", error)
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 })
  }
}
