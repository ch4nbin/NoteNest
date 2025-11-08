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

    // Find the test user by email
    const { data: testProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, username, email")
      .or(`email.eq.${email},username.eq.${email}`)
      .maybeSingle()

    if (profileError || !testProfile) {
      return NextResponse.json({ error: "Test user not found" }, { status: 404 })
    }

    // Check if friendship already exists
    const { data: existing } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", testProfile.id)
      .eq("friend_id", user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: false,
        message: "Friend request already exists or friendship already established",
        existingStatus: existing.status,
      })
    }

    // Create friend request from test user to current user
    const { error: insertError } = await adminClient.from("friendships").insert({
      user_id: testProfile.id, // Test user sends the request
      friend_id: user.id, // To current user
      status: "pending",
    })

    if (insertError) {
      console.error("Error creating friend request:", insertError)
      return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Friend request sent from ${testProfile.username || testProfile.email}`,
      request: {
        from: testProfile.username || testProfile.email,
        fromEmail: testProfile.email,
        to: user.email,
      },
    })
  } catch (error) {
    console.error("Error sending test friend request:", error)
    return NextResponse.json({ error: "Failed to send test friend request" }, { status: 500 })
  }
}

