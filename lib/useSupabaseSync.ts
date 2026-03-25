/**
 * useSupabaseSync.ts
 * 
 * This hook bridges the existing in-memory Course state with Supabase.
 * It loads courses from the database on mount and saves changes back.
 * 
 * STRATEGY: The app's existing state management (React useState) continues
 * to work as the fast, local cache. This hook:
 * 1. Loads data from Supabase on mount → populates the local state
 * 2. Watches for local state changes → saves them to Supabase
 * 3. Handles the handle/profile persistence in the DB instead of localStorage
 */

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ─── Types matching the app's existing types ────────────────────
type Video = {
  id: string; iid: string; title: string; thumbnail: string; channel: string;
  channelImg: string; subscribers: string; views: string; viewsShort?: string;
  likes: string; likesShort?: string; duration: string; url: string;
  completed: boolean; notes: any[]; votes: number; votedBy: string[]
}
type Sub = { id: string; name: string; videos: Video[]; createdAt: number }
type Mod = { id: string; name: string; subs: Sub[]; createdAt: number }
type Course = {
  id: string; name: string; description: string; modules: Mod[];
  isPublic: boolean; active: boolean; owner: string; ownerHandle: string;
  ownerImg: string; coverImg: string; category: string; enrolledBy: string[];
  shareCode: string; createdAt: number
}

