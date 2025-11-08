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

    // Find all test user profiles
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
        acceptedCount: 0,
      })
    }

    const acceptedRequests: any[] = []
    const errors: any[] = []

    for (const profile of testProfiles) {
      try {
        // Find pending friend request where current user sent request to this test user
        const { data: pendingRequest, error: requestError } = await adminClient
          .from("friendships")
          .select("*")
          .eq("user_id", user.id)
          .eq("friend_id", profile.id)
          .eq("status", "pending")
          .maybeSingle()

        if (requestError) {
          console.error(`Error finding pending request for ${profile.email}:`, requestError)
          errors.push({ email: profile.email, error: "Error finding pending request" })
          continue
        }

        if (!pendingRequest) {
          // No pending request found - skip this user
          continue
        }

        // Update the pending request to accepted
        const { error: updateError } = await adminClient
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", pendingRequest.id)

        if (updateError) {
          console.error(`Error updating friendship for ${profile.email}:`, updateError)
          errors.push({ email: profile.email, error: updateError.message })
          continue
        }

        // Create reciprocal friendship (from test user to current user)
        const { data: existingReciprocal } = await adminClient
          .from("friendships")
          .select("*")
          .eq("user_id", profile.id)
          .eq("friend_id", user.id)
          .maybeSingle()

        if (!existingReciprocal) {
          const { error: insertError } = await adminClient.from("friendships").insert({
            user_id: profile.id,
            friend_id: user.id,
            status: "accepted",
          })

          if (insertError) {
            console.error(`Error creating reciprocal friendship for ${profile.email}:`, insertError)
            // Continue anyway, the main friendship is accepted
          }
        } else if (existingReciprocal.status !== "accepted") {
          // Update existing reciprocal to accepted
          await adminClient.from("friendships").update({ status: "accepted" }).eq("id", existingReciprocal.id)
        }

        acceptedRequests.push({
          email: profile.email,
          username: profile.username,
        })
      } catch (error: any) {
        console.error(`Error accepting request for ${profile.email}:`, error)
        errors.push({ email: profile.email, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Accepted ${acceptedRequests.length} friend request(s)`,
      acceptedCount: acceptedRequests.length,
      acceptedRequests,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error accepting friend requests:", error)
    return NextResponse.json({ error: "Failed to accept friend requests" }, { status: 500 })
  }
}

