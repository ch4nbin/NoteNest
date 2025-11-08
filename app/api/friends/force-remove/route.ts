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

    // Force delete both friendship records using admin client (bypasses RLS)
    const { error: deleteError1, data: deleted1 } = await adminClient
      .from("friendships")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", profile.id)
      .select()

    const { error: deleteError2, data: deleted2 } = await adminClient
      .from("friendships")
      .delete()
      .eq("user_id", profile.id)
      .eq("friend_id", user.id)
      .select()

    if (deleteError1 || deleteError2) {
      console.error("Error deleting friendships:", deleteError1 || deleteError2)
      return NextResponse.json({
        error: "Failed to delete friendships",
        details: deleteError1 || deleteError2,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed friendship with ${profile.username || profile.email}`,
      deleted: {
        fromYou: deleted1?.length || 0,
        fromThem: deleted2?.length || 0,
      },
    })
  } catch (error) {
    console.error("Error force removing friend:", error)
    return NextResponse.json({ error: "Failed to remove friend" }, { status: 500 })
  }
}

