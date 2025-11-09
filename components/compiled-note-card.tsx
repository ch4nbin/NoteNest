"use client"

import type React from "react"

import type { CompiledNote } from "@/lib/types/database"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { CompiledNoteDetailDialog } from "@/components/compiled-note-detail-dialog"
import { toast } from "sonner"

interface CompiledNoteCardProps {
  note: CompiledNote
  onRefresh: () => void
}

export function CompiledNoteCard({ note, onRefresh }: CompiledNoteCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [existingReferencesCount, setExistingReferencesCount] = useState(note.source_note_ids?.length || 0)
  const supabase = createClient()

  // Debug: log tags
  useEffect(() => {
    if (note.tags) {
      console.log("[CompiledNoteCard] Note tags:", note.tags, "Type:", typeof note.tags, "IsArray:", Array.isArray(note.tags))
    } else {
      console.log("[CompiledNoteCard] Note has no tags property or tags is null/undefined")
    }
  }, [note.tags, note.id])

  useEffect(() => {
    fetchExistingReferencesCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.source_note_ids?.join(","), note.id])

  const fetchExistingReferencesCount = async () => {
    if (!note.source_note_ids || note.source_note_ids.length === 0) {
      setExistingReferencesCount(0)
      return
    }

    const { data, error } = await supabase
      .from("notes")
      .select("id")
      .in("id", note.source_note_ids)

    if (error) {
      console.error("Error fetching source notes count:", error)
      return
    }

    setExistingReferencesCount(data?.length || 0)
  }

  const deleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this compiled note?")) return

    const { error } = await supabase.from("compiled_notes").delete().eq("id", note.id)

    if (error) {
      console.error("Error deleting compiled note:", error)
      toast.error("Failed to delete note")
    } else {
      toast.success("Compiled note deleted")
      onRefresh()
    }
  }

  return (
    <>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-all border-accent/10 hover:border-accent/30"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{note.title}</h3>
          </div>
          <Button size="icon" variant="ghost" onClick={deleteNote} className="h-6 w-6 flex-shrink-0">
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>

        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {existingReferencesCount} references • {new Date(note.created_at).toLocaleDateString()}
        </p>
      </Card>

      <CompiledNoteDetailDialog note={note} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  )
}
