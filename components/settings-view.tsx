"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface SettingsViewProps {
  user: User
}

export function SettingsView({ user }: SettingsViewProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState(user.email || "")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (error) {
      console.error("Error fetching profile:", error)
      return
    }

    if (data) {
      setUsername(data.username || "")
    }
  }

  const handleUpdateProfile = async () => {
    setIsLoading(true)

    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id)

    if (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } else {
      toast.success("Profile updated successfully!")
    }

    setIsLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }

    if (!confirm("This will permanently delete all your notes, friendships, and data. Are you absolutely sure?")) {
      return
    }

    // Delete user data (RLS will handle cascade deletes)
    const { error } = await supabase.auth.admin.deleteUser(user.id)

    if (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account. Please contact support.")
    } else {
      toast.success("Account deleted successfully")
      await supabase.auth.signOut()
      router.push("/")
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Settings</span>
          </h1>
          <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Profile Information</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {username?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Profile Picture</p>
                  <p className="text-xs text-muted-foreground mt-1">Avatar generated from username</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <Button onClick={handleUpdateProfile} disabled={isLoading} className="bg-primary">
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-destructive/20">
            <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. Please be certain.
              </p>

              <Button variant="destructive" onClick={handleDeleteAccount} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
