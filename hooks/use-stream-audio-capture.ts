import { useState, useEffect, useRef, useCallback } from "react"

interface UseStreamAudioCaptureOptions {
  stream: MediaStream | null
  onAudioChunk?: (audioBlob: Blob) => void
  chunkInterval?: number // in milliseconds, default 5000 (5 seconds for more frequent transcription)
  enabled?: boolean
}

interface UseStreamAudioCaptureReturn {
  isCapturing: boolean
  start: () => void
  stop: () => void
  error: string | null
}

/**
 * Hook for capturing audio from an existing MediaStream (e.g., from screen capture)
 * This extracts the audio track from the stream and records it
 */
export function useStreamAudioCapture({
  stream,
  onAudioChunk,
  chunkInterval = 3000, // 3 seconds for more frequent transcription
  enabled = true,
}: UseStreamAudioCaptureOptions): UseStreamAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)

  // Extract audio track from stream
  useEffect(() => {
    if (!stream || !enabled) {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
        audioStreamRef.current = null
      }
      setIsCapturing(false)
      return
    }

    const audioTracks = stream.getAudioTracks()
    console.log(`[Audio Capture] Stream received, audio tracks: ${audioTracks.length}`)
    
    if (audioTracks.length === 0) {
      setError("No audio track in stream. Make sure to enable 'Share tab audio' or 'Share system audio'.")
      setIsCapturing(false)
      return
    }

    // Create a new stream with just the audio track
    const audioStream = new MediaStream(audioTracks)
    audioStreamRef.current = audioStream
    setError(null)
    console.log("[Audio Capture] Audio stream created, ready to start recording")

    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
        audioStreamRef.current = null
      }
    }
  }, [stream, enabled])

  const start = useCallback(() => {
    if (!audioStreamRef.current) {
      setError("No audio stream available")
      return
    }

    try {
      // Create MediaRecorder for audio stream
      const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
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

      // Start recording
      mediaRecorder.start(1000) // Collect data every second

      // Set up timer to send chunks periodically
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          // Stop and restart to create a chunk
          mediaRecorder.stop()
          // Restart immediately
          setTimeout(() => {
            audioChunksRef.current = []
            if (audioStreamRef.current) {
              mediaRecorder.start(1000)
            }
          }, 100)
        }
      }, chunkInterval)

      setIsCapturing(true)
      setError(null)
    } catch (err) {
      console.error("Error starting audio capture:", err)
      setError(err instanceof Error ? err.message : "Failed to start audio capture")
      setIsCapturing(false)
    }
  }, [chunkInterval, onAudioChunk])

  const stop = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    setIsCapturing(false)
  }, [])

  // Auto-start when stream is available
  useEffect(() => {
    // Check if we have an audio stream and should start
    if (stream && enabled && audioStreamRef.current && !isCapturing) {
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        console.log("[Audio Capture] Auto-starting audio capture...")
        // Small delay to ensure everything is ready
        const timer = setTimeout(() => {
          start()
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [stream, enabled, isCapturing, start])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stop])

  return {
    isCapturing,
    start,
    stop,
    error,
  }
}

