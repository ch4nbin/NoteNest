"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CompiledNote, Note, Profile } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { X, Volume2, Share2, Loader2, Square } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface CompiledNoteDetailDialogProps {
  note: CompiledNote
  isOpen: boolean
  onClose: () => void
  userId?: string
}

export function CompiledNoteDetailDialog({ note, isOpen, onClose, userId }: CompiledNoteDetailDialogProps) {
  const [sourceNotes, setSourceNotes] = useState<Record<string, Note>>({})
  const [friendProfiles, setFriendProfiles] = useState<Record<string, Profile>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      if (note.source_note_ids && note.source_note_ids.length > 0) {
        fetchSourceNotes()
      } else {
        setSourceNotes({})
        setFriendProfiles({})
      }
    } else {
      // Clear state when dialog closes
      setSourceNotes({})
      setFriendProfiles({})
      setCurrentUserId(null)
      // Cleanup audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }
      setIsPlayingAudio(false)
      setIsLoadingAudio(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, note.source_note_ids?.join(","), note.id])

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const userIdToUse = user?.id || userId || null
    setCurrentUserId(userIdToUse)
    return userIdToUse
  }

  const fetchSourceNotes = async () => {
    // Get current user ID first
    const userIdToUse = await getCurrentUserId()
    if (!userIdToUse) return

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .in("id", note.source_note_ids || [])

    if (error) {
      console.error("Error fetching source notes:", error)
      return
    }

    // Create a map of note ID to note for easy lookup
    const notesMap: Record<string, Note> = {}
    data?.forEach((note) => {
      notesMap[note.id] = note
    })
    setSourceNotes(notesMap)

    // Fetch friend profiles for notes that don't belong to current user
    if (data) {
      const friendNoteUserIds = [...new Set(data
        .map((n) => n.user_id)
        .filter((uid) => uid !== userIdToUse))]
      
      if (friendNoteUserIds.length > 0) {
        // Get accepted friendships
        const { data: friendships } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", userIdToUse)
          .eq("status", "accepted")

        const friendIds = friendships?.map((f) => f.friend_id) || []
        const actualFriendIds = friendNoteUserIds.filter((id) => friendIds.includes(id))

        if (actualFriendIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .in("id", actualFriendIds)

          if (profiles) {
            const profilesMap: Record<string, Profile> = {}
            profiles.forEach((profile) => {
              profilesMap[profile.id] = profile
            })
            setFriendProfiles(profilesMap)
          }
        }
      }
    }
  }

  const handlePlayAudio = async () => {
    // If already playing, stop it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlayingAudio(false)
      toast.info("Audio playback stopped")
      return
    }

    // If already loading, don't start another request
    if (isLoadingAudio) {
      return
    }

    setIsLoadingAudio(true)

    try {
      // Prepare text content - handle both object and string formats
      let textContent: string
      if (typeof note.content === "string") {
        textContent = note.content
      } else if (note.content && typeof note.content === "object") {
        textContent = JSON.stringify(note.content)
      } else {
        textContent = String(note.content || "")
      }

      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textContent,
          noteId: note.id,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to generate audio"
        try {
          const errorData = await response.json()
          errorMessage = errorData.details || errorData.error || errorMessage
          console.error("[Audio] API error:", errorData)
        } catch {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
          console.error("[Audio] API error (raw):", errorText)
        }
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      
      if (!blob || blob.size === 0) {
        throw new Error("Received empty audio file")
      }

      // Clean up previous audio if it exists
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }

      const audioUrl = URL.createObjectURL(blob)
      audioUrlRef.current = audioUrl
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onerror = (e) => {
        console.error("[Audio] Playback error:", e)
        toast.error("Failed to play audio file")
        setIsPlayingAudio(false)
        setIsLoadingAudio(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
        audioRef.current = null
      }

      audio.onended = () => {
        setIsPlayingAudio(false)
        setIsLoadingAudio(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
        audioRef.current = null
      }

      await audio.play()
      setIsLoadingAudio(false)
      setIsPlayingAudio(true)
      toast.success("Playing note audio")
    } catch (error) {
      console.error("[Audio] Error playing audio:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to play audio"
      toast.error(errorMessage)
      setIsPlayingAudio(false)
      setIsLoadingAudio(false)
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
      }
      audioRef.current = null
    }
  }

  const handleShareToX = () => {
    setIsSharing(true)

    const shareText = `Just created compiled notes on "${note.title}" using NoteNest! #NoteNest #StudyTech`
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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen m-0 rounded-none flex flex-col !top-0 !left-0 !translate-x-0 !translate-y-0 !p-0 sm:!max-w-full" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl gradient-text">{note.title}</DialogTitle>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {Object.keys(sourceNotes).length} references
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePlayAudio}
                  disabled={isLoadingAudio}
                  title={isPlayingAudio ? "Stop audio" : "Play as audio"}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlayingAudio ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={handleShareToX} disabled={isSharing} title="Share on X">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={onClose} title="Close">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-20">
            <div className="space-y-4">
              {note.content && typeof note.content === "object" && "sections" in note.content ? (
                (() => {
                  // Create a mapping of source note IDs to their citation numbers
                  // Numbers are assigned based on the order in note.source_note_ids
                  const citationNumberMap: Record<string, number> = {}
                  if (note.source_note_ids) {
                    note.source_note_ids.forEach((sourceId, index) => {
                      if (sourceNotes[sourceId]) {
                        citationNumberMap[sourceId] = index + 1
                      }
                    })
                  }

                  return (note.content.sections as Array<{ title: string; content: string; source_note_ids?: string[] }>).map(
                    (section: { title: string; content: string; source_note_ids?: string[] }, index: number) => {
                      const sectionSourceIds = section.source_note_ids || []
                      const existingSources = sectionSourceIds.filter((id) => sourceNotes[id])

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-primary">{section.title}</h3>
                            {existingSources.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {existingSources.map((sourceId) => {
                                  const sourceNote = sourceNotes[sourceId]
                                  if (!sourceNote) return null
                                  const citationNumber = citationNumberMap[sourceId]

                                  return (
                                    <Tooltip key={sourceId}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="text-xs cursor-help bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                                        >
                                          {citationNumber}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <div className="space-y-1">
                                          <p className="font-semibold text-sm">{sourceNote.title}</p>
                                          {(() => {
                                            const userIdToUse = currentUserId || userId
                                            const isFriendNote = userIdToUse && sourceNote.user_id !== userIdToUse
                                            const friendProfile = isFriendNote ? friendProfiles[sourceNote.user_id] : null
                                            
                                            return (
                                              <>
                                                {friendProfile && (
                                                  <p className="text-xs text-primary font-medium">
                                                    By {friendProfile.username || friendProfile.email || "Friend"}
                                                  </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(sourceNote.created_at).toLocaleDateString()}
                                                </p>
                                              </>
                                            )
                                          })()}
                                          {sourceNote.tags && sourceNote.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {sourceNote.tags.slice(0, 3).map((tag) => (
                                                <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {section.content}
                          </p>
                        </div>
                      )
                    },
                  )
                })()
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(note.content, null, 2)}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