// ─── Load all courses for the current user from Supabase ────────
export async function loadCoursesFromDB(userId: string, userHandle: string): Promise<Course[]> {
  // Get all courses (published + user's own)
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_creator_id_fkey(*)')
    .or(`is_published.eq.true,creator_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error || !courses) return []

  const allCourses: Course[] = []

  for (const c of courses) {
    // Load modules
    const { data: modules } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', c.id)
      .order('position')

    const mods: Mod[] = []
    for (const m of (modules || [])) {
      // Load topics for this module
      const { data: topics } = await supabase
        .from('topics')
        .select('*')
        .eq('module_id', m.id)
        .order('position')

      const subs: Sub[] = []
      for (const t of (topics || [])) {
        // Load lessons for this topic
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('topic_id', t.id)
          .order('position')

        // Load video votes for these lessons
        const lessonIds = (lessons || []).map((l: any) => l.id)
        let videoScores: Record<string, number> = {}
        let userVideoVotes: Record<string, number> = {}

        if (lessonIds.length > 0) {
          const { data: vvotes } = await supabase
            .from('video_votes')
            .select('lesson_id, value')
            .in('lesson_id', lessonIds)
          for (const v of (vvotes || [])) {
            videoScores[v.lesson_id] = (videoScores[v.lesson_id] || 0) + v.value
          }
          const { data: uvotes } = await supabase
            .from('video_votes')
            .select('lesson_id, value')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds)
          for (const v of (uvotes || [])) {
            userVideoVotes[v.lesson_id] = v.value
          }
        }

        // Load completion status
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed, last_position_seconds')
          .eq('user_id', userId)
          .eq('course_id', c.id)

        const completedSet = new Set(
          (progress || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id)
        )
        const positionMap: Record<string, number> = {}
        for (const p of (progress || [])) {
          if (p.last_position_seconds) positionMap[p.lesson_id] = p.last_position_seconds
        }

        // Load notes for these lessons
        const notesMap: Record<string, any[]> = {}
        if (lessonIds.length > 0) {
          const { data: notes } = await supabase
            .from('notes')
            .select('*, profiles!notes_user_id_fkey(*)')
            .in('lesson_id', lessonIds)
            .order('created_at', { ascending: false })

          // Load reactions for notes
          const noteIds = (notes || []).map((n: any) => n.id)
          let reactionsMap: Record<string, Record<string, string[]>> = {}
          if (noteIds.length > 0) {
            const { data: reactions } = await supabase
              .from('reactions')
              .select('*, profiles!reactions_user_id_fkey(username)')
              .in('note_id', noteIds)
            for (const r of (reactions || [])) {
              if (!reactionsMap[r.note_id]) reactionsMap[r.note_id] = {}
              if (!reactionsMap[r.note_id][r.emoji]) reactionsMap[r.note_id][r.emoji] = []
              reactionsMap[r.note_id][r.emoji].push(r.profiles?.username || 'anon')
            }
          }

          for (const n of (notes || [])) {
            const lid = n.lesson_id
            if (!notesMap[lid]) notesMap[lid] = []
            notesMap[lid].push({
              id: n.id,
              minute: n.minute || '',
              text: n.text,
              author: n.profiles?.full_name || 'Anon',
              authorHandle: n.profiles?.username || 'anon',
              authorImg: n.profiles?.avatar_url || '',
              ts: new Date(n.created_at).getTime(),
              isPublic: n.is_public,
              reactions: reactionsMap[n.id] || {}
            })
          }
        }

        const videos: Video[] = (lessons || []).map((l: any) => {
          const voteDir = userVideoVotes[l.id]
          const votedBy: string[] = []
          if (voteDir === 1) votedBy.push(`${userHandle}:up`)
          else if (voteDir === -1) votedBy.push(`${userHandle}:down`)

          return {
            id: l.youtube_video_id || l.id,
            iid: l.id, // use DB id as the iid
            title: l.title,
            thumbnail: l.thumbnail || `https://img.youtube.com/vi/${l.youtube_video_id}/mqdefault.jpg`,
            channel: l.channel || '',
            channelImg: l.channel_img || '',
            subscribers: l.subscribers || '',
            views: l.views || '0',
            viewsShort: l.views_short || '',
            likes: l.likes || '0',
            likesShort: l.likes_short || '',
            duration: l.duration_seconds ? formatDuration(l.duration_seconds) : '0:00',
            url: l.youtube_url,
            completed: completedSet.has(l.id),
            notes: notesMap[l.id] || [],
            votes: videoScores[l.id] || 0,
            votedBy,
            createdAt: new Date(l.created_at).getTime(),
            lastPosition: positionMap[l.id] || 0,
          }
        })

        subs.push({
          id: t.id,
          name: t.name,
          videos,
          createdAt: new Date(t.created_at).getTime(),
        })
      }

      mods.push({
        id: m.id,
        name: m.name,
        subs,
        createdAt: new Date(m.created_at).getTime(),
      })
    }

    // Get enrollments for this course
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id, profiles!enrollments_user_id_fkey(username)')
      .eq('course_id', c.id)
    const enrolledBy = (enrollments || []).map((e: any) => e.profiles?.username || 'anon')

    allCourses.push({
      id: c.id,
      name: c.title,
      description: c.description || '',
      modules: mods,
      isPublic: c.is_published,
      active: c.is_active ?? true,
      owner: c.profiles?.full_name || 'Anon',
      ownerHandle: c.profiles?.username || 'anon',
      ownerImg: c.profiles?.avatar_url || '',
      coverImg: c.cover_img || '',
      category: c.category || '',
      enrolledBy,
      shareCode: c.share_code || '',
      createdAt: new Date(c.created_at).getTime(),
    })
  }

  return allCourses
}

// ─── Save a new course to Supabase ──────────────────────────────
export async function saveCourseToDB(course: Course, userId: string) {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      creator_id: userId,
      title: course.name,
      description: course.description || null,
      category: course.category || null,
      cover_img: course.coverImg || null,
      is_published: course.isPublic,
      is_active: course.active,
    })
    .select()
    .single()

  if (error) { console.error('Error creating course:', error); return null }
  return data
}

// ─── Save a module to Supabase ──────────────────────────────────
export async function saveModuleToDB(courseId: string, mod: Mod, position: number) {
  const { data, error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, name: mod.name, position })
    .select()
    .single()
  if (error) { console.error('Error creating module:', error); return null }
  return data
}

// ─── Save a topic to Supabase ───────────────────────────────────
export async function saveTopicToDB(moduleId: string, sub: Sub, position: number) {
  const { data, error } = await supabase
    .from('topics')
    .insert({ module_id: moduleId, name: sub.name, position })
    .select()
    .single()
  if (error) { console.error('Error creating topic:', error); return null }
  return data
}

