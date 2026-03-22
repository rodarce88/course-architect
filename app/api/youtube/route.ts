import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  let videoId = null
  for (const p of patterns) { const m = url.match(p); if (m) { videoId = m[1]; break } }
  if (!videoId) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })

  const apiKey = process.env.YOUTUBE_API_KEY
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`)
    const data = await res.json()
    
    if (data.error) {
      console.error('YouTube API error:', data.error)
      return NextResponse.json({ error: data.error.message || 'API error' }, { status: 400 })
    }
    
    if (!data.items || data.items.length === 0) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const video = data.items[0]
    const dur = video.contentDetails.duration
    let duration = ''
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (match) {
      const h = match[1] || ''
      const m = match[2] || '0'
      const s = (match[3] || '0').padStart(2, '0')
      duration = h ? `${h}:${m.padStart(2, '0')}:${s}` : `${m}:${s}`
    }

    const channelId = video.snippet.channelId
    const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`)
    const chData = await chRes.json()
    const ch = chData.items?.[0]
    const channelImg = ch?.snippet?.thumbnails?.default?.url || ''
    
    const rawSubs = ch?.statistics?.subscriberCount
    const hiddenSubs = ch?.statistics?.hiddenSubscriberCount === true
    let subscribers = ''
    if (hiddenSubs || !rawSubs) {
      subscribers = ''
    } else {
      const subCount = parseInt(rawSubs)
      if (subCount >= 1000000) subscribers = (subCount / 1000000).toFixed(1).replace('.0', '') + 'M'
      else if (subCount >= 1000) subscribers = (subCount / 1000).toFixed(1).replace('.0', '') + 'K'
      else subscribers = subCount.toString()
    }

    const rawViews = parseInt(video.statistics.viewCount || '0')
    const rawLikes = parseInt(video.statistics.likeCount || '0')
    let viewsShort = ''
    if (rawViews >= 1000000) viewsShort = (rawViews / 1000000).toFixed(1).replace('.0', '') + 'M'
    else if (rawViews >= 1000) viewsShort = (rawViews / 1000).toFixed(1).replace('.0', '') + 'K'
    else viewsShort = rawViews.toString()
    let likesShort = ''
    if (rawLikes >= 1000000) likesShort = (rawLikes / 1000000).toFixed(1).replace('.0', '') + 'M'
    else if (rawLikes >= 1000) likesShort = (rawLikes / 1000).toFixed(1).replace('.0', '') + 'K'
    else likesShort = rawLikes.toString()

    return NextResponse.json({
      id: videoId, title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      channel: video.snippet.channelTitle, channelImg, subscribers,
      views: rawViews.toLocaleString(),
      viewsShort,
      likes: rawLikes.toLocaleString(),
      likesShort,
      duration, url,
    })
  } catch (err: any) {
    console.error('Fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch video data' }, { status: 500 })
  }
}
