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
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Find the user by email (the user who will reject the request)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, username, email")
      .or(`email.eq.${email},username.eq.${email}`)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find the pending friend request from current user to this user
    // This is the request that the other user will reject
    const { data: pendingRequest, error: requestError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", user.id) // Current user sent the request
      .eq("friend_id", profile.id) // To the other user
      .eq("status", "pending")
      .maybeSingle()

    if (requestError) {
      console.error("Error finding pending request:", requestError)
      return NextResponse.json({ error: "Error finding pending request" }, { status: 500 })
    }

    if (!pendingRequest) {
      return NextResponse.json({
        success: false,
        message: "No pending friend request found from you to this user",
      })
    }

    // Delete the pending request (this simulates the other user rejecting it)
    const { error: deleteError } = await adminClient
      .from("friendships")
      .delete()
      .eq("id", pendingRequest.id)

    if (deleteError) {
      console.error("Error rejecting request:", deleteError)
      return NextResponse.json({ error: "Failed to reject request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${profile.username || profile.email} has rejected your friend request`,
      rejectedRequest: {
        id: pendingRequest.id,
        from: user.email,
        to: profile.email,
      },
    })
  } catch (error) {
    console.error("Error rejecting friend request:", error)
    return NextResponse.json({ error: "Failed to reject friend request" }, { status: 500 })
  }
}

