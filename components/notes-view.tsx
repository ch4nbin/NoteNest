"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Note, CompiledNote, Profile } from "@/lib/types/database"
import { NoteCard } from "@/components/note-card"
import { CompiledNoteCard } from "@/components/compiled-note-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface NotesViewProps {
  userId: string
}

export function NotesView({ userId }: NotesViewProps) {
  const [myNotes, setMyNotes] = useState<Note[]>([])
  const [friendsNotes, setFriendsNotes] = useState<Note[]>([])
  const [compiledNotes, setCompiledNotes] = useState<CompiledNote[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [myNotesFilter, setMyNotesFilter] = useState<string>("")
  const [isCompileMode, setIsCompileMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [compiledNotesFilter, setCompiledNotesFilter] = useState<string>("all")
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileProgress, setCompileProgress] = useState<string>("")
  const abortControllerRef = useRef<AbortController | null>(null)
  const compileToastIdRef = useRef<string | number | null>(null)
  const compilingNoteIdsRef = useRef<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchMyNotes()
    fetchFriendsAndTheirNotes()
    fetchCompiledNotes()
  }, [])

  const fetchMyNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    if (error) {
      console.error("Error fetching notes:", error)
      return
    }

    setMyNotes(data || [])

    // Extract unique tags
    const tags = new Set<string>()
    data?.forEach((note) => {
      note.tags?.forEach((tag: string) => tags.add(tag))
    })
    setAllTags(Array.from(tags))
  }

  const fetchFriendsAndTheirNotes = async () => {
    // Get accepted friendships
    const { data: friendships, error: friendshipsError } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", userId)
      .eq("status", "accepted")

    if (friendshipsError) {
      console.error("Error fetching friendships:", friendshipsError)
      return
    }

    const friendIds = friendships?.map((f) => f.friend_id) || []

    if (friendIds.length === 0) {
      setFriends([])
      setFriendsNotes([])
      return
    }

    // Fetch friends' profiles
    const { data: friendProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds)

    if (profilesError) {
      console.error("Error fetching friend profiles:", profilesError)
    } else {
      setFriends(friendProfiles || [])
    }

    // Fetch friends' public notes
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("*")
      .in("user_id", friendIds)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    if (notesError) {
      console.error("Error fetching friends' notes:", notesError)
    } else {
      setFriendsNotes(notes || [])
    }
  }

  const fetchCompiledNotes = async () => {
    const { data, error } = await supabase
      .from("compiled_notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })

    if (error) {
      console.error("Error fetching compiled notes:", error)
      return
    }

    setCompiledNotes(data || [])
  }

  const toggleNoteSelection = (noteId: string) => {
    // Don't allow selection changes during compilation
    if (isCompiling) {
      return
    }
    setSelectedNoteIds((prev) => (prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]))
  }

  const handleCompile = async () => {
    if (selectedNoteIds.length < 2) {
      toast.error("Please select at least 2 notes to compile")
      return
    }

    // Check if a compilation with the same note IDs is already in progress
    const sortedSelectedIds = [...selectedNoteIds].sort().join(",")
    const sortedCompilingIds = [...compilingNoteIdsRef.current].sort().join(",")
    if (isCompiling && sortedSelectedIds === sortedCompilingIds) {
      toast.error("Compilation already in progress for these notes")
      return
    }

    // Create new AbortController for this compilation
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    compilingNoteIdsRef.current = [...selectedNoteIds]

    setIsCompiling(true)
    setCompileProgress("Fetching notes...")
    const toastId = toast.loading("Fetching notes...")
    compileToastIdRef.current = toastId

    try {
      // Step 1: Fetching notes (simulated, happens in API)
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 500)
        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timeout)
          resolve(undefined)
        })
      })

      if (abortController.signal.aborted) {
        toast.dismiss(toastId)
        return
      }

      setCompileProgress("Compiling with AI...")
      toast.loading("Compiling with AI...", { id: toastId })

      const response = await fetch("/api/notes/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: selectedNoteIds }),
        signal: abortController.signal,
      })

      if (abortController.signal.aborted) {
        toast.dismiss(toastId)
        return
      }

      if (!response.ok) throw new Error("Failed to compile notes")

      // Step 2: Saving compiled note
      setCompileProgress("Saving compiled note...")
      toast.loading("Saving compiled note...", { id: toastId })

      const data = await response.json()

      if (abortController.signal.aborted) {
        toast.dismiss(toastId)
        return
      }

      // Step 3: Done
      setCompileProgress("Done!")
      toast.success("Notes compiled successfully!", { id: toastId })

      setIsCompileMode(false)
      setSelectedNoteIds([])
      fetchCompiledNotes()
    } catch (error: any) {
      // Don't show error if it was aborted
      if (error.name === "AbortError" || abortController.signal.aborted) {
        toast.dismiss(compileToastIdRef.current || undefined)
        return
      }
      console.error("Error compiling notes:", error)
      toast.error("Failed to compile notes", { id: compileToastIdRef.current || undefined })
    } finally {
      if (!abortController.signal.aborted) {
        setIsCompiling(false)
        setCompileProgress("")
      }
      abortControllerRef.current = null
      compileToastIdRef.current = null
      compilingNoteIdsRef.current = []
    }
  }

  const handleCancel = () => {
    // If compilation is in progress, abort it
    if (isCompiling && abortControllerRef.current) {
      abortControllerRef.current.abort()
      toast.dismiss(compileToastIdRef.current || undefined)
      toast.info("Compilation cancelled")
      
      setIsCompiling(false)
      setCompileProgress("")
      abortControllerRef.current = null
      compileToastIdRef.current = null
      compilingNoteIdsRef.current = []
    }

    // Exit compile mode and clear selections
    setIsCompileMode(false)
    setSelectedNoteIds([])
  }

  const filteredMyNotes = myNotes.filter((note) => {
    const matchesTag = myNotesFilter === "" || note.tags?.includes(myNotesFilter)
    return matchesTag
  })

  const filteredCompiledNotes = [...compiledNotes].sort((a, b) => {
    if (compiledNotesFilter === "oldest") {
      // Sort oldest first
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else {
      // Sort recent first (default)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const filteredFriendsNotes = friendsNotes.filter((note) => {
    const matchesFriend = selectedFriends.length === 0 || selectedFriends.includes(note.user_id)
    const matchesTag = selectedTags.length === 0 || note.tags?.some((tag) => selectedTags.includes(tag))
    return matchesFriend && matchesTag
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-8 pt-8 pb-4">
        <div className="max-w-[1800px] mx-auto">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">My Notes</span>
          </h1>
          <p className="text-muted-foreground text-lg">View, manage, and compile your notes</p>
        </div>
      </div>

      {isCompileMode && (
        <div className="flex-shrink-0 px-8 pb-4">
          <div className="max-w-[1800px] mx-auto bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Select notes to compile ({selectedNoteIds.length} selected)</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {isCompiling ? "Cancel Compilation" : "Cancel"}
              </Button>
              <Button onClick={handleCompile} className="bg-primary" disabled={isCompiling}>
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>{compileProgress}</span>
                  </>
                ) : (
                  "Create Compiled Note"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 px-8 pb-8 overflow-hidden">
        <div className="max-w-[1800px] mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Friends' Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-primary flex-shrink-0">Friends' Notes</h2>

            {/* Filters */}
            <div className="space-y-3 mb-4 flex-shrink-0">
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Friend</label>
                <Select onValueChange={(value) => setSelectedFriends(value === "all" ? [] : [value])}>
                  <SelectTrigger>
                    <SelectValue placeholder="All friends" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All friends</SelectItem>
                    {friends.map((friend) => (
                      <SelectItem key={friend.id} value={friend.id}>
                        {friend.username || friend.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {filteredFriendsNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No public notes from friends yet</p>
              ) : (
                filteredFriendsNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelectable={isCompileMode}
                    isSelectionDisabled={isCompiling}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onSelect={() => toggleNoteSelection(note.id)}
                    onRefresh={fetchFriendsAndTheirNotes}
                  />
                ))
              )}
            </div>
          </div>

          {/* My Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-primary flex-shrink-0">My Notes</h2>

            {/* Filter */}
            <div className="mb-4 flex-shrink-0">
              <label className="text-sm font-medium mb-2 block">Filter by Tag</label>
              <Select onValueChange={(value) => setMyNotesFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes List */}
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {filteredMyNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Create your first note!</p>
              ) : (
                filteredMyNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isOwner={true}
                    isSelectable={isCompileMode}
                    isSelectionDisabled={isCompiling}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onSelect={() => toggleNoteSelection(note.id)}
                    onRefresh={fetchMyNotes}
                    onCompiledNotesRefresh={fetchCompiledNotes}
                  />
                ))
              )}
            </div>
          </div>

          {/* Compiled Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-xl font-semibold text-primary">Compiled Notes</h2>
              <Button size="sm" onClick={() => setIsCompileMode(!isCompileMode)} className="bg-primary">
                <Plus className="w-4 h-4 mr-1" />
                Compile
              </Button>
            </div>

            {/* Filter */}
            <div className="mb-4 flex-shrink-0">
              <label className="text-sm font-medium mb-2 block">Filter by Date</label>
              <Select value={compiledNotesFilter} onValueChange={setCompiledNotesFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="recent">Recent first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compiled Notes List */}
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {filteredCompiledNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No compiled notes yet. Combine notes to create one!
                </p>
              ) : (
                filteredCompiledNotes.map((note) => (
                  <CompiledNoteCard key={note.id} note={note} onRefresh={fetchCompiledNotes} />
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
