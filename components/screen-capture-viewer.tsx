"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Video, Square, Monitor, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ScreenCaptureViewerProps {
  onStreamReady?: (stream: MediaStream) => void
  onStreamStop?: () => void
}

export function ScreenCaptureViewer({ onStreamReady, onStreamStop }: ScreenCaptureViewerProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  const startCapture = async () => {
    try {
      setError(null)
      
      // Request screen capture with audio
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser", // Prefer browser tab
          cursor: "always",
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints,
      })

      // Check if we got video track
      const videoTracks = mediaStream.getVideoTracks()
      const audioTracks = mediaStream.getAudioTracks()
      
      console.log(`[Screen Capture] Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`)
      
      if (videoTracks.length === 0) {
        mediaStream.getTracks().forEach((track) => track.stop())
        throw new Error("No video track available")
      }

      // Warn if no audio track
      if (audioTracks.length === 0) {
        console.warn("[Screen Capture] No audio track detected. User may not have enabled 'Share tab audio'")
        toast.warning("No audio detected. Make sure to check 'Share tab audio' in the browser prompt.", { duration: 5000 })
      } else {
        console.log("[Screen Capture] Audio track detected:", audioTracks[0].label)
      }

      setStream(mediaStream)
      setIsCapturing(true)

      // Set video source and ensure it plays
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.muted = true // Mute to avoid feedback
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err)
          toast.error("Could not play video preview. Audio capture should still work.")
        })
      }

      // Notify parent component
      onStreamReady?.(mediaStream)

      // Handle track ending (user stops sharing)
      mediaStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          stopCapture()
        }
      })

      toast.success("Screen capture started. Join your Zoom meeting and share this tab or your screen.")
    } catch (err) {
      console.error("Error starting screen capture:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to start screen capture"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
    onStreamStop?.()
    toast.info("Screen capture stopped")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="relative h-full w-full bg-black rounded-lg overflow-hidden">
      {!isCapturing ? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Monitor className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Start Screen Capture</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Click the button below to share your screen or a browser tab. 
            <br /><br />
            <strong>For Zoom:</strong> Join your meeting in another tab/window, then share that tab or screen.
            <br /><br />
            <strong>For YouTube:</strong> Open the video in another tab, then share that tab. Make sure to check "Share tab audio" in the browser prompt.
          </p>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 max-w-md">
              {error}
            </div>
          )}
          <Button onClick={startCapture} className="bg-primary">
            <Video className="w-4 h-4 mr-2" />
            Start Screen Capture
          </Button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain bg-black"
            style={{ backgroundColor: "#000" }}
          />
          {stream && stream.getVideoTracks().length > 0 && (
            <div className="absolute top-4 left-4 bg-green-500/90 text-white text-xs px-3 py-2 rounded-lg">
              ✓ Video: {stream.getVideoTracks()[0].label || "Active"}
            </div>
          )}
          {stream && stream.getAudioTracks().length > 0 && (
            <div className="absolute top-16 left-4 bg-green-500/90 text-white text-xs px-3 py-2 rounded-lg">
              ✓ Audio: {stream.getAudioTracks()[0].label || "Active"}
            </div>
          )}
          {stream && stream.getAudioTracks().length === 0 && (
            <div className="absolute top-16 left-4 bg-yellow-500/90 text-white text-xs px-3 py-2 rounded-lg">
              ⚠ No audio track - Check "Share tab audio"
            </div>
          )}
          <div className="absolute top-4 right-4 z-10">
            <Button onClick={stopCapture} variant="destructive" size="sm">
              <Square className="w-4 h-4 mr-2" />
              Stop Capture
            </Button>
          </div>
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
            Screen captured - Audio is being recorded
          </div>
        </>
      )}
    </div>
  )
}

