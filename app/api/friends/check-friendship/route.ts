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

    // Check for friendship records in both directions
    const { data: friendship1, error: error1 } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", user.id)
      .eq("friend_id", profile.id)
      .maybeSingle()

    const { data: friendship2, error: error2 } = await adminClient
      .from("friendships")
      .select("*")
      .eq("user_id", profile.id)
      .eq("friend_id", user.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
      },
      friendships: {
        fromYou: friendship1
          ? {
              id: friendship1.id,
              status: friendship1.status,
              created_at: friendship1.created_at,
            }
          : null,
        fromThem: friendship2
          ? {
              id: friendship2.id,
              status: friendship2.status,
              created_at: friendship2.created_at,
            }
          : null,
      },
      errors: error1 || error2 ? { error1, error2 } : undefined,
    })
  } catch (error) {
    console.error("Error checking friendship:", error)
    return NextResponse.json({ error: "Failed to check friendship" }, { status: 500 })
  }
}

