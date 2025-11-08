"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Note, CompiledNote, Profile } from "@/lib/types/database"
import { NoteCard } from "@/components/note-card"
import { CompiledNoteCard } from "@/components/compiled-note-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
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

    if (error) {
      console.error("Error fetching compiled notes:", error)
      return
    }

    setCompiledNotes(data || [])
  }

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => (prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]))
  }

  const handleCompile = async () => {
    if (selectedNoteIds.length < 2) {
      toast.error("Please select at least 2 notes to compile")
      return
    }

    try {
      const response = await fetch("/api/notes/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds: selectedNoteIds }),
      })

      if (!response.ok) throw new Error("Failed to compile notes")

      toast.success("Notes compiled successfully!")
      setIsCompileMode(false)
      setSelectedNoteIds([])
      fetchCompiledNotes()
    } catch (error) {
      console.error("Error compiling notes:", error)
      toast.error("Failed to compile notes")
    }
  }

  const filteredMyNotes = myNotes.filter((note) => {
    const matchesTag = myNotesFilter === "" || note.tags?.includes(myNotesFilter)
    return matchesTag
  })

  const filteredFriendsNotes = friendsNotes.filter((note) => {
    const matchesFriend = selectedFriends.length === 0 || selectedFriends.includes(note.user_id)
    const matchesTag = selectedTags.length === 0 || note.tags?.some((tag) => selectedTags.includes(tag))
    return matchesFriend && matchesTag
  })

  return (
    <div className="p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">My Notes</span>
          </h1>
          <p className="text-muted-foreground text-lg">View, manage, and compile your notes</p>
        </div>

        {isCompileMode && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium">Select notes to compile ({selectedNoteIds.length} selected)</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCompileMode(false)
                  setSelectedNoteIds([])
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCompile} className="bg-primary">
                Create Compiled Note
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Friends' Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-primary">Friends' Notes</h2>

            {/* Filters */}
            <div className="space-y-3 mb-4">
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
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredFriendsNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No public notes from friends yet</p>
              ) : (
                filteredFriendsNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelectable={isCompileMode}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onSelect={() => toggleNoteSelection(note.id)}
                    onRefresh={fetchFriendsAndTheirNotes}
                  />
                ))
              )}
            </div>
          </div>

          {/* My Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-primary">My Notes</h2>

            {/* Filter */}
            <div className="mb-4">
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
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredMyNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Create your first note!</p>
              ) : (
                filteredMyNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isOwner={true}
                    isSelectable={isCompileMode}
                    isSelected={selectedNoteIds.includes(note.id)}
                    onSelect={() => toggleNoteSelection(note.id)}
                    onRefresh={fetchMyNotes}
                  />
                ))
              )}
            </div>
          </div>

          {/* Compiled Notes Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Compiled Notes</h2>
              <Button size="sm" onClick={() => setIsCompileMode(!isCompileMode)} className="bg-primary">
                <Plus className="w-4 h-4 mr-1" />
                Compile
              </Button>
            </div>

            {/* Compiled Notes List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {compiledNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No compiled notes yet. Combine notes to create one!
                </p>
              ) : (
                compiledNotes.map((note) => (
                  <CompiledNoteCard key={note.id} note={note} onRefresh={fetchCompiledNotes} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
