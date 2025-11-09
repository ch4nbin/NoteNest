"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Save, LinkIcon, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { isZoomLink, isYouTubeLink, requiresScreenCapture, parseZoomLink, generateZoomJoinUrl } from "@/lib/utils/zoom"
import { LiveTranscriptionRecorder } from "@/components/live-transcription-recorder"
import { ScreenCaptureViewer } from "@/components/screen-capture-viewer"
import { ZoomMeetingBot } from "@/components/zoom-meeting-bot"
import { useStreamAudioCapture } from "@/hooks/use-stream-audio-capture"

interface NoteCreatorProps {
  userId: string
}

interface NoteSection {
  title: string
  content: string
}

interface QnAItem {
  question: string
  answer: string
  added: boolean
}

export function NoteCreator({ userId }: NoteCreatorProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [noteSections, setNoteSections] = useState<NoteSection[]>([])
  const [qnaHistory, setQnaHistory] = useState<QnAItem[]>([])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [isAskingQuestion, setIsAskingQuestion] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [contentStarted, setContentStarted] = useState(false)
  const [isZoomMeeting, setIsZoomMeeting] = useState(false)
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false)
  const [requiresCapture, setRequiresCapture] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false)
  const [capturedStream, setCapturedStream] = useState<MediaStream | null>(null)
  const noteGenerationInProgressRef = useRef(false)
  const noteGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Check if URL requires screen capture
  const checkUrlType = (inputUrl: string) => {
    const isZoom = isZoomLink(inputUrl)
    const isYouTube = isYouTubeLink(inputUrl)
    const needsCapture = requiresScreenCapture(inputUrl)
    
    setIsZoomMeeting(isZoom)
    setIsYouTubeVideo(isYouTube)
    setRequiresCapture(needsCapture)
    
    return needsCapture
  }

  const handleLoadContent = async () => {
    if (!url) {
      toast.error("Please enter a URL")
      return
    }
    
    // Cleanup interval will be set up by useEffect when contentStarted changes

    // For Zoom links, use Zoom bot
    if (isZoomLink(url)) {
      setContentStarted(true)
      const zoomInfo = parseZoomLink(url)
      if (zoomInfo.isValid && zoomInfo.meetingId) {
        toast.success("Zoom meeting detected. Joining as bot to capture audio...")
      } else {
        toast.error("Invalid Zoom link format")
        setContentStarted(false)
      }
      return
    }
    
    // For YouTube links, use screen capture
    if (isYouTubeLink(url)) {
      setContentStarted(true)
      toast.success("YouTube video detected. Start screen capture and share the tab with the video to begin transcription.")
      return
    }

    // For non-Zoom URLs, use the existing flow
    setIsLoading(true)
    setIsGenerating(true)
    setContentStarted(true)
    setNoteSections([])

    try {
      const response = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) throw new Error("Failed to generate notes")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))

            if (data.type === "title") {
              setNoteTitle(data.content)
            } else if (data.type === "tags") {
              setNoteTags(data.content)
            } else if (data.type === "section") {
              setNoteSections((prev) => [...prev, data.content])
            } else if (data.type === "done") {
              setIsGenerating(false)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating notes:", error)
      toast.error("Failed to generate notes")
      setIsGenerating(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle live transcript updates (every word)
  const handleTranscriptUpdate = (fullTranscript: string) => {
    setTranscript(fullTranscript)
  }

  // Capture audio from screen capture stream - transcribe continuously
  const { isCapturing: isAudioCapturing } = useStreamAudioCapture({
    stream: capturedStream,
    onAudioChunk: async (audioBlob) => {
      setIsTranscribing(true)
      const chunkStartTime = Date.now()
      
      try {
        console.log(`[Audio] Transcribing chunk, size: ${audioBlob.size} bytes`)
        const formData = new FormData()
        formData.append("audio", audioBlob, "chunk.webm")

        const response = await fetch("/api/notes/transcribe-audio", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = "Transcription failed"
          let isRateLimit = false
          
          try {
            const errorData = await response.json()
            
            // Check for rate limit
            if (response.status === 429 || errorData.error === "Rate limit exceeded") {
              isRateLimit = true
              errorMessage = errorData.details || "Rate limit exceeded. Please wait a moment before trying again."
            } else {
              // Handle different error formats
              if (typeof errorData === "string") {
                errorMessage = errorData
              } else if (errorData.details) {
                errorMessage = typeof errorData.details === "string" 
                  ? errorData.details 
                  : JSON.stringify(errorData.details)
              } else if (errorData.error) {
                errorMessage = typeof errorData.error === "string"
                  ? errorData.error
                  : JSON.stringify(errorData.error)
              } else {
                errorMessage = JSON.stringify(errorData)
              }
            }
            console.error("[Audio] Transcription error details:", JSON.stringify(errorData, null, 2))
          } catch {
            try {
              const errorText = await response.text()
              errorMessage = errorText || errorMessage
              if (response.status === 429) {
                isRateLimit = true
              }
            } catch {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`
              if (response.status === 429) {
                isRateLimit = true
                errorMessage = "Rate limit exceeded. Please wait before trying again."
              }
            }
          }
          
          // Don't show toast for rate limits to avoid spam - just log it
          if (isRateLimit) {
            console.warn("[Audio] Rate limit hit, will retry on next chunk")
            // Don't throw - let it silently fail and retry on next chunk
            return
          }
          
          throw new Error(`Transcription failed: ${errorMessage}`)
        }

        const data = await response.json()
        const chunkTranscript = data.transcript || ""
        const transcriptionTime = Date.now() - chunkStartTime
        console.log(`[Audio] Transcription completed in ${transcriptionTime}ms: ${chunkTranscript.substring(0, 50)}...`)

        if (chunkTranscript) {
          // Append new transcript with a space separator - continuously growing transcript
          setTranscript((prevTranscript) => {
            // Check if this chunk is already in the transcript to avoid duplicates
            const trimmedChunk = chunkTranscript.trim()
            if (prevTranscript && prevTranscript.includes(trimmedChunk)) {
              console.warn("[Audio] Duplicate chunk detected, skipping:", trimmedChunk.substring(0, 50))
              return prevTranscript
            }
            
            const newTranscript = prevTranscript 
              ? `${prevTranscript} ${trimmedChunk}`.trim()
              : trimmedChunk
            
            // Update parent component with full transcript
            handleTranscriptUpdate(newTranscript)
            
            // Generate notes from the NEW chunk immediately
            // Simple approach: summarize each chunk and add to notes
            if (trimmedChunk && trimmedChunk.length > 10) { // Only if chunk has meaningful content
              // Generate notes from this chunk immediately (no debounce for responsiveness)
              Promise.resolve().then(() => {
                generateNotesFromChunk(trimmedChunk).catch((err) => {
                  console.error("[Notes] Error generating notes from chunk:", err)
                })
              })
            }
            
            return newTranscript
          })
        } else {
          console.warn("[Audio] Empty transcript received")
        }
      } catch (err) {
        console.error("[Audio] Error transcribing audio:", err)
        // Don't show toast for every error to avoid spam, just log it
        if (err instanceof Error && !err.message.includes("429")) {
          // Only show toast for non-rate-limit errors
          toast.error(`Transcription error: ${err.message}`, { duration: 3000 })
        }
      } finally {
        setIsTranscribing(false)
      }
    },
    chunkInterval: 3000, // Transcribe every 3 seconds for more frequent updates
    enabled: !!capturedStream && contentStarted,
  })

  // Simple function to generate notes from a single chunk
  // Summarizes the chunk and adds it directly to notes
  const generateNotesFromChunk = async (chunk: string) => {
    if (!chunk.trim() || chunk.trim().length < 10) {
      return
    }

    // Check if already generating to avoid overlapping requests
    if (noteGenerationInProgressRef.current) {
      console.log("[Notes] Note generation already in progress, skipping")
      return
    }

    noteGenerationInProgressRef.current = true
    setIsLiveTranscribing(true)
    setIsGenerating(true)

    try {
      console.log("[Notes] Summarizing chunk, length:", chunk.length)
      
      // Simple API call to summarize this chunk
      const response = await fetch("/api/notes/generate-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptChunk: chunk, // Just this chunk
          existingNotes: noteSections, // Current notes
          meetingTitle: noteTitle || undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[Notes] API error:", errorText)
        return
      }
      
      console.log("[Notes] API response received, parsing...")

      const reader = response.body?.getReader()
      if (!reader) {
        console.error("[Notes] No reader available")
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""

      // Process stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "title" && !noteTitle) {
                console.log("[Notes] Setting title:", data.content)
                setNoteTitle(data.content)
              } else if (data.type === "add-section") {
                // Add new section immediately
                console.log("[Notes] Adding new section:", data.content.title)
                setNoteSections((prev) => {
                  // Check for duplicates
                  const exists = prev.some(s => 
                    s.title === data.content.title && 
                    s.content === data.content.content
                  )
                  if (exists) {
                    console.log("[Notes] Section already exists, skipping")
                    return prev
                  }
                  const updated = [...prev, data.content]
                  console.log("[Notes] Sections after add:", updated.length)
                  return updated
                })
              } else if (data.type === "update-section") {
                // Update existing section
                console.log("[Notes] Updating section at index:", data.index)
                setNoteSections((prev) => {
                  const updated = [...prev]
                  if (data.index >= 0 && data.index < updated.length) {
                    updated[data.index] = {
                      ...updated[data.index],
                      ...data.content,
                    }
                    console.log("[Notes] Section updated")
                  }
                  return updated
                })
              }
            } catch (parseError) {
              console.error("[Notes] Error parsing stream data:", parseError)
            }
          }
        }
      }
    } catch (error) {
        console.error("[Notes] Error generating notes from chunk:", error)
      } finally {
        noteGenerationInProgressRef.current = false
        // Cleanup is now handled by the interval in useEffect
      }
    }

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) {
      toast.error("Please enter a question")
      return
    }

    setIsAskingQuestion(true)

    try {
      // Use the full transcript for Q&A context, not just note sections
      const response = await fetch("/api/notes/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          url,
          context: noteSections,
          transcript: transcript, // Include full transcript for better context
        }),
      })

      if (!response.ok) throw new Error("Failed to get answer")

      const data = await response.json()

      setQnaHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: data.answer,
          added: false,
        },
      ])

      setCurrentQuestion("")
    } catch (error) {
      console.error("Error asking question:", error)
      toast.error("Failed to get answer")
    } finally {
      setIsAskingQuestion(false)
    }
  }

  const handleAddToNote = (index: number) => {
    const qna = qnaHistory[index]

    setNoteSections((prev) => [
      ...prev,
      {
        title: qna.question,
        content: qna.answer,
      },
    ])

    setQnaHistory((prev) => prev.map((item, i) => (i === index ? { ...item, added: true } : item)))

    toast.success("Added to notes")
  }

  const handleSaveNote = async () => {
    // Allow saving at any point - don't require transcription to be complete
    // Check if we have content to save
    if (!noteTitle && noteSections.length === 0 && !transcript) {
      toast.error("No content to save. Please wait for notes to be generated or add content manually.")
      return
    }
    
    // If no sections but we have transcript, create a note from transcript
    let sectionsToSave = noteSections.length > 0 
      ? noteSections 
      : transcript 
        ? [{ title: "Transcript", content: transcript }]
        : []
    
    if (sectionsToSave.length === 0) {
      toast.error("No content to save. Please wait for notes or transcript to be generated.")
      return
    }

    try {
      // Step 1: Cleanup and consolidate notes before saving
      toast.info("Cleaning up and consolidating notes...")
      
      let cleanedSections = sectionsToSave
      if (sectionsToSave.length > 1) {
        try {
          const cleanupResponse = await fetch("/api/notes/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
              sections: sectionsToSave,
            }),
          })

          if (cleanupResponse.ok) {
            const cleanupData = await cleanupResponse.json()
            if (cleanupData.sections && Array.isArray(cleanupData.sections)) {
              cleanedSections = cleanupData.sections
              console.log(`[Save] Cleaned up ${sectionsToSave.length} sections into ${cleanedSections.length} sections`)
            }
          } else {
            console.warn("[Save] Cleanup failed, saving original sections")
          }
        } catch (cleanupError) {
          console.error("[Save] Error during cleanup:", cleanupError)
          // Continue with original sections if cleanup fails
        }
      }

      // Step 2: Generate title and tags using AI if this is a meeting note (Zoom/YouTube)
      let finalTitle = noteTitle
      let finalTags = noteTags

      if (isZoomMeeting || requiresCapture) {
        try {
          toast.info("Generating title and tags...")
          const metadataResponse = await fetch("/api/notes/generate-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sections: cleanedSections,
              transcript: transcript || undefined,
            }),
          })

          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json()
            finalTitle = metadata.title || finalTitle || `Meeting Notes - ${new Date().toLocaleDateString()}`
            finalTags = metadata.tags && metadata.tags.length > 0 ? metadata.tags : finalTags
            console.log("[Save] Generated metadata:", { title: finalTitle, tags: finalTags })
          } else {
            console.warn("[Save] Failed to generate metadata, using defaults")
            // Fallback to defaults if metadata generation fails
            if (!finalTitle) {
              finalTitle = `Meeting Notes - ${new Date().toLocaleDateString()}`
            }
          }
        } catch (metadataError) {
          console.error("[Save] Error generating metadata:", metadataError)
          // Fallback to defaults if metadata generation fails
          if (!finalTitle) {
            finalTitle = `Meeting Notes - ${new Date().toLocaleDateString()}`
          }
        }
      } else {
        // For non-meeting notes, use existing title or generate default
        if (!finalTitle) {
          finalTitle = `Meeting Notes - ${new Date().toLocaleDateString()}`
        }
      }

      // Step 3: Save the note
      toast.info("Saving note...")
      const response = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          content: { sections: cleanedSections, transcript: transcript || undefined },
          tags: finalTags,
          source_url: url,
          source_type: isZoomMeeting ? "zoom" : "url",
          is_public: false,
        }),
      })

      if (!response.ok) throw new Error("Failed to save note")

      toast.success("Note saved successfully!")
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving note:", error)
      toast.error("Failed to save note")
    }
  }

  return (
    <div className="flex h-full">
      {/* Left side - Content viewer (smaller) */}
      <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-border">
        <div className="p-6 border-b border-border bg-card">
          <h1 className="text-2xl font-bold mb-4">
            <span className="gradient-text">Create New Note</span>
          </h1>
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL (Zoom, YouTube, article, lecture, etc.)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                checkUrlType(e.target.value)
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLoadContent()}
              disabled={contentStarted}
              className="flex-1"
            />
            <Button onClick={handleLoadContent} disabled={isLoading || contentStarted} className="bg-primary">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {requiresCapture ? (
                    <Video className="w-4 h-4 mr-2" />
                  ) : (
                    <LinkIcon className="w-4 h-4 mr-2" />
                  )}
                  {requiresCapture ? "Setup Capture" : "Load"}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className={`flex-1 overflow-hidden ${requiresCapture && contentStarted ? "p-0" : "p-6 overflow-auto"}`}>
          {!contentStarted ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {requiresCapture ? (
                    <Video className="w-8 h-8 text-primary" />
                  ) : (
                    <LinkIcon className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {requiresCapture 
                    ? isZoomMeeting 
                      ? "Zoom Meeting Detected" 
                      : "YouTube Video Detected"
                    : "Paste a URL to get started"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {requiresCapture
                    ? isZoomMeeting
                      ? "Click 'Setup Capture' to start screen capture. Then join your Zoom meeting and share the tab or screen."
                      : "Click 'Setup Capture' to start screen capture. Open the YouTube video in another tab and share that tab to capture audio."
                    : "Enter a URL from YouTube, an article, or any online resource. AI will automatically generate notes as you go through the content."}
                </p>
              </div>
            </div>
          ) : isZoomMeeting ? (
            <ZoomMeetingBot
              zoomUrl={url}
              onAudioStreamReady={(stream) => {
                setCapturedStream(stream)
                toast.success("Zoom meeting audio captured. Transcription starting...")
              }}
              onMeetingEnd={() => {
                setCapturedStream(null)
              }}
            />
          ) : isYouTubeVideo ? (
            <ScreenCaptureViewer
              onStreamReady={(stream) => {
                setCapturedStream(stream)
                toast.success("Screen capture started. Make sure the YouTube video is playing in the shared tab.")
              }}
              onStreamStop={() => {
                setCapturedStream(null)
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto">
              <iframe src={url} className="w-full h-[600px] rounded-lg border border-border" title="Content" />
            </div>
          )}
        </div>
      </div>

      {/* Right side - AI Assistant (larger) */}
      <div className="flex-1 flex flex-col bg-card min-w-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg text-primary">AI Assistant</h2>
        </div>

        <Tabs defaultValue="notes" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="notes" className="flex-1">
              Notes
            </TabsTrigger>
            <TabsTrigger value="qna" className="flex-1">
              Q&A
            </TabsTrigger>
          </TabsList>

          {isZoomMeeting && (
            <TabsContent value="recorder" className="flex-1 flex flex-col mt-0">
              <ScrollArea className="flex-1 p-4">
                <Card className="p-4 mb-4">
                  <h3 className="font-semibold text-sm mb-2">Audio Capture Status</h3>
                  <div className="space-y-2">
                    {capturedStream ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span>Capturing audio from screen stream...</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Start screen capture to begin audio recording
                      </p>
                    )}
                    {isTranscribing && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Transcribing audio chunk...</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Ongoing Live Transcript */}
                <Card className="p-4 mb-4 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Live Transcript</h3>
                    {transcript && (
                      <span className="text-xs text-muted-foreground">
                        {transcript.split(/\s+/).length} words
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
                    {transcript ? (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {transcript}
                        </p>
                        {isTranscribing && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="italic">Processing next chunk...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {capturedStream
                              ? "Waiting for audio transcription..."
                              : "Start screen capture to begin transcription"}
                          </p>
                          {capturedStream && (
                            <p className="text-xs text-muted-foreground italic">
                              Audio is being processed every 5 seconds
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {isLiveTranscribing && (
                  <Card className="p-3 mb-4 bg-primary/10 border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-primary font-medium">Generating notes from latest chunk...</span>
                    </div>
                  </Card>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="notes" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {isGenerating && noteSections.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Generating notes from transcript...</p>
                    </div>
                  </div>
                )}

                {noteSections.length === 0 && !isGenerating && transcript && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Waiting for notes to be generated...</p>
                      <p className="text-xs text-muted-foreground">Transcript has {transcript.split(/\s+/).length} words</p>
                    </div>
                  </div>
                )}

                {noteSections.map((section, index) => (
                  <Card key={`${section.title}-${index}`} className="p-4 border-primary/20">
                    <h3 className="font-semibold text-sm text-primary mb-2">{section.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  </Card>
                ))}

                {(isGenerating || isLiveTranscribing) && noteSections.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating notes from transcript...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save button - always available if there's content to save */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSaveNote}
                className="w-full bg-primary"
                disabled={!noteTitle && !noteSections.length && !transcript}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Note
              </Button>
              {(!noteTitle && !noteSections.length && !transcript) && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Waiting for content to be generated...
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="qna" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {qnaHistory.map((item, index) => (
                  <Card key={index} className="p-4 border-accent/20">
                    <div className="mb-2">
                      <p className="font-semibold text-sm text-accent mb-1">Q: {item.question}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">A: {item.answer}</p>
                    </div>
                    {!item.added && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToNote(index)}
                        className="w-full mt-2"
                      >
                        Add to Notes
                      </Button>
                    )}
                    {item.added && <p className="text-xs text-primary text-center mt-2">✓ Added to notes</p>}
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                  disabled={isAskingQuestion || !contentStarted}
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={isAskingQuestion || !contentStarted}
                  size="icon"
                  className="bg-accent"
                >
                  {isAskingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
