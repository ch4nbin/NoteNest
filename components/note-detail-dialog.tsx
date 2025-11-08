"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Note } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Volume2, Share2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface NoteDetailDialogProps {
  note: Note
  isOpen: boolean
  onClose: () => void
}

export function NoteDetailDialog({ note, isOpen, onClose }: NoteDetailDialogProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handlePlayAudio = async () => {
    setIsPlayingAudio(true)

    try {
      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: JSON.stringify(note.content),
          noteId: note.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate audio")

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setIsPlayingAudio(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.play()
      toast.success("Playing note audio")
    } catch (error) {
      console.error("Error playing audio:", error)
      toast.error("Failed to play audio")
      setIsPlayingAudio(false)
    }
  }

  const handleShareToX = () => {
    setIsSharing(true)

    const shareText = `Just created notes on "${note.title}" using NoteNest! #NoteNest #StudyTech`
    const shareUrl = window.location.origin + "/dashboard"
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

    window.open(twitterUrl, "_blank", "width=550,height=420")

    // Track share analytics
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId: note.id,
        action: "share",
      }),
    }).catch(console.error)

    setIsSharing(false)
    toast.success("Opening X to share your note!")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl gradient-text">{note.title}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {note.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlayAudio}
                disabled={isPlayingAudio}
                title="Play as audio"
              >
                {isPlayingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={handleShareToX} disabled={isSharing} title="Share on X">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {note.content && typeof note.content === "object" && "sections" in note.content ? (
              (note.content.sections as Array<{ title: string; content: string }>).map(
                (section: { title: string; content: string }, index: number) => (
                  <div key={index} className="space-y-2">
                    <h3 className="font-semibold text-primary">{section.title}</h3>
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

        {note.source_url && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Source:{" "}
              <a
                href={note.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {note.source_url}
              </a>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
