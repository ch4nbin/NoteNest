"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Note, CompiledNote, Profile } from "@/lib/types/database"
import { NoteCard } from "@/components/note-card"
import { CompiledNoteCard } from "@/components/compiled-note-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, X, Filter, ChevronDown } from "lucide-react"
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
  const [friendsNotesDateFilter, setFriendsNotesDateFilter] = useState<string>("all")
  const [myNotesFilter, setMyNotesFilter] = useState<string[]>([])
  const [myNotesDateFilter, setMyNotesDateFilter] = useState<string>("all")
  const [isCompileMode, setIsCompileMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [allFriendsTags, setAllFriendsTags] = useState<string[]>([])
  const [allCompiledTags, setAllCompiledTags] = useState<string[]>([])
  const [compiledNotesFilter, setCompiledNotesFilter] = useState<string>("all")
  const [compiledNotesTagFilter, setCompiledNotesTagFilter] = useState<string[]>([])
  const [compiledNotesSourceCountFilter, setCompiledNotesSourceCountFilter] = useState<string>("all")
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileProgress, setCompileProgress] = useState<string>("")
  const abortControllerRef = useRef<AbortController | null>(null)
  const compileToastIdRef = useRef<string | number | null>(null)
  const compilingNoteIdsRef = useRef<string[]>([])

  const supabase = createClient()

  // Load filters from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Helper function to safely parse JSON from localStorage
      const safeParseJSON = (key: string, defaultValue: any) => {
        try {
          const item = localStorage.getItem(key)
          if (!item) return defaultValue
          return JSON.parse(item)
        } catch (error) {
          console.warn(`Failed to parse ${key} from localStorage, using default:`, error)
          // Clear invalid data
          localStorage.removeItem(key)
          return defaultValue
        }
      }

      const savedMyNotesFilter = safeParseJSON("myNotesFilter", [])
      const savedMyNotesDateFilter = localStorage.getItem("myNotesDateFilter") || "all"
      const savedCompiledNotesFilter = localStorage.getItem("compiledNotesFilter") || "all"
      const savedCompiledNotesTagFilter = safeParseJSON("compiledNotesTagFilter", [])
      const savedSelectedFriends = safeParseJSON("selectedFriends", [])
      const savedSelectedTags = safeParseJSON("selectedTags", [])
      const savedFriendsNotesDateFilter = localStorage.getItem("friendsNotesDateFilter") || "all"

      setMyNotesFilter(savedMyNotesFilter)
      setMyNotesDateFilter(savedMyNotesDateFilter)
      setCompiledNotesFilter(savedCompiledNotesFilter)
      setCompiledNotesTagFilter(savedCompiledNotesTagFilter)
      setSelectedFriends(savedSelectedFriends)
      setSelectedTags(savedSelectedTags)
      setFriendsNotesDateFilter(savedFriendsNotesDateFilter)
      setFiltersLoaded(true)
    }
  }, [])

  // Fetch data after filters are loaded
  useEffect(() => {
    if (filtersLoaded) {
      fetchMyNotes()
      fetchFriendsAndTheirNotes()
      fetchCompiledNotes()
    }
  }, [filtersLoaded])

  // Save filters to localStorage when they change
  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("myNotesFilter", JSON.stringify(myNotesFilter))
    }
  }, [myNotesFilter, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("myNotesDateFilter", myNotesDateFilter)
    }
  }, [myNotesDateFilter, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("compiledNotesFilter", compiledNotesFilter)
    }
  }, [compiledNotesFilter, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("compiledNotesTagFilter", JSON.stringify(compiledNotesTagFilter))
    }
  }, [compiledNotesTagFilter, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("friendsNotesDateFilter", friendsNotesDateFilter)
    }
  }, [friendsNotesDateFilter, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("selectedFriends", JSON.stringify(selectedFriends))
    }
  }, [selectedFriends, filtersLoaded])

  useEffect(() => {
    if (filtersLoaded && typeof window !== "undefined") {
      localStorage.setItem("selectedTags", JSON.stringify(selectedTags))
    }
  }, [selectedTags, filtersLoaded])

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

      // Extract unique tags from friends' notes
      const friendsTags = new Set<string>()
      notes?.forEach((note) => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach((tag: string) => friendsTags.add(tag))
        }
      })
      setAllFriendsTags(Array.from(friendsTags))
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

    // Extract unique tags from compiled notes
    const compiledTags = new Set<string>()
    data?.forEach((note) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => compiledTags.add(tag))
      }
    })
    setAllCompiledTags(Array.from(compiledTags))
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to compile notes")
      }

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
      const errorMessage = error.message || "Failed to compile notes"
      toast.error(errorMessage, { id: compileToastIdRef.current || undefined })
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

  const filteredMyNotes = myNotes
    .filter((note) => {
      const matchesTag = myNotesFilter.length === 0 || myNotesFilter.some((tag) => note.tags?.includes(tag))
      return matchesTag
    })
    .sort((a, b) => {
      if (myNotesDateFilter === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        // Recent first (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const filteredCompiledNotes = compiledNotes
    .filter((note) => {
      // Filter by tags if tags are selected
      if (compiledNotesTagFilter.length > 0) {
        const matchesTag = compiledNotesTagFilter.some((tag) => note.tags?.includes(tag)) || false
        if (!matchesTag) return false
      }
      // Filter by source note count
      if (compiledNotesSourceCountFilter !== "all") {
        const sourceCount = note.source_note_ids?.length || 0
        if (compiledNotesSourceCountFilter === "few" && sourceCount > 3) return false
        if (compiledNotesSourceCountFilter === "many" && sourceCount <= 3) return false
      }
      return true
    })
    .sort((a, b) => {
      if (compiledNotesFilter === "oldest") {
        // Sort oldest first
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        // Sort recent first (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const filteredFriendsNotes = friendsNotes
    .filter((note) => {
      const matchesFriend = selectedFriends.length === 0 || selectedFriends.includes(note.user_id)
      const matchesTag = selectedTags.length === 0 || note.tags?.some((tag) => selectedTags.includes(tag))
      return matchesFriend && matchesTag
    })
    .sort((a, b) => {
      if (friendsNotesDateFilter === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        // Recent first (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
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
          <div className="max-w-[1800px] mx-auto bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
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
            {isCompiling && (
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Warning: Do not leave or refresh this page, or the compilation will be aborted.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 px-8 pb-8 overflow-hidden">
        <div className="max-w-[1800px] mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Friends' Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold text-primary">Friends' Notes</h2>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 flex-shrink-0 space-y-2">
              <div className="flex items-center gap-2 flex-nowrap">
                {friends.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
                        <Filter className="w-3 h-3 mr-1.5" />
                        Friends
                        {selectedFriends.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-xs">
                            {selectedFriends.length}
                          </Badge>
                        )}
                        <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start" side="bottom" sideOffset={4}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter by Friend</span>
                          {selectedFriends.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setSelectedFriends([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {friends.map((friend) => {
                            const isSelected = selectedFriends.includes(friend.id)
                            return (
                              <div key={friend.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`friend-${friend.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedFriends([...selectedFriends, friend.id])
                                    } else {
                                      setSelectedFriends(selectedFriends.filter((id) => id !== friend.id))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`friend-${friend.id}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {friend.username || friend.email}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {allFriendsTags.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 flex-shrink-0">
                        <Filter className="w-3 h-3 mr-1.5" />
                        Tags
                        {selectedTags.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-xs">
                            {selectedTags.length}
                          </Badge>
                        )}
                        <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start" side="bottom" sideOffset={4}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter by Tag</span>
                          {selectedTags.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setSelectedTags([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {allFriendsTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag)
                            return (
                              <div key={tag} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tag-${tag}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTags([...selectedTags, tag])
                                    } else {
                                      setSelectedTags(selectedTags.filter((t) => t !== tag))
                                    }
                                  }}
                                />
                                <label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer flex-1">
                                  {tag}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Date:</span>
                <Badge
                  variant={friendsNotesDateFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setFriendsNotesDateFilter("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={friendsNotesDateFilter === "recent" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setFriendsNotesDateFilter("recent")}
                >
                  Recent
                </Badge>
                <Badge
                  variant={friendsNotesDateFilter === "oldest" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setFriendsNotesDateFilter("oldest")}
                >
                  Oldest
                </Badge>
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
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold text-primary">My Notes</h2>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 flex-shrink-0 space-y-2">
              {allTags.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Filter className="w-3 h-3 mr-1.5" />
                      Tags
                      {myNotesFilter.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-xs">
                          {myNotesFilter.length}
                        </Badge>
                      )}
                      <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start" side="bottom" sideOffset={4}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filter by Tag</span>
                        {myNotesFilter.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setMyNotesFilter([])}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allTags.map((tag) => {
                          const isSelected = myNotesFilter.includes(tag)
                          return (
                            <div key={tag} className="flex items-center space-x-2">
                              <Checkbox
                                id={`my-tag-${tag}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setMyNotesFilter([...myNotesFilter, tag])
                                  } else {
                                    setMyNotesFilter(myNotesFilter.filter((t) => t !== tag))
                                  }
                                }}
                              />
                              <label htmlFor={`my-tag-${tag}`} className="text-sm cursor-pointer flex-1">
                                {tag}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Date:</span>
                <Badge
                  variant={myNotesDateFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setMyNotesDateFilter("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={myNotesDateFilter === "recent" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setMyNotesDateFilter("recent")}
                >
                  Recent
                </Badge>
                <Badge
                  variant={myNotesDateFilter === "oldest" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setMyNotesDateFilter("oldest")}
                >
                  Oldest
                </Badge>
              </div>
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

            {/* Filter Controls */}
            <div className="mb-4 flex-shrink-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {allCompiledTags.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Filter className="w-3 h-3 mr-1.5" />
                        Tags
                        {compiledNotesTagFilter.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-xs">
                            {compiledNotesTagFilter.length}
                          </Badge>
                        )}
                        <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start" side="bottom" sideOffset={4}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter by Tag</span>
                          {compiledNotesTagFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setCompiledNotesTagFilter([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {allCompiledTags.map((tag) => {
                            const isSelected = compiledNotesTagFilter.includes(tag)
                            return (
                              <div key={tag} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`compiled-tag-${tag}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setCompiledNotesTagFilter([...compiledNotesTagFilter, tag])
                                    } else {
                                      setCompiledNotesTagFilter(compiledNotesTagFilter.filter((t) => t !== tag))
                                    }
                                  }}
                                />
                                <label htmlFor={`compiled-tag-${tag}`} className="text-sm cursor-pointer flex-1">
                                  {tag}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Filter className="w-3 h-3 mr-1.5" />
                      Sources
                      {compiledNotesSourceCountFilter !== "all" && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-xs">
                          {compiledNotesSourceCountFilter === "few" ? "1-3" : "4+"}
                        </Badge>
                      )}
                      <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start" side="bottom" sideOffset={4}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filter by Source Count</span>
                        {compiledNotesSourceCountFilter !== "all" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setCompiledNotesSourceCountFilter("all")}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="source-all"
                            checked={compiledNotesSourceCountFilter === "all"}
                            onCheckedChange={(checked) => {
                              if (checked) setCompiledNotesSourceCountFilter("all")
                            }}
                          />
                          <label htmlFor="source-all" className="text-sm cursor-pointer flex-1">
                            All
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="source-few"
                            checked={compiledNotesSourceCountFilter === "few"}
                            onCheckedChange={(checked) => {
                              if (checked) setCompiledNotesSourceCountFilter("few")
                            }}
                          />
                          <label htmlFor="source-few" className="text-sm cursor-pointer flex-1">
                            1-3 Sources
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="source-many"
                            checked={compiledNotesSourceCountFilter === "many"}
                            onCheckedChange={(checked) => {
                              if (checked) setCompiledNotesSourceCountFilter("many")
                            }}
                          />
                          <label htmlFor="source-many" className="text-sm cursor-pointer flex-1">
                            4+ Sources
                          </label>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Date:</span>
                <Badge
                  variant={compiledNotesFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setCompiledNotesFilter("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={compiledNotesFilter === "recent" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setCompiledNotesFilter("recent")}
                >
                  Recent
                </Badge>
                <Badge
                  variant={compiledNotesFilter === "oldest" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => setCompiledNotesFilter("oldest")}
                >
                  Oldest
                </Badge>
              </div>
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