// ─── Save a video/lesson to Supabase ────────────────────────────
export async function saveLessonToDB(topicId: string, video: Video, position: number) {
  // Resolve course_id from topic → module → course chain
  const { data: topicData } = await supabase
    .from('topics')
    .select('module_id, modules!inner(course_id)')
    .eq('id', topicId)
    .single()
  const courseId = (topicData as any)?.modules?.course_id || null

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      topic_id: topicId,
      course_id: courseId,
      title: video.title,
      youtube_url: video.url,
      youtube_video_id: video.id,
      position,
      duration_seconds: parseDurationToSeconds(video.duration),
      channel: video.channel || null,
      channel_img: video.channelImg || null,
      subscribers: video.subscribers || null,
      views: video.views || null,
      views_short: video.viewsShort || null,
      likes: video.likes || null,
      likes_short: video.likesShort || null,
      thumbnail: video.thumbnail || null,
    })
    .select()
    .single()
  if (error) { console.error('Error creating lesson:', error); return null }
  return data
}

// ─── Delete from Supabase ───────────────────────────────────────
export async function deleteCourseFromDB(courseId: string) {
  await supabase.from('courses').delete().eq('id', courseId)
}

export async function deleteModuleFromDB(moduleId: string) {
  await supabase.from('modules').delete().eq('id', moduleId)
}

export async function deleteTopicFromDB(topicId: string) {
  await supabase.from('topics').delete().eq('id', topicId)
}

export async function deleteLessonFromDB(lessonId: string) {
  await supabase.from('lessons').delete().eq('id', lessonId)
}

// ─── Update operations ──────────────────────────────────────────
export async function updateCourseInDB(courseId: string, updates: any) {
  await supabase.from('courses').update(updates).eq('id', courseId)
}

export async function updateModuleInDB(moduleId: string, updates: any) {
  await supabase.from('modules').update(updates).eq('id', moduleId)
}

export async function updateTopicInDB(topicId: string, updates: any) {
  await supabase.from('topics').update(updates).eq('id', topicId)
}

// ─── Enrollment ─────────────────────────────────────────────────
export async function enrollInDB(userId: string, courseId: string) {
  await supabase.from('enrollments').insert({ user_id: userId, course_id: courseId })
}

export async function unenrollFromDB(userId: string, courseId: string) {
  await supabase.from('enrollments').delete().eq('user_id', userId).eq('course_id', courseId)
}

// ─── Video votes ────────────────────────────────────────────────
export async function voteVideoInDB(userId: string, lessonId: string, value: 1 | -1) {
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

// ─── Completion ─────────────────────────────────────────────────
export async function toggleCompletionInDB(userId: string, lessonId: string, courseId: string, completed: boolean) {
  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    await supabase.from('lesson_progress')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress')
      .insert({ user_id: userId, lesson_id: lessonId, course_id: courseId, completed, completed_at: completed ? new Date().toISOString() : null })
  }
}

// ─── Notes ──────────────────────────────────────────────────────
export async function saveNoteToDB(lessonId: string, userId: string, minute: string, text: string, isPublic: boolean) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ lesson_id: lessonId, user_id: userId, minute: minute || null, text, is_public: isPublic })
    .select('*, profiles!notes_user_id_fkey(*)')
    .single()
  if (error) { console.error('Error creating note:', error); return null }
  return data
}

export async function deleteNoteFromDB(noteId: string) {
  await supabase.from('notes').delete().eq('id', noteId)
}

// ─── Reactions ──────────────────────────────────────────────────
export async function toggleReactionInDB(userId: string, noteId: string, emoji: string) {
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

// ─── Profile/Handle ─────────────────────────────────────────────
export async function saveHandleToDB(userId: string, handle: string) {
  await supabase.from('profiles').update({ username: handle }).eq('id', userId)
}

export async function getHandleFromDB(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single()
  return data?.username || null
}

export async function saveAvatarToDB(userId: string, avatarUrl: string) {
  await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
}

// ─── Helpers ────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

// ─── Save video position ────────────────────────────────────────
export async function savePositionInDB(userId: string, lessonId: string, courseId: string, positionSeconds: number) {
  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    await supabase.from('lesson_progress')
      .update({ last_position_seconds: positionSeconds })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress')
      .insert({ user_id: userId, lesson_id: lessonId, course_id: courseId, last_position_seconds: positionSeconds, completed: false })
  }
}
