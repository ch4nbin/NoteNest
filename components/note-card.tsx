"use client"

import type React from "react"

import type { Note } from "@/lib/types/database"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, Trash2 } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { NoteDetailDialog } from "@/components/note-detail-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface NoteCardProps {
  note: Note
  isOwner?: boolean
  isSelectable?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onRefresh: () => void
}

export function NoteCard({
  note,
  isOwner = false,
  isSelectable = false,
  isSelected = false,
  onSelect,
  onRefresh,
}: NoteCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  const togglePrivacy = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const { error } = await supabase.from("notes").update({ is_public: !note.is_public }).eq("id", note.id)

    if (error) {
      console.error("Error updating note privacy:", error)
      toast.error("Failed to update privacy")
    } else {
      toast.success(`Note is now ${!note.is_public ? "public" : "private"}`)
      onRefresh()
    }
  }

  const deleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this note?")) return

    const { error } = await supabase.from("notes").delete().eq("id", note.id)

    if (error) {
      console.error("Error deleting note:", error)
      toast.error("Failed to delete note")
    } else {
      toast.success("Note deleted successfully")
      onRefresh()
    }
  }

  return (
    <>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-all border-primary/10 hover:border-primary/30"
        onClick={() => !isSelectable && setIsDialogOpen(true)}
      >
        <div className="flex items-start gap-3">
          {isSelectable && (
            <Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm line-clamp-1">{note.title}</h3>
              {isOwner && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" onClick={togglePrivacy} className="h-6 w-6">
                    {note.is_public ? (
                      <Unlock className="w-3 h-3 text-primary" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={deleteNote} className="h-6 w-6">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags?.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary">
                  {tag}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      <NoteDetailDialog note={note} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  )
}
