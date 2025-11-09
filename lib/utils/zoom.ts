/**
 * Utility functions for parsing and validating Zoom links
 */

export interface ZoomLinkInfo {
  meetingId: string | null
  password: string | null
  recordingId: string | null
  isRecording: boolean
  isValid: boolean
}

/**
 * Parse a Zoom link and extract meeting information
 * Supports:
 * - https://zoom.us/j/MEETING_ID?pwd=PASSWORD
 * - https://zoom.us/rec/share/RECORDING_ID
 * - Meeting ID only: 1234567890
 */
export function parseZoomLink(url: string): ZoomLinkInfo {
  const result: ZoomLinkInfo = {
    meetingId: null,
    password: null,
    recordingId: null,
    isRecording: false,
    isValid: false,
  }

  if (!url || typeof url !== "string") {
    return result
  }

  // Clean the URL
  const cleanUrl = url.trim()

  // Check if it's a recording link
  if (cleanUrl.includes("/rec/share/") || cleanUrl.includes("/rec/play/")) {
    const recordingMatch = cleanUrl.match(/\/rec\/(?:share|play)\/([a-zA-Z0-9_-]+)/)
    if (recordingMatch) {
      result.recordingId = recordingMatch[1]
      result.isRecording = true
      result.isValid = true
      return result
    }
  }

  // Check if it's a meeting link
  if (cleanUrl.includes("zoom.us/j/") || cleanUrl.includes("zoom.us/s/")) {
    // Extract meeting ID
    const meetingMatch = cleanUrl.match(/zoom\.us\/(?:j|s)\/([0-9]+)/)
    if (meetingMatch) {
      result.meetingId = meetingMatch[1]
      result.isValid = true

      // Extract password if present
      const passwordMatch = cleanUrl.match(/[?&]pwd=([a-zA-Z0-9]+)/)
      if (passwordMatch) {
        result.password = passwordMatch[1]
      }
    }
  } else if (/^\d{9,11}$/.test(cleanUrl)) {
    // Just a meeting ID
    result.meetingId = cleanUrl
    result.isValid = true
  }

  return result
}

/**
 * Check if a URL is a Zoom link
 */
export function isZoomLink(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }

  const cleanUrl = url.trim().toLowerCase()
  return (
    cleanUrl.includes("zoom.us") ||
    cleanUrl.includes("zoom.com") ||
    /^\d{9,11}$/.test(cleanUrl) // Meeting ID only
  )
}

/**
 * Check if a URL is a YouTube link
 */
export function isYouTubeLink(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }

  const cleanUrl = url.trim().toLowerCase()
  return (
    cleanUrl.includes("youtube.com") ||
    cleanUrl.includes("youtu.be") ||
    cleanUrl.includes("youtube.com/watch") ||
    cleanUrl.includes("youtube.com/embed")
  )
}

/**
 * Check if a URL requires screen capture (Zoom, YouTube, etc.)
 */
export function requiresScreenCapture(url: string): boolean {
  return isZoomLink(url) || isYouTubeLink(url)
}

/**
 * Generate a Zoom meeting join URL
 */
export function generateZoomJoinUrl(meetingId: string, password?: string): string {
  const baseUrl = `https://zoom.us/j/${meetingId}`
  if (password) {
    return `${baseUrl}?pwd=${password}`
  }
  return baseUrl
}

