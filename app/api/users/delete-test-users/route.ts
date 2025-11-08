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
    const adminClient = createAdminClient()

    // Find all profiles with test email domain
    const { data: testProfiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, username")
      .like("email", "%@notenest.test")

    if (profilesError) {
      console.error("Error fetching test profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch test users" }, { status: 500 })
    }

    if (!testProfiles || testProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No test users found",
        deletedCount: 0,
      })
    }

    const deletedUsers: any[] = []
    const errors: any[] = []

    for (const profile of testProfiles) {
      try {
        // Delete notes belonging to this user
        const { error: notesError } = await adminClient.from("notes").delete().eq("user_id", profile.id)
        if (notesError) {
          console.error(`Error deleting notes for ${profile.email}:`, notesError)
        }

        // Delete friendships involving this user
        const { error: friendshipsError1 } = await adminClient
          .from("friendships")
          .delete()
          .eq("user_id", profile.id)
        if (friendshipsError1) {
          console.error(`Error deleting friendships (user_id) for ${profile.email}:`, friendshipsError1)
        }

        const { error: friendshipsError2 } = await adminClient
          .from("friendships")
          .delete()
          .eq("friend_id", profile.id)
        if (friendshipsError2) {
          console.error(`Error deleting friendships (friend_id) for ${profile.email}:`, friendshipsError2)
        }

        // Delete compiled notes (if any were created by this user)
        const { error: compiledNotesError } = await adminClient
          .from("compiled_notes")
          .delete()
          .eq("user_id", profile.id)
        if (compiledNotesError) {
          console.error(`Error deleting compiled notes for ${profile.email}:`, compiledNotesError)
        }

        // Delete profile
        const { error: profileError } = await adminClient.from("profiles").delete().eq("id", profile.id)
        if (profileError) {
          console.error(`Error deleting profile for ${profile.email}:`, profileError)
          errors.push({ email: profile.email, error: profileError.message })
          continue
        }

        // Delete auth user
        const { error: authError } = await adminClient.auth.admin.deleteUser(profile.id)
        if (authError) {
          console.error(`Error deleting auth user for ${profile.email}:`, authError)
          errors.push({ email: profile.email, error: authError.message })
        } else {
          deletedUsers.push({
            email: profile.email,
            username: profile.username,
          })
        }
      } catch (error: any) {
        console.error(`Error deleting user ${profile.email}:`, error)
        errors.push({ email: profile.email, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedUsers.length} test user(s)`,
      deletedCount: deletedUsers.length,
      deletedUsers,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error deleting test users:", error)
    return NextResponse.json({ error: "Failed to delete test users" }, { status: 500 })
  }
}

