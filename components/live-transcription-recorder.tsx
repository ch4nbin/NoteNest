"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Square, Loader2, AlertCircle, Volume2 } from "lucide-react"
import { toast } from "sonner"
import { useAudioCapture } from "@/hooks/use-audio-capture"

interface LiveTranscriptionRecorderProps {
  onTranscriptUpdate?: (transcript: string) => void
  onChunkComplete?: (chunk: string) => void
  disabled?: boolean
  autoStart?: boolean
}

export function LiveTranscriptionRecorder({
  onTranscriptUpdate,
  onChunkComplete,
  disabled = false,
  autoStart = false,
}: LiveTranscriptionRecorderProps) {
  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [lastChunkTranscript, setLastChunkTranscript] = useState("")
  const [chunkCount, setChunkCount] = useState(0)

  const { isCapturing, isSupported, start, stop, error } = useAudioCapture({
    onAudioChunk: async (audioBlob) => {
      // Send audio chunk to transcription API
      setIsTranscribing(true)
      setChunkCount((prev) => prev + 1)
      console.log(`[Audio Capture] Sending chunk ${chunkCount + 1} to transcription API, size: ${audioBlob.size} bytes`)

      try {
        const formData = new FormData()
        formData.append("audio", audioBlob, "chunk.webm")

        console.log("[Audio Capture] Calling /api/notes/transcribe-audio...")
        const response = await fetch("/api/notes/transcribe-audio", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          let errorText = ""
          try {
            const errorData = await response.json()
            errorText = errorData.details || errorData.error || JSON.stringify(errorData)
            console.error("[Audio Capture] Transcription failed:", errorData)
          } catch {
            errorText = await response.text()
            console.error("[Audio Capture] Transcription failed (text):", errorText)
          }
          throw new Error(`Transcription failed (${response.status}): ${errorText}`)
        }

        const data = await response.json()
        const chunkTranscript = data.transcript || ""
        
        if (data.warning) {
          console.warn(`[Audio Capture] Warning: ${data.warning}`)
          toast.warning(data.warning)
        }
        
        console.log(`[Audio Capture] Received transcript (chunk ${chunkCount + 1}):`, chunkTranscript)

        if (chunkTranscript) {
          // Update full transcript
          const newTranscript = transcript ? `${transcript} ${chunkTranscript}` : chunkTranscript
          setTranscript(newTranscript)
          setLastChunkTranscript(chunkTranscript)
          onTranscriptUpdate?.(newTranscript)
          onChunkComplete?.(chunkTranscript)
          console.log(`[Audio Capture] Full transcript length: ${newTranscript.length} characters`)
        } else {
          console.warn("[Audio Capture] Empty transcript received")
          toast.warning("Received empty transcript. Is there audio playing?")
        }
      } catch (err) {
        console.error("[Audio Capture] Error transcribing audio chunk:", err)
        toast.error(`Failed to transcribe audio chunk: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setIsTranscribing(false)
      }
    },
    chunkInterval: 15000, // 15 seconds
    enabled: !disabled && autoStart,
  })

  // Auto-start capture when enabled
  useEffect(() => {
    if (autoStart && !disabled && isSupported && !isCapturing) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        start()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, disabled, isSupported, isCapturing, start])

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleStart = async () => {
    if (!isSupported) {
      toast.error("Screen capture API is not supported. Please use Chrome or Edge.")
      return
    }
    await start()
    toast.info(
      "In the browser prompt, select 'Share tab' and choose THIS tab (the one with NoteNest). Make sure to check 'Share tab audio'.",
      { duration: 5000 },
    )
  }

  const handleStop = () => {
    stop()
    toast.success("Audio capture stopped")
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm mb-1">Audio Capture</h3>
          <p className="text-xs text-muted-foreground">
            {isCapturing ? "Capturing audio..." : isSupported ? "Ready to capture" : "Not supported"}
          </p>
        </div>
        {!isSupported && <AlertCircle className="w-5 h-5 text-destructive" />}
      </div>

      {!isSupported && (
        <div className="bg-destructive/10 p-3 rounded-lg">
          <p className="text-xs text-destructive">
            Screen capture API is only available in Chrome and Edge browsers. Please switch browsers to capture audio.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {isCapturing ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>
                Capturing audio... Chunk {chunkCount} | {isTranscribing ? "Transcribing..." : "Waiting for next chunk"}
              </span>
            </div>
            <Button onClick={handleStop} variant="outline" className="w-full" size="sm">
              <Square className="w-4 h-4 mr-2" />
              Stop Capture
            </Button>
          </>
        ) : autoStart ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Starting audio capture...</span>
          </div>
        ) : (
          <Button
            onClick={handleStart}
            disabled={disabled || !isSupported}
            className="w-full bg-primary"
            size="sm"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Start Audio Capture
          </Button>
        )}
      </div>

      <div className="space-y-2 mt-4">
        {lastChunkTranscript && (
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-primary">Latest Chunk ({chunkCount})</h4>
              {isTranscribing && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {lastChunkTranscript || "Waiting for transcription..."}
            </p>
          </div>
        )}

        {transcript && (
          <div className="bg-muted/50 p-3 rounded-lg max-h-48 overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold">Full Transcript</h4>
              <span className="text-xs text-muted-foreground">{transcript.length} chars</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        )}

        {!transcript && isCapturing && !isTranscribing && (
          <div className="bg-muted/30 p-3 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-xs text-muted-foreground text-center italic">
              Waiting for first transcription... (chunks sent every 15 seconds)
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
