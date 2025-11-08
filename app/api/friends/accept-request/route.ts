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

    // Find the user by email
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, username, email")
      .or(`email.eq.${email},username.eq.${email}`)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const friendId = profile.id

    // Find the pending friendship request where current user sent request to this friend
    const { data: pendingRequest, error: requestError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", user.id)
      .eq("friend_id", friendId)
      .eq("status", "pending")
      .maybeSingle()

    if (requestError) {
      console.error("Error finding pending request:", requestError)
      return NextResponse.json({ error: "Error finding pending request" }, { status: 500 })
    }

    if (!pendingRequest) {
      return NextResponse.json({ error: "No pending friend request found" }, { status: 404 })
    }

    // Update the pending request to accepted
    const { error: updateError } = await adminClient
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", pendingRequest.id)

    if (updateError) {
      console.error("Error updating friendship:", updateError)
      return NextResponse.json({ error: "Failed to accept request" }, { status: 500 })
    }

    // Create reciprocal friendship (from friend to current user)
    const { data: existingReciprocal } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", friendId)
      .eq("friend_id", user.id)
      .maybeSingle()

    if (!existingReciprocal) {
      const { error: insertError } = await adminClient.from("friendships").insert({
        user_id: friendId,
        friend_id: user.id,
        status: "accepted",
      })

      if (insertError) {
        console.error("Error creating reciprocal friendship:", insertError)
        // Continue anyway, the main friendship is accepted
      }
    } else if (existingReciprocal.status !== "accepted") {
      // Update existing reciprocal to accepted
      await adminClient.from("friendships").update({ status: "accepted" }).eq("id", existingReciprocal.id)
    }

    return NextResponse.json({
      success: true,
      message: `Friend request from ${profile.username || profile.email} has been accepted`,
      friendship: {
        id: pendingRequest.id,
        friendId: friendId,
        friendUsername: profile.username,
        friendEmail: profile.email,
      },
    })
  } catch (error) {
    console.error("Error accepting friend request:", error)
    return NextResponse.json({ error: "Failed to accept friend request" }, { status: 500 })
  }
}

