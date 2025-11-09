export interface Profile {
  id: string
  username: string | null
  email: string | null
  profile_picture_url: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: any // jsonb
  tags: string[]
  source_url: string | null
  source_type: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CompiledNote {
  id: string
  user_id: string
  title: string
  content: any // jsonb
  tags: string[]
  source_note_ids: string[]
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: string // 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export interface QnAHistory {
  id: string
  note_id: string
  question: string
  answer: string
  added_to_note: boolean
  created_at: string
}

export interface NoteAnalytics {
  id: string
  note_id: string
  user_id: string
  view_count: number
  time_spent_seconds: number
  qna_count: number
  last_viewed_at: string | null
  created_at: string
  updated_at: string
}

export interface LearningInsight {
  id: string
  user_id: string
  topic: string
  predicted_weak_areas: string[]
  confidence_score: number
  recommendations: string[]
  created_at: string
  updated_at: string
}
