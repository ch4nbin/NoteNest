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

  try {
    // Fetch user's note analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from("note_analytics")
      .select("*, note:notes(*)")
      .eq("user_id", user.id)

    if (analyticsError || !analytics) {
      throw new Error("Failed to fetch analytics")
    }

    // Analyze patterns using Grok AI
    const analyticsData = analytics.map((a) => ({
      tags: a.note?.tags || [],
      viewCount: a.view_count,
      qnaCount: a.qna_count,
      timeSpent: a.time_spent_seconds,
    }))

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
              "You are an expert learning analytics AI. Analyze student engagement patterns to predict weak areas and provide personalized recommendations.",
          },
          {
            role: "user",
            content: `Analyze this student's note engagement data and predict weak areas:\n${JSON.stringify(analyticsData)}\n\nProvide a JSON response with: { "weakAreas": ["topic1", "topic2"], "confidenceScore": 0.85, "recommendations": ["recommendation1", "recommendation2"] }`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error("Grok API request failed")
    }

    const data = await response.json()
    const insights = JSON.parse(data.choices[0].message.content)

    // Save insights to database
    const { data: savedInsight, error: saveError } = await supabase
      .from("learning_insights")
      .insert({
        user_id: user.id,
        topic: "General Learning",
        predicted_weak_areas: insights.weakAreas,
        confidence_score: insights.confidenceScore,
        recommendations: insights.recommendations,
      })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving insights:", saveError)
    }

    return NextResponse.json({ insights: savedInsight || insights })
  } catch (error) {
    console.error("Error generating insights:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
