"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Profile, Note } from "@/lib/types/database"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { NoteCard } from "@/components/note-card"
import { BookOpen } from "lucide-react"

interface FriendProfileDialogProps {
  friend: Profile
  isOpen: boolean
  onClose: () => void
}

export function FriendProfileDialog({ friend, isOpen, onClose }: FriendProfileDialogProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [topTags, setTopTags] = useState<{ tag: string; count: number }[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchFriendNotes()
    }
  }, [isOpen, friend.id])

  const fetchFriendNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", friend.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching friend notes:", error)
      return
    }

    setNotes(data || [])

    // Calculate top tags
    const tagCounts: Record<string, number> = {}
    data?.forEach((note) => {
      note.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    const topTagsArray = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setTopTags(topTagsArray)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {friend.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl gradient-text">{friend.username || "Anonymous"}</DialogTitle>
              <p className="text-sm text-muted-foreground">{friend.email}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-2xl font-bold text-primary">{notes.length}</p>
              </div>
              <p className="text-sm text-muted-foreground">Public Notes</p>
            </div>
            <div className="bg-accent/5 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-accent mb-1">{topTags.length}</p>
              <p className="text-sm text-muted-foreground">Topics</p>
            </div>
          </div>

          {/* Top Topics */}
          {topTags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Top Topics</h3>
              <div className="flex flex-wrap gap-2">
                {topTags.map(({ tag, count }) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                    {tag} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Public Notes */}
          <div>
            <h3 className="font-semibold mb-3">All Public Notes</h3>
            <ScrollArea className="h-[300px] pr-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No public notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <NoteCard key={note.id} note={note} onRefresh={fetchFriendNotes} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
