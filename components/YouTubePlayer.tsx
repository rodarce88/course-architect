'use client'
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export interface YTPlayerHandle {
  getCurrentTime: () => number
  seekTo: (seconds: number) => void
}

const YouTubePlayer = forwardRef<YTPlayerHandle, { videoId: string; onTimeUpdate?: (t: number) => void }>(({ videoId, onTimeUpdate }, ref) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const timerRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => { try { return playerRef.current?.getCurrentTime?.() || 0 } catch { return 0 } },
    seekTo: (s: number) => { try { playerRef.current?.seekTo?.(s, true) } catch {} }
  }))

  useEffect(() => {
    let dead = false
    const load = (): Promise<void> => new Promise(res => {
      if (window.YT?.Player) { res(); return }
      if (!document.getElementById('yt-api')) {
        const s = document.createElement('script'); s.id = 'yt-api'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s)
      }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); res() }
      const c = setInterval(() => { if (window.YT?.Player) { clearInterval(c); res() } }, 200)
    })

    const init = async () => {
      await load()
      if (dead || !boxRef.current) return
      if (playerRef.current) { try { playerRef.current.destroy() } catch {} }
      boxRef.current.innerHTML = ''
      const el = document.createElement('div')
      boxRef.current.appendChild(el)
      playerRef.current = new window.YT.Player(el, {
        videoId, width: '100%', height: '100%',
        playerVars: { autoplay: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            if (dead) return
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
              try { const t = playerRef.current?.getCurrentTime?.(); if (t !== undefined && onTimeUpdate) onTimeUpdate(t) } catch {}
            }, 500)
          }
        }
      })
    }
    init()
    return () => { dead = true; if (timerRef.current) clearInterval(timerRef.current); try { playerRef.current?.destroy() } catch {} }
  }, [videoId])

  return <div ref={boxRef} className="w-full h-full" />
})

YouTubePlayer.displayName = 'YouTubePlayer'
export default YouTubePlayer
