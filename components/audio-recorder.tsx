"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, Square, Loader2, Play, Pause } from "lucide-react"
import { toast } from "sonner"

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onTranscriptionStart?: () => void
  onTranscriptionComplete?: (transcript: string) => void
  disabled?: boolean
}

export function AudioRecorder({
  onRecordingComplete,
  onTranscriptionStart,
  onTranscriptionComplete,
  disabled = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream

      // Create MediaRecorder
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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        onRecordingComplete(audioBlob)
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      toast.success("Recording started")
    } catch (error) {
      console.error("Error starting recording:", error)
      toast.error("Failed to start recording. Please check microphone permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsRecording(false)
      setIsPaused(false)
      toast.success("Recording stopped")
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
  }

  const handleTranscribe = async () => {
    if (!audioUrl) {
      toast.error("No recording available")
      return
    }

    setIsTranscribing(true)
    onTranscriptionStart?.()

    try {
      // Get the audio blob
      const response = await fetch(audioUrl)
      const audioBlob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      // Send to transcription API
      const transcribeResponse = await fetch("/api/notes/transcribe-audio", {
        method: "POST",
        body: formData,
      })

      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed")
      }

      const data = await transcribeResponse.json()
      onTranscriptionComplete?.(data.transcript)
      toast.success("Transcription completed")
    } catch (error) {
      console.error("Error transcribing audio:", error)
      toast.error("Failed to transcribe audio")
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
        audioRef.current.onended = () => setIsPlaying(false)
      }
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm mb-1">Audio Recorder</h3>
          <p className="text-xs text-muted-foreground">
            {isRecording
              ? `Recording: ${formatTime(recordingTime)}`
              : audioUrl
                ? `Recorded: ${formatTime(recordingTime)}`
                : "Ready to record"}
          </p>
        </div>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      <div className="flex gap-2">
        {!isRecording && !audioUrl && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="flex-1 bg-primary"
            size="sm"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        )}

        {audioUrl && !isRecording && (
          <>
            <Button
              onClick={playRecording}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            <Button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="flex-1 bg-accent"
              size="sm"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Transcribe
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

