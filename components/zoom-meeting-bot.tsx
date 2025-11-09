"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Video, Square, Mic } from "lucide-react"
import { toast } from "sonner"
import { parseZoomLink, generateZoomJoinUrl } from "@/lib/utils/zoom"

interface ZoomMeetingBotProps {
  zoomUrl: string
  onAudioStreamReady?: (stream: MediaStream) => void
  onMeetingEnd?: () => void
}

export function ZoomMeetingBot({ zoomUrl, onAudioStreamReady, onMeetingEnd }: ZoomMeetingBotProps) {
  const [step, setStep] = useState<"join" | "capture" | "active">("join")
  const [error, setError] = useState<string | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const joinUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleJoinMeeting = async () => {
    const zoomInfo = parseZoomLink(zoomUrl)
    if (!zoomInfo.isValid || !zoomInfo.meetingId) {
      setError("Invalid Zoom link")
      return
    }

    setError(null)
    
    try {
      // Generate join URL
      const url = generateZoomJoinUrl(zoomInfo.meetingId, zoomInfo.password || undefined)
      joinUrlRef.current = url
      
      // Open Zoom in new tab
      window.open(url, "_blank")
      
      // Move to capture step
      setStep("capture")
      toast.success("Zoom opened! Join the meeting, then click 'Start Capturing' below.")
      
    } catch (err) {
      console.error("[Zoom Bot] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to open meeting")
    }
  }

  const handleStartCapture = async () => {
    try {
      setError(null)
      
      // Request screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          cursor: "never",
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints,
      })

      // Stop video tracks immediately (we only need audio)
      stream.getVideoTracks().forEach((track) => track.stop())

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("No audio detected. Make sure to check 'Share tab audio' when prompted.")
      }

      audioStreamRef.current = stream
      setStep("active")
      onAudioStreamReady?.(stream)

      toast.success("Capturing audio! Transcription starting...")

      // Handle track ending
      audioTracks.forEach((track) => {
        track.onended = () => {
          audioStreamRef.current = null
          setStep("capture")
          toast.info("Audio capture stopped")
        }
      })

    } catch (err) {
      console.error("[Zoom Bot] Audio capture error:", err)
      if (err instanceof Error && err.name !== "NotAllowedError") {
        const errorMsg = err.message || "Failed to capture audio"
        setError(errorMsg)
        toast.error(errorMsg)
      }
      // If user cancels, don't show error
    }
  }

  const handleStop = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    setStep("join")
    onMeetingEnd?.()
    toast.info("Stopped capturing")
  }

  return (
    <div className="relative h-full w-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {step === "join" && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Join Zoom Meeting</h3>
          <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
            Click to open Zoom in a new tab
          </p>
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-3 max-w-xs text-center">
              {error}
            </div>
          )}
          <Button onClick={handleJoinMeeting} className="bg-primary">
            <Video className="w-4 h-4 mr-2" />
            Open Zoom Meeting
          </Button>
        </div>
      )}

      {step === "capture" && (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Start Capturing</h3>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 max-w-sm">
            <p className="text-xs font-medium text-primary mb-2">📋 Instructions:</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 text-left list-decimal list-inside">
              <li>Join the Zoom meeting in the new tab</li>
              <li>Click "Start Capturing" below</li>
              <li>Select the <strong>Zoom tab</strong> when prompted</li>
              <li>Enable <strong>"Share tab audio"</strong></li>
            </ol>
          </div>
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-3 max-w-xs text-center">
              {error}
            </div>
          )}
          <Button onClick={handleStartCapture} className="bg-primary">
            <Mic className="w-4 h-4 mr-2" />
            Start Capturing Audio
          </Button>
        </div>
      )}

      {step === "active" && (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-primary">Capturing Audio</h3>
              <p className="text-xs text-muted-foreground">
                Transcription active • Check Transcript tab
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <Button onClick={handleStop} variant="destructive" className="w-full" size="sm">
              <Square className="w-3 h-3 mr-2" />
              Stop Capturing
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

