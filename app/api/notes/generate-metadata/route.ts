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

  const { sections, transcript } = await request.json()

  try {
    // Build content summary from sections and transcript
    let contentSummary = ""
    
    if (sections && sections.length > 0) {
      contentSummary = "Note Sections:\n"
      sections.forEach((section: { title: string; content: string }, index: number) => {
        contentSummary += `${index + 1}. ${section.title}\n${section.content}\n\n`
      })
    }
    
    if (transcript && transcript.trim()) {
      // Use first 2000 chars of transcript for context
      const transcriptPreview = transcript.length > 2000 
        ? transcript.substring(0, 2000) + "..."
        : transcript
      contentSummary += `\nMeeting Transcript (excerpt):\n${transcriptPreview}`
    }

    if (!contentSummary.trim()) {
      return NextResponse.json(
        { error: "No content provided to generate metadata" },
        { status: 400 }
      )
    }

    // Use Gemini to generate title and tags
    const modelsToTry = [
      { name: "gemini-2.0-flash-lite", version: "v1beta" },
      { name: "gemini-2.5-flash-lite", version: "v1beta" },
      { name: "gemini-2.0-flash", version: "v1beta" },
      { name: "gemini-2.5-flash", version: "v1beta" },
    ]

    let lastError: any = null
    let geminiResponse: Response | null = null
    let geminiData: any = null

    const prompt = `You are an expert at creating concise, descriptive titles and relevant tags for meeting notes.

Analyze this meeting content and generate:
1. A clear, descriptive title (3-8 words) that captures the main topic
2. 3-5 relevant tags (single words or short phrases) that categorize the content

Content:
${contentSummary}

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just the JSON):
{
  "title": "Meeting Title Here",
  "tags": ["tag1", "tag2", "tag3"]
}

Make the title specific to the meeting content, not generic. Tags should be relevant keywords that help categorize the note.`

    // Try each model until one works
    for (const modelConfig of modelsToTry) {
      try {
        console.log(`[Generate Metadata] Trying model: ${modelConfig.name} (${modelConfig.version})`)

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
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 512,
              },
            }),
          },
        )

        if (geminiResponse.ok) {
          geminiData = await geminiResponse.json()
          console.log(`[Generate Metadata] Model ${modelConfig.name} succeeded!`)
          break
        } else {
          const errorText = await geminiResponse.text()
          console.warn(`[Generate Metadata] Model ${modelConfig.name} failed:`, errorText.substring(0, 200))

          if (geminiResponse.status === 429) {
            lastError = {
              model: modelConfig.name,
              version: modelConfig.version,
              status: 429,
              error: "Rate limit exceeded",
            }
            break
          }

          lastError = {
            model: modelConfig.name,
            version: modelConfig.version,
            status: geminiResponse.status,
            error: errorText,
          }
        }
      } catch (err) {
        lastError = {
          model: modelConfig.name,
          version: modelConfig.version,
          error: err instanceof Error ? err.message : String(err),
        }
        console.warn(`[Generate Metadata] Model ${modelConfig.name} exception:`, err)
      }
    }

    if (!geminiResponse || !geminiResponse.ok || !geminiData) {
      console.error("[Generate Metadata] All models failed. Last error:", lastError)
      return NextResponse.json(
        {
          error: "Failed to generate metadata",
          details: lastError,
        },
        { status: 500 },
      )
    }

    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts) {
      return NextResponse.json(
        { error: "Invalid response from Gemini API" },
        { status: 500 },
      )
    }

    const responseText = geminiData.candidates[0].content.parts[0].text
    console.log("[Generate Metadata] Raw Gemini response:", responseText.substring(0, 500))

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
    } catch (parseError) {
      console.error("[Generate Metadata] JSON parse error:", parseError)
      console.error("[Generate Metadata] Text that failed to parse:", jsonText)
      return NextResponse.json(
        { error: "Failed to parse AI response", rawResponse: jsonText },
        { status: 500 },
      )
    }

    // Validate result structure
    if (!result.title || !result.tags || !Array.isArray(result.tags)) {
      return NextResponse.json(
        { error: "Invalid metadata structure from AI", result },
        { status: 500 },
      )
    }

    return NextResponse.json({
      title: result.title,
      tags: result.tags,
    })
  } catch (error) {
    console.error("Error generating metadata:", error)
    return NextResponse.json(
      { error: "Failed to generate metadata" },
      { status: 500 },
    )
  }
}

