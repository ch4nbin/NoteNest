"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Save, LinkIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  const router = useRouter()

  const handleLoadContent = async () => {
    if (!url) {
      toast.error("Please enter a URL")
      return
    }

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

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) {
      toast.error("Please enter a question")
      return
    }

    setIsAskingQuestion(true)

    try {
      const response = await fetch("/api/notes/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          url,
          context: noteSections,
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
    if (!noteTitle || noteSections.length === 0) {
      toast.error("Note must have a title and content")
      return
    }

    try {
      const response = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          content: { sections: noteSections },
          tags: noteTags,
          source_url: url,
          source_type: "url",
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
      {/* Left side - Content viewer */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-6 border-b border-border bg-card">
          <h1 className="text-2xl font-bold mb-4">
            <span className="gradient-text">Create New Note</span>
          </h1>
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL (YouTube, article, lecture, etc.)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadContent()}
              disabled={contentStarted}
              className="flex-1"
            />
            <Button onClick={handleLoadContent} disabled={isLoading || contentStarted} className="bg-primary">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Load
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {!contentStarted ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Paste a URL to get started</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a URL from YouTube, an article, or any online resource. AI will automatically generate notes as
                  you go through the content.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <iframe src={url} className="w-full h-[600px] rounded-lg border border-border" title="Content" />
            </div>
          )}
        </div>
      </div>

      {/* Right side - AI Assistant */}
      <div className="w-[400px] flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg text-primary">AI Assistant</h2>
        </div>

        <Tabs defaultValue="notes" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="notes" className="flex-1">
              Notes
            </TabsTrigger>
            <TabsTrigger value="qna" className="flex-1">
              Q&A
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1 p-4">
              {isGenerating && noteSections.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              <div className="space-y-4">
                {noteSections.map((section, index) => (
                  <Card key={index} className="p-4 border-primary/20">
                    <h3 className="font-semibold text-sm text-primary mb-2">{section.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                  </Card>
                ))}
              </div>

              {isGenerating && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating notes...</span>
                </div>
              )}
            </ScrollArea>

            {contentStarted && (
              <div className="p-4 border-t border-border">
                <Button
                  onClick={handleSaveNote}
                  className="w-full bg-primary"
                  disabled={!noteTitle || noteSections.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Note
                </Button>
              </div>
            )}
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
