import { NoteCreator } from "@/components/note-creator"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function CreateNotePage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="h-full bg-background">
      <NoteCreator userId={user.id} />
    </div>
  )
}
