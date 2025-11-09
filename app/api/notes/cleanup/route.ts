import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint for cleaning up and consolidating notes
 * Merges similar sections and consolidates content
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

  const { sections } = await request.json()

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return new Response(JSON.stringify({ error: "Sections array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    // Build context from all sections
    const sectionsContext = sections
      .map((section: { title: string; content: string }, idx: number) => 
        `Section ${idx + 1}: ${section.title}\n${section.content}`
      )
      .join("\n\n")

    const prompt = `You are consolidating and cleaning up meeting notes before saving.

CURRENT SECTIONS:
${sectionsContext}

TASK: Clean up and consolidate these sections by:
1. MERGING sections with similar headings - group all related topics under the same heading
2. Grouping all related content under the same subheading - don't create separate sections for minor variations
3. Reducing the total number of sections (aim for 3-6 sections maximum)
4. Keeping section titles broad and descriptive to encompass related topics
5. Combining content from merged sections into comprehensive, well-organized summaries
6. Cleaning up text: 
   - Remove unfinished or fragmented ideas
   - Remove incomplete sentences or thoughts
   - Fix grammar and improve flow
   - Make content more concise and readable
   - Remove redundant phrases and filler words
   - Complete any partial thoughts if possible, or remove them if too fragmented
7. Remove duplicate information across sections
8. Ensure all content is coherent and complete

IMPORTANT:
- If two sections discuss related topics or have similar headings, merge them into one
- Use broader section titles that can encompass multiple related subtopics
- Remove any text that is clearly unfinished, fragmented, or incomplete
- Polish all content to be professional and readable
- If a section has incomplete ideas, either complete them logically or remove them

Return ONLY a JSON array of cleaned and consolidated sections:
[
  {
    "title": "broad consolidated section title",
    "content": "cleaned, merged, and well-organized content from related sections (no unfinished ideas)"
  }
]

Make sure the consolidated sections are well-organized, comprehensive, and all text is cleaned up with no unfinished or fragmented ideas.`

    // Use Gemini to consolidate notes
    const modelsToTry = [
      { name: "gemini-2.0-flash-lite", version: "v1beta" },
      { name: "gemini-2.5-flash-lite", version: "v1beta" },
      { name: "gemini-2.0-flash", version: "v1beta" },
      { name: "gemini-2.5-flash", version: "v1beta" },
    ]

    let lastError: any = null
    let geminiResponse: Response | null = null
    let geminiData: any = null

    // Try each model until one works
    for (const modelConfig of modelsToTry) {
      try {
        console.log(`[Cleanup] Trying model: ${modelConfig.name} (${modelConfig.version})`)

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
                temperature: 0.5, // Lower temperature for more consistent consolidation
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            }),
          },
        )

        if (geminiResponse.ok) {
          geminiData = await geminiResponse.json()
          console.log(`[Cleanup] Model ${modelConfig.name} succeeded!`)
          break
        } else {
          const errorText = await geminiResponse.text()
          console.warn(`[Cleanup] Model ${modelConfig.name} failed:`, errorText.substring(0, 200))

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
        console.warn(`[Cleanup] Model ${modelConfig.name} exception:`, err)
      }
    }

    if (!geminiResponse || !geminiResponse.ok || !geminiData) {
      console.error("[Cleanup] All models failed. Last error:", lastError)
      // Return original sections if cleanup fails
      return new Response(
        JSON.stringify({ 
          sections: sections,
          error: "Cleanup failed, returning original sections",
          details: lastError,
        }),
        {
          status: 200, // Return 200 so we don't break the flow
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts) {
      return new Response(
        JSON.stringify({ 
          sections: sections,
          error: "Invalid response from Gemini API",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const responseText = geminiData.candidates[0].content.parts[0].text
    console.log("[Cleanup] Raw Gemini response:", responseText.substring(0, 500))

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
      console.log("[Cleanup] Parsed JSON:", JSON.stringify(result).substring(0, 500))
    } catch (parseError) {
      console.error("[Cleanup] JSON parse error:", parseError)
      console.error("[Cleanup] Text that failed to parse:", jsonText.substring(0, 500))
      // Return original sections if parsing fails
      return new Response(
        JSON.stringify({ 
          sections: sections,
          error: "Failed to parse cleanup response",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Validate result structure
    if (!Array.isArray(result) || result.length === 0) {
      console.warn("[Cleanup] Invalid result structure, returning original sections")
      return new Response(
        JSON.stringify({ sections: sections }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Validate each section has title and content
    const cleanedSections = result.filter(
      (section: any) => section.title && section.content
    )

    if (cleanedSections.length === 0) {
      console.warn("[Cleanup] No valid sections after cleanup, returning original")
      return new Response(
        JSON.stringify({ sections: sections }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log(`[Cleanup] Consolidated ${sections.length} sections into ${cleanedSections.length} sections`)

    return new Response(
      JSON.stringify({ sections: cleanedSections }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error cleaning up notes:", error)
    // Return original sections on error
    return new Response(
      JSON.stringify({ 
        sections: sections,
        error: "Failed to cleanup notes",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

