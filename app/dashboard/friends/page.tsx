import { FriendsView } from "@/components/friends-view"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function FriendsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return <FriendsView userId={user.id} />
}
