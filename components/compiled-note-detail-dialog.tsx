"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CompiledNote } from "@/lib/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Layers } from "lucide-react"

interface CompiledNoteDetailDialogProps {
  note: CompiledNote
  isOpen: boolean
  onClose: () => void
}

export function CompiledNoteDetailDialog({ note, isOpen, onClose }: CompiledNoteDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-accent" />
            <DialogTitle className="text-2xl gradient-text">{note.title}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">Compiled from {note.source_note_ids?.length || 0} notes</p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {note.content && typeof note.content === "object" && "sections" in note.content ? (
              (note.content.sections as Array<{ title: string; content: string }>).map(
                (section: { title: string; content: string }, index: number) => (
                  <div key={index} className="space-y-2">
                    <h3 className="font-semibold text-accent">{section.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(note.content, null, 2)}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
