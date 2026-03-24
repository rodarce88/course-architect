import { supabase } from './supabase'

// ─── TYPES ──────────────────────────────────────────────────────
export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export type DbCourse = {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string | null
  thumbnail_url: string | null
  cover_img: string | null
  is_published: boolean
  is_active: boolean
  vote_score: number
  enrollment_count: number
  share_code: string | null
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
}

export type DbModule = {
  id: string
  course_id: string
  name: string
  position: number
  created_at: string
}

export type DbTopic = {
  id: string
  module_id: string
  name: string
  position: number
  created_at: string
}

export type DbLesson = {
  id: string
  course_id: string | null
  topic_id: string | null
  title: string
  youtube_url: string
  youtube_video_id: string | null
  description: string | null
  position: number
  duration_seconds: number | null
  channel: string | null
  channel_img: string | null
  subscribers: string | null
  views: string | null
  views_short: string | null
  likes: string | null
  likes_short: string | null
  thumbnail: string | null
  created_at: string
}

export type DbNote = {
  id: string
  lesson_id: string
  user_id: string
  minute: string | null
  text: string
  is_public: boolean
  created_at: string
  // joined
  profiles?: Profile
}

export type DbReaction = {
  id: string
  note_id: string
  user_id: string
  emoji: string
}

// ─── AUTH ────────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthChange(cb: (user: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
    cb(session?.user ?? null)
  })
  return subscription
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '' }
  })
}

export async function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({ email })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// ─── PROFILES ───────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

// ─── COURSES ────────────────────────────────────────────────────
export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_creator_id_fkey(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbCourse[]
}

export async function getCourse(id: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_creator_id_fkey(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as DbCourse
}

export async function getCourseByShareCode(code: string) {
  const { data } = await supabase
    .from('courses')
    .select('*, profiles!courses_creator_id_fkey(*)')
    .ilike('share_code', code)
    .single()
  return data as DbCourse | null
}

export async function createCourse(course: {
  creator_id: string
  title: string
  description?: string
  category?: string
  cover_img?: string
  is_published: boolean
}) {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select('*, profiles!courses_creator_id_fkey(*)')
    .single()
  if (error) throw error
  return data as DbCourse
}

export async function updateCourse(id: string, updates: Partial<DbCourse>) {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DbCourse
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

// ─── MODULES ────────────────────────────────────────────────────
export async function getModules(courseId: string) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position')
  if (error) throw error
  return (data || []) as DbModule[]
}

export async function createModule(mod: { course_id: string; name: string; position: number }) {
  const { data, error } = await supabase
    .from('modules')
    .insert(mod)
    .select()
    .single()
  if (error) throw error
  return data as DbModule
}

export async function updateModule(id: string, updates: Partial<DbModule>) {
  const { data, error } = await supabase
    .from('modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DbModule
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from('modules').delete().eq('id', id)
  if (error) throw error
}

export async function reorderModules(modules: { id: string; position: number }[]) {
  for (const m of modules) {
    await supabase.from('modules').update({ position: m.position }).eq('id', m.id)
  }
}

// ─── TOPICS ─────────────────────────────────────────────────────
export async function getTopics(moduleId: string) {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('module_id', moduleId)
    .order('position')
  if (error) throw error
  return (data || []) as DbTopic[]
}

export async function getTopicsByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) return []
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .in('module_id', moduleIds)
    .order('position')
  if (error) throw error
  return (data || []) as DbTopic[]
}

export async function createTopic(topic: { module_id: string; name: string; position: number }) {
  const { data, error } = await supabase
    .from('topics')
    .insert(topic)
    .select()
    .single()
  if (error) throw error
  return data as DbTopic
}

