import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify the request belongs to the current user (they are the recipient)
    const { data: friendship, error: fetchError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("id", requestId)
      .eq("friend_id", user.id) // Current user is the recipient
      .eq("status", "pending")
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching friendship:", fetchError)
      return NextResponse.json({ error: "Error finding friend request" }, { status: 500 })
    }

    if (!friendship) {
      return NextResponse.json({ error: "Friend request not found or already processed" }, { status: 404 })
    }

    // Delete the pending request using admin client (bypasses RLS)
    const { error: deleteError, data: deleted } = await adminClient
      .from("friendships")
      .delete()
      .eq("id", requestId)
      .select()

    if (deleteError) {
      console.error("Error rejecting request:", deleteError)
      return NextResponse.json({ error: "Failed to reject request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Friend request rejected",
      deleted: deleted?.length || 0,
    })
  } catch (error) {
    console.error("Error rejecting friend request:", error)
    return NextResponse.json({ error: "Failed to reject friend request" }, { status: 500 })
  }
}

