# Course Architect - Development Context

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth + future DB)
- YouTube Data API v3
- Deployed on Vercel: https://course-architect-eight.vercel.app

## Key Files
- `app/page.tsx` - Main app (login, dashboard, course editor, player, NoteVault)
- `app/landing/page.tsx` - Landing page
- `app/api/youtube/route.ts` - YouTube video fetch API
- `components/YouTubePlayer.tsx` - YouTube player component
- `lib/supabase.ts` - Supabase client
- `public/avatars/` - 7 architect avatars (galileo 1-4, davinci 1-3)
- `public/data/course-resolve.json` - Seed course with 18 real videos

## Current Features
- Google OAuth + Email magic link login
- arc/handle user identity system
- Custom avatar selection (architect avatars)
- Course CRUD with owner permissions
- Reddit-style up/down voting
- Timestamped notes with reactions (Discord-style)
- BUILDER badge for course creators
- NoteVault (notes dashboard)
- Share via link + course code
- Enrollment system ("Lock In")
- 20 categories, category following
- Delete confirmation (type DELETE)
- Info tooltips on courses/modules
- date-fns relative timestamps
- Seed course: Cinematic Resolve Masterclass (18 videos)
- Landing page at /landing

## Pending / Next Steps
- VISUAL REDESIGN: New mockups uploaded (homefeed, course view, video player)
  - Editorial/magazine aesthetic, #FF0000 red, Inter font-black
  - Rounded-2xl cards, subtle shadows, uppercase labels
  - Bottom nav bar for mobile
  - 2-column layout for course view
- Fix: Vote in player navigates to next video (needs stopPropagation)
- Fix: "Not great? Suggest better" button needs to open addVideo modal
- Sidebar should match page background (not red)
- Supabase database persistence (all data is in-memory currently)
- Gemini API integration for video summaries
- More seed courses

## Credentials (in .env.local)
- Supabase URL: https://khkgiuhzfsxpngcbarln.supabase.co
- YouTube API Key: AIzaSyApv4VpAo73Y4Rlpch-3EyZ97cAffSx7ko
- Google OAuth configured

## GitHub: https://github.com/rodarce88/course-architect