export async function updateTopic(id: string, updates: Partial<DbTopic>) {
  const { data, error } = await supabase
    .from('topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DbTopic
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from('topics').delete().eq('id', id)
  if (error) throw error
}

export async function reorderTopics(topics: { id: string; position: number }[]) {
  for (const t of topics) {
    await supabase.from('topics').update({ position: t.position }).eq('id', t.id)
  }
}

// ─── LESSONS (VIDEOS) ──────────────────────────────────────────
export async function getLessonsByTopicIds(topicIds: string[]) {
  if (topicIds.length === 0) return []
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .in('topic_id', topicIds)
    .order('position')
  if (error) throw error
  return (data || []) as DbLesson[]
}

export async function createLesson(lesson: {
  topic_id: string
  title: string
  youtube_url: string
  youtube_video_id?: string
  description?: string
  position: number
  duration_seconds?: number
  channel?: string
  channel_img?: string
  subscribers?: string
  views?: string
  views_short?: string
  likes?: string
  likes_short?: string
  thumbnail?: string
}) {
  const { data, error } = await supabase
    .from('lessons')
    .insert(lesson)
    .select()
    .single()
  if (error) throw error
  return data as DbLesson
}

export async function updateLesson(id: string, updates: Partial<DbLesson>) {
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DbLesson
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

export async function reorderLessons(lessons: { id: string; position: number }[]) {
  for (const l of lessons) {
    await supabase.from('lessons').update({ position: l.position }).eq('id', l.id)
  }
}

// ─── ENROLLMENTS ────────────────────────────────────────────────
export async function getEnrollments(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []) as { id: string; user_id: string; course_id: string; enrolled_at: string }[]
}

export async function getEnrollmentCount(courseId: string) {
  const { count, error } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
  if (error) throw error
  return count || 0
}

export async function enrollInCourse(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ user_id: userId, course_id: courseId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unenrollFromCourse(userId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId)
  if (error) throw error
}

// ─── LESSON PROGRESS ───────────────────────────────────────────
export async function getLessonProgress(userId: string, courseId: string) {
  // Get all lessons for this course via topics → modules
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
  if (error) throw error
  return (data || []) as { lesson_id: string; completed: boolean; last_position_seconds: number }[]
}

export async function toggleLessonComplete(userId: string, lessonId: string, courseId: string, completed: boolean) {
  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    await supabase
      .from('lesson_progress')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
  } else {
    await supabase
      .from('lesson_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
  }
}

// ─── VOTES (Course level) ──────────────────────────────────────
export async function getCourseVote(userId: string, courseId: string) {
  const { data } = await supabase
    .from('votes')
    .select('value')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()
  return data?.value || 0
}

export async function voteCourse(userId: string, courseId: string, value: 1 | -1) {
  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  if (existing) {
    if (existing.value === value) {
      // Remove vote
      await supabase.from('votes').delete().eq('id', existing.id)
    } else {
      // Change vote
      await supabase.from('votes').update({ value }).eq('id', existing.id)
    }
  } else {
    await supabase.from('votes').insert({ user_id: userId, course_id: courseId, value })
  }
}

// ─── VIDEO VOTES ───────────────────────────────────────────────
export async function getVideoVotes(lessonIds: string[]) {
  if (lessonIds.length === 0) return {}
  const { data, error } = await supabase
    .from('video_votes')
    .select('lesson_id, value')
    .in('lesson_id', lessonIds)
  if (error) throw error
  // Aggregate: { lessonId: totalScore }
  const scores: Record<string, number> = {}
  for (const v of (data || [])) {
    scores[v.lesson_id] = (scores[v.lesson_id] || 0) + v.value
  }
  return scores
}

export async function getUserVideoVotes(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return {}
  const { data, error } = await supabase
    .from('video_votes')
    .select('lesson_id, value')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)
  if (error) throw error
  const votes: Record<string, number> = {}
  for (const v of (data || [])) {
    votes[v.lesson_id] = v.value
  }
  return votes
}

export async function voteVideo(userId: string, lessonId: string, value: 1 | -1) {
  const { data: existing } = await supabase
    .from('video_votes')
    .select('id, value')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    if (existing.value === value) {
      await supabase.from('video_votes').delete().eq('id', existing.id)
    } else {
      await supabase.from('video_votes').update({ value }).eq('id', existing.id)
    }
  } else {
    await supabase.from('video_votes').insert({ user_id: userId, lesson_id: lessonId, value })
  }
}

// ─── NOTES ─────────────────────────────────────────────────────
export async function getNotes(lessonIds: string[]) {
  if (lessonIds.length === 0) return []
  const { data, error } = await supabase
    .from('notes')
    .select('*, profiles!notes_user_id_fkey(*)')
    .in('lesson_id', lessonIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DbNote[]
}

export async function createNote(note: {
  lesson_id: string
  user_id: string
  minute?: string
  text: string
  is_public: boolean
}) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select('*, profiles!notes_user_id_fkey(*)')
    .single()
  if (error) throw error
  return data as DbNote
}

export async function deleteNote(noteId: string) {
  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) throw error
}

// ─── REACTIONS ─────────────────────────────────────────────────
export async function getReactions(noteIds: string[]) {
  if (noteIds.length === 0) return []
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .in('note_id', noteIds)
  if (error) throw error
  return (data || []) as DbReaction[]
}

export async function toggleReaction(userId: string, noteId: string, emoji: string) {
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', userId)
    .eq('note_id', noteId)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('reactions').insert({ user_id: userId, note_id: noteId, emoji })
  }
}

// ─── FULL COURSE LOADER ────────────────────────────────────────
// Loads a course with all its nested data in parallel
export async function loadFullCourse(courseId: string, userId?: string) {
  const [course, modules] = await Promise.all([
    getCourse(courseId),
    getModules(courseId),
  ])

  const moduleIds = modules.map(m => m.id)
  const topics = await getTopicsByModuleIds(moduleIds)
  const topicIds = topics.map(t => t.id)

  const [lessons, enrollCount] = await Promise.all([
    getLessonsByTopicIds(topicIds),
    getEnrollmentCount(courseId),
  ])

  const lessonIds = lessons.map(l => l.id)

  const [notes, videoScores, userVideoVotes, progress, enrollments] = await Promise.all([
    getNotes(lessonIds),
    getVideoVotes(lessonIds),
    userId ? getUserVideoVotes(userId, lessonIds) : Promise.resolve({}),
    userId ? getLessonProgress(userId, courseId) : Promise.resolve([]),
    userId ? getEnrollments(userId) : Promise.resolve([]),
  ])

  const noteIds = notes.map(n => n.id)
  const reactions = await getReactions(noteIds)

  return {
    course,
    modules,
    topics,
    lessons,
    notes,
    reactions,
    videoScores,
    userVideoVotes,
    progress,
    enrollments,
    enrollCount,
  }
}
