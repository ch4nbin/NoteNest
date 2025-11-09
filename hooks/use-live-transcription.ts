import { useState, useEffect, useRef, useCallback } from "react"

interface UseLiveTranscriptionOptions {
  onTranscriptUpdate?: (transcript: string) => void
  onChunkComplete?: (chunk: string) => void
  chunkInterval?: number // in milliseconds, default 15000 (15 seconds)
  enabled?: boolean
}

interface UseLiveTranscriptionReturn {
  transcript: string
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  error: string | null
}

/**
 * Hook for live transcription using Web Speech API
 * Provides real-time speech-to-text transcription in the browser
 */
export function useLiveTranscription({
  onTranscriptUpdate,
  onChunkComplete,
  chunkInterval = 15000, // 15 seconds
  enabled = true,
}: UseLiveTranscriptionOptions = {}): UseLiveTranscriptionReturn {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const chunkBufferRef = useRef<string>("")
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastChunkTimeRef = useRef<number>(Date.now())

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
    } else {
      setIsSupported(false)
      setError("Web Speech API is not supported in this browser. Please use Chrome or Edge.")
    }
  }, [])

  // Initialize recognition
  useEffect(() => {
    if (!isSupported || !enabled) return

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      lastChunkTimeRef.current = Date.now()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      // Update full transcript
      const newTranscript = transcript + finalTranscript
      setTranscript(newTranscript)
      chunkBufferRef.current += finalTranscript

      // Call update callback with full transcript including interim
      const fullTranscript = newTranscript + interimTranscript
      onTranscriptUpdate?.(fullTranscript)

      // If we have final results, check if we should send a chunk
      if (finalTranscript && chunkBufferRef.current.trim().length > 0) {
        const timeSinceLastChunk = Date.now() - lastChunkTimeRef.current
        if (timeSinceLastChunk >= chunkInterval) {
          sendChunk()
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error)
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      // If we still have buffered content, send it
      if (chunkBufferRef.current.trim().length > 0) {
        sendChunk()
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current)
      }
      if (recognition) {
        recognition.stop()
      }
    }
  }, [isSupported, enabled, chunkInterval, transcript, onTranscriptUpdate])

  // Set up interval timer to send chunks every 15 seconds
  useEffect(() => {
    if (!isListening || !enabled) {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current)
        chunkTimerRef.current = null
      }
      return
    }

    chunkTimerRef.current = setInterval(() => {
      if (chunkBufferRef.current.trim().length > 0) {
        sendChunk()
      }
    }, chunkInterval)

    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current)
      }
    }
  }, [isListening, enabled, chunkInterval])

  const sendChunk = useCallback(() => {
    const chunk = chunkBufferRef.current.trim()
    if (chunk.length > 0) {
      onChunkComplete?.(chunk)
      chunkBufferRef.current = ""
      lastChunkTimeRef.current = Date.now()
    }
  }, [onChunkComplete])

  const start = useCallback(() => {
    if (!isSupported) {
      setError("Web Speech API is not supported")
      return
    }

    if (recognitionRef.current && !isListening) {
      try {
        chunkBufferRef.current = ""
        lastChunkTimeRef.current = Date.now()
        recognitionRef.current.start()
      } catch (err) {
        console.error("Error starting recognition:", err)
        setError("Failed to start speech recognition")
      }
    }
  }, [isSupported, isListening])

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      // Send any remaining chunk
      if (chunkBufferRef.current.trim().length > 0) {
        sendChunk()
      }
    }
  }, [isListening, sendChunk])

  return {
    transcript,
    isListening,
    isSupported,
    start,
    stop,
    error,
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onstart: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

