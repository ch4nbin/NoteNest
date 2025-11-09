import { useState, useEffect, useRef, useCallback } from "react"

interface UseAudioCaptureOptions {
  onAudioChunk?: (audioBlob: Blob) => void
  chunkInterval?: number // in milliseconds, default 15000 (15 seconds)
  enabled?: boolean
}

interface UseAudioCaptureReturn {
  isCapturing: boolean
  isSupported: boolean
  start: () => Promise<void>
  stop: () => void
  error: string | null
}

/**
 * Hook for capturing audio from browser tab/system (not microphone)
 * Uses getDisplayMedia API to capture system audio or tab audio
 */
export function useAudioCapture({
  onAudioChunk,
  chunkInterval = 15000, // 15 seconds
  enabled = true,
}: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if getDisplayMedia is supported
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    ) {
      setIsSupported(true)
    } else {
      setIsSupported(false)
      setError("Screen capture API is not supported in this browser")
    }
  }, [])

  const start = useCallback(async () => {
    if (!isSupported) {
      setError("Screen capture API is not supported")
      return
    }

    try {
      // Request tab capture with audio
      // We request video but will only use the audio track
      // User should select "Share tab" and choose the current tab with the Zoom meeting
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser", // Prefer browser tab
          cursor: "never", // Don't capture cursor
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints,
      })

      // Stop video tracks immediately since we only need audio
      stream.getVideoTracks().forEach((track) => {
        track.stop()
      })

      // Check if we got an audio track
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("No audio track available. Please make sure to share system audio or tab audio.")
      }

      mediaStreamRef.current = stream

      // Create MediaRecorder to capture audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Send the accumulated chunk
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          onAudioChunk?.(audioBlob)
          audioChunksRef.current = []
        }
      }

      // Start recording and set up periodic chunk sending
      mediaRecorder.start(1000) // Collect data every second

      // Set up timer to send chunks periodically
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          // Stop and restart to create a chunk
          mediaRecorder.stop()
          // Restart immediately
          setTimeout(() => {
            audioChunksRef.current = []
            if (mediaStreamRef.current) {
              mediaRecorder.start(1000)
            }
          }, 100)
        }
      }, chunkInterval)

      setIsCapturing(true)
      setError(null)

      // Handle stream ending (user stops sharing)
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          stop()
        }
      })
    } catch (err) {
      console.error("Error starting audio capture:", err)
      setError(err instanceof Error ? err.message : "Failed to start audio capture")
      setIsCapturing(false)
    }
  }, [isSupported, chunkInterval, onAudioChunk])

  const stop = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    setIsCapturing(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    isCapturing,
    isSupported,
    start,
    stop,
    error,
  }
}

