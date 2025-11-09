"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Video, Square, Loader2, Mic, MicOff } from "lucide-react"
import { toast } from "sonner"
import { parseZoomLink, generateZoomJoinUrl } from "@/lib/utils/zoom"

interface ZoomMeetingBotProps {
  zoomUrl: string
  onAudioStreamReady?: (stream: MediaStream) => void
  onMeetingEnd?: () => void
}

export function ZoomMeetingBot({ zoomUrl, onAudioStreamReady, onMeetingEnd }: ZoomMeetingBotProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [isInMeeting, setIsInMeeting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const zoomWindowRef = useRef<Window | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (zoomWindowRef.current) {
        zoomWindowRef.current.close()
      }
    }
  }, [])

  const joinMeeting = async () => {
    const zoomInfo = parseZoomLink(zoomUrl)
    if (!zoomInfo.isValid || !zoomInfo.meetingId) {
      setError("Invalid Zoom link")
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      // Generate join URL
      const joinUrl = generateZoomJoinUrl(zoomInfo.meetingId, zoomInfo.password || undefined)
      
      toast.info("Opening Zoom meeting. After joining, click 'Capture Audio' to start transcription.")
      
      // Open Zoom meeting in new window/tab
      zoomWindowRef.current = window.open(joinUrl, "_blank")
      
      if (!zoomWindowRef.current) {
        setError("Please allow popups to join the meeting")
        setIsJoining(false)
        toast.error("Popup blocked. Please allow popups and try again.")
        return
      }

      setIsInMeeting(true)
      setIsJoining(false)
      
      // Auto-prompt for audio capture after a delay
      setTimeout(() => {
        toast.info("Click 'Capture Audio' below to start capturing meeting audio", { duration: 5000 })
      }, 3000)

    } catch (err) {
      console.error("[Zoom Bot] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to join meeting")
      setIsJoining(false)
    }
  }

  const captureAudioStream = async () => {
    try {
      setError(null)
      
      // Request screen capture with audio
      // User should select the Zoom window/tab
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
        throw new Error("No audio track. Make sure to check 'Share tab audio' or 'Share system audio' in the browser prompt.")
      }

      audioStreamRef.current = stream
      setAudioEnabled(true)
      onAudioStreamReady?.(stream)

      console.log("[Zoom Bot] Audio captured:", audioTracks[0].label)
      toast.success("Audio capture started! Transcription will begin automatically.")

      // Handle track ending
      audioTracks.forEach((track) => {
        track.onended = () => {
          setAudioEnabled(false)
          audioStreamRef.current = null
          toast.info("Audio capture stopped")
        }
      })

    } catch (err) {
      console.error("[Zoom Bot] Audio capture error:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to capture audio"
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const leaveMeeting = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (zoomWindowRef.current) {
      zoomWindowRef.current.close()
      zoomWindowRef.current = null
    }
    setIsInMeeting(false)
    setAudioEnabled(false)
    onMeetingEnd?.()
    toast.info("Left meeting")
  }

  return (
    <div className="relative h-full w-full bg-black rounded-lg overflow-hidden flex flex-col">
      {!isInMeeting ? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Join Zoom Meeting</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Click below to join the Zoom meeting. After joining, you'll be prompted to share your screen/audio.
            <br /><br />
            <strong>Important:</strong> When prompted, select "Share Computer Sound" to capture meeting audio.
          </p>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 max-w-md">
              {error}
            </div>
          )}
          <Button onClick={joinMeeting} disabled={isJoining} className="bg-primary">
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-full relative">
          <div className="flex-1 bg-black flex items-center justify-center">
            <div className="text-center text-white/70">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Zoom meeting opened in new window</p>
              <p className="text-xs mt-2 opacity-70">Click 'Capture Audio' to start transcription</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
            {!audioEnabled && (
              <Button onClick={captureAudioStream} className="bg-primary w-full">
                <Mic className="w-4 h-4 mr-2" />
                Capture Audio
              </Button>
            )}
            <div className="flex items-center justify-between bg-black/70 text-white p-3 rounded-lg">
              <div className="flex items-center gap-2">
                {audioEnabled ? (
                  <>
                    <Mic className="w-4 h-4 text-green-500" />
                    <span className="text-xs">Audio captured - Transcription active</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs">Click 'Capture Audio' above to start</span>
                  </>
                )}
              </div>
              <Button onClick={leaveMeeting} variant="destructive" size="sm">
                <Square className="w-4 h-4 mr-2" />
                Leave Meeting
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

