import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseZoomLink } from "@/lib/utils/zoom"

/**
 * API endpoint to join a Zoom meeting as a bot and start audio capture
 * This uses Zoom's Meeting SDK to join programmatically
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
    const body = await request.json()
    const { zoomUrl } = body

    if (!zoomUrl) {
      return NextResponse.json({ error: "Zoom URL is required" }, { status: 400 })
    }

    const zoomInfo = parseZoomLink(zoomUrl)
    
    if (!zoomInfo.isValid || !zoomInfo.meetingId) {
      return NextResponse.json({ error: "Invalid Zoom link" }, { status: 400 })
    }

    // For now, we'll use a simpler approach:
    // Generate a join URL that opens in a new window with audio enabled
    // The client-side will handle joining and capturing audio
    
    // Alternative: Use Zoom Meeting SDK on client side
    // Or use Zoom API to create a meeting bot (requires OAuth setup)
    
    return NextResponse.json({
      success: true,
      meetingId: zoomInfo.meetingId,
      password: zoomInfo.password,
      joinUrl: `https://zoom.us/j/${zoomInfo.meetingId}${zoomInfo.password ? `?pwd=${zoomInfo.password}` : ""}`,
      message: "Use Zoom Meeting SDK on client side to join programmatically"
    })
  } catch (error) {
    console.error("[Zoom Join] Error:", error)
    return NextResponse.json(
      { error: "Failed to process Zoom meeting", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

