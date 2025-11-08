"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile, Friendship } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, Check, X } from "lucide-react"
import { FriendProfileDialog } from "@/components/friend-profile-dialog"
import { toast } from "sonner"

interface FriendsViewProps {
  userId: string
}

export function FriendsView({ userId }: FriendsViewProps) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { profile: Profile })[]>([])
  const [searchUsername, setSearchUsername] = useState("")
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchFriends()
    fetchPendingRequests()
  }, [])

  const fetchFriends = async () => {
    // Get accepted friendships
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", userId)
      .eq("status", "accepted")

    if (error) {
      console.error("Error fetching friendships:", error)
      return
    }

    const friendIds = friendships?.map((f) => f.friend_id) || []

    if (friendIds.length === 0) {
      setFriends([])
      return
    }

    // Fetch friends' profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds)
      .order("username")

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
    } else {
      setFriends(profiles || [])
    }
  }

  const fetchPendingRequests = async () => {
    const { data: requests, error } = await supabase
      .from("friendships")
      .select("*, profile:user_id(id, username, email, profile_picture_url)")
      .eq("friend_id", userId)
      .eq("status", "pending")

    if (error) {
      console.error("Error fetching requests:", error)
      return
    }

    setPendingRequests((requests as any) || [])
  }

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      toast.error("Please enter a username")
      return
    }

    setIsSearching(true)
    setSearchResult(null)

    const { data, error } = await supabase.from("profiles").select("*").eq("username", searchUsername.trim()).single()

    if (error || !data) {
      toast.error("User not found")
    } else if (data.id === userId) {
      toast.error("You cannot add yourself as a friend")
    } else {
      setSearchResult(data)
    }

    setIsSearching(false)
  }

  const handleSendRequest = async (friendId: string) => {
    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .eq("user_id", userId)
      .eq("friend_id", friendId)
      .single()

    if (existing) {
      toast.error("Friend request already sent or friendship exists")
      return
    }

    const { error } = await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: friendId,
      status: "pending",
    })

    if (error) {
      console.error("Error sending request:", error)
      toast.error("Failed to send friend request")
    } else {
      toast.success("Friend request sent!")
      setSearchResult(null)
      setSearchUsername("")
    }
  }

  const handleAcceptRequest = async (requestId: string, friendId: string) => {
    // Update the existing request to accepted
    const { error: updateError } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", requestId)

    if (updateError) {
      console.error("Error accepting request:", updateError)
      toast.error("Failed to accept request")
      return
    }

    // Create reciprocal friendship
    const { error: insertError } = await supabase.from("friendships").insert({
      user_id: userId,
      friend_id: friendId,
      status: "accepted",
    })

    if (insertError) {
      console.error("Error creating reciprocal friendship:", insertError)
    }

    toast.success("Friend request accepted!")
    fetchFriends()
    fetchPendingRequests()
  }

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", requestId)

    if (error) {
      console.error("Error rejecting request:", error)
      toast.error("Failed to reject request")
    } else {
      toast.success("Friend request rejected")
      fetchPendingRequests()
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Friends</span>
          </h1>
          <p className="text-muted-foreground text-lg">Connect with classmates and share notes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Friends List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-primary">My Friends</h2>

              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">No friends yet. Search for classmates to connect!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <Card
                      key={friend.id}
                      className="p-4 cursor-pointer hover:shadow-md transition-all border-primary/10 hover:border-primary/30"
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {friend.username?.[0]?.toUpperCase() || friend.email?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{friend.username || "Anonymous"}</p>
                          <p className="text-sm text-muted-foreground truncate">{friend.email}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar - Search and Requests */}
          <div className="space-y-6">
            {/* Find New Friends */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-primary">Find New Friends</h2>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter username"
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching} size="icon" className="bg-primary">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {searchResult && (
                  <Card className="p-4 border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {searchResult.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{searchResult.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{searchResult.email}</p>
                      </div>
                    </div>
                    <Button onClick={() => handleSendRequest(searchResult.id)} className="w-full bg-primary" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Request
                    </Button>
                  </Card>
                )}
              </div>
            </Card>

            {/* Pending Requests */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-primary">Requests ({pendingRequests.length})</h2>

              {pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="p-3 border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-accent/10 text-accent text-xs">
                            {request.profile.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium truncate flex-1">{request.profile.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id, request.user_id)}
                          className="flex-1 bg-primary"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          className="flex-1"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {selectedFriend && (
        <FriendProfileDialog
          friend={selectedFriend}
          isOpen={!!selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  )
}
