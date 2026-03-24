'use client'
import { useState } from 'react'

export default function Landing() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const join = () => { if (email.includes('@')) { setJoined(true) } }

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF4500] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <span className="text-base font-bold tracking-tight">Course Architect</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#team" className="hover:text-gray-900 transition-colors">Team</a>
            <a href="/api/auth" className="hover:text-gray-900 transition-colors">Sign In</a>
          </div>
          <a href="/" className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#FF4500] text-white hover:bg-[#e03d00] transition-colors">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white"/>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#FF4500]/5 rounded-full blur-3xl"/>
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"/>
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF4500]/10 text-[#FF4500] text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse"/>
            Now in Public Beta — Free Forever for Early Users
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Stop watching videos.<br/>
            <span className="text-[#FF4500]">Start actually learning.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn scattered YouTube videos into structured courses. Organize, vote, annotate, and learn together — like Reddit meets Coursera, built by the community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            {!joined ? (<>
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && join()} placeholder="Enter your email" className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF4500]/30 focus:border-[#FF4500]/30"/>
              <button onClick={join} className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold bg-[#FF4500] text-white hover:bg-[#e03d00] transition-all hover:shadow-lg hover:shadow-[#FF4500]/20">
                Join the Waitlist →
              </button>
            </>) : (
              <div className="px-6 py-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                ✓ You're on the list! We'll notify you when we launch.
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">Join 10,000+ learners already on the waitlist. No spam, ever.</p>

          {/* Hero image mockup */}
          <div className="mt-16 rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden bg-[#DAE0E6] p-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] font-bold text-sm">1</div>
                <div>
                  <div className="h-3 w-48 bg-gray-200 rounded"/>
                  <div className="h-2 w-32 bg-gray-100 rounded mt-1.5"/>
                </div>
              </div>
              <div className="space-y-2 pl-8 border-l-2 border-gray-100 ml-5">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-[#FF4500]"/>
                    <span className="text-[10px] font-bold text-[#FF4500]">24</span>
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-gray-300"/>
                  </div>
                  <div className="w-16 h-10 rounded bg-gray-200"/>
                  <div><div className="h-2.5 w-36 bg-gray-200 rounded"/><div className="h-2 w-24 bg-gray-100 rounded mt-1"/></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-gray-300"/>
                    <span className="text-[10px] font-bold text-gray-400">18</span>
                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-gray-300"/>
                  </div>
                  <div className="w-16 h-10 rounded bg-gray-200"/>
                  <div><div className="h-2.5 w-40 bg-gray-200 rounded"/><div className="h-2 w-28 bg-gray-100 rounded mt-1"/></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs text-gray-400 uppercase tracking-widest font-semibold mb-8">Trusted by learners at</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-40 grayscale">
            {['TechFlow', 'NovaBridge', 'Arcline', 'DataPulse', 'SkillForge', 'LearnPath'].map(name => (
              <div key={name} className="text-xl font-bold text-gray-900 tracking-tight">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Everything you need to learn smarter</h2>
            <p className="text-gray-500 max-w-xl mx-auto">We took the best of Reddit, Coursera, and Notion — and built something new.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🏗️', title: 'Course Builder', desc: 'Create structured courses from any YouTube video. Organize into modules and topics with drag-and-drop simplicity.' },
              { icon: '🗳️', title: 'Community Voting', desc: 'Reddit-style upvote system. The best videos rise to the top, curated by the community — not algorithms.' },
              { icon: '📝', title: 'Timestamped Notes', desc: 'Add notes at exact video timestamps. Click any note to jump to that moment. Share publicly or keep private.' },
              { icon: '🤖', title: 'AI Summaries', desc: 'Gemini-powered video summaries with key timestamps. Study smarter with AI-generated outlines for every video.' },
              { icon: '🔐', title: 'NoteVault', desc: 'Your personal knowledge vault. Search, filter, and review all your notes across every course in one place.' },
              { icon: '🎯', title: 'Lock In & Track', desc: 'Enroll in courses, track progress with visual bars, mark videos complete, and build your learning streak.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#FF4500]/20 hover:shadow-lg hover:shadow-[#FF4500]/5 transition-all group">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="text-base font-bold mb-2 group-hover:text-[#FF4500] transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-12">What learners are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Chen', handle: '@sarahlearns', text: 'I used to have 200+ bookmarked YouTube tutorials with no organization. Course Architect changed everything. Now I actually finish what I start.', avatar: '👩‍💻' },
              { name: 'Marcus Rivera', handle: '@marcusdev', text: 'The voting system is genius. Instead of guessing which tutorial is best, the community already sorted it for me. Saved me hours.', avatar: '👨‍🎨' },
              { name: 'Aiko Tanaka', handle: '@aikocodes', text: 'NoteVault is my secret weapon. I take notes with timestamps and review them before interviews. Got my dream job at a FAANG company.', avatar: '👩‍🔬' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.handle}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-16">How it works</h2>
          <div className="space-y-12">
            {[
              { step: '01', title: 'Create or join a course', desc: 'Start from scratch or enter a course code. Public courses are open for anyone to contribute.' },
              { step: '02', title: 'Add YouTube videos', desc: 'Paste any YouTube link. We automatically pull the title, thumbnail, channel, views, and duration.' },
              { step: '03', title: 'Learn with the community', desc: 'Vote on the best videos, add timestamped notes, react to insights, and track your progress together.' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-6">
                <span className="text-4xl font-black text-[#FF4500]/20 flex-shrink-0 w-16">{s.step}</span>
                <div>
                  <h3 className="text-lg font-bold mb-1">{s.title}</h3>
                  <p className="text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Built by educators and engineers from around the world</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-12">Our distributed team combines expertise in education, AI, and product design to reimagine how people learn from video content.</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {[
              { role: 'Engineering', count: '12' },
              { role: 'Education', count: '6' },
              { role: 'Design', count: '4' },
              { role: 'AI/ML', count: '5' },
            ].map((t, i) => (
              <div key={i} className="px-6 py-4 rounded-xl bg-slate-50 border border-gray-200">
                <p className="text-2xl font-extrabold text-[#FF4500]">{t.count}</p>
                <p className="text-xs text-gray-500 mt-1">{t.role}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-8 -space-x-3">
            {['🧑‍💻', '👩‍🔬', '👨‍🎨', '👩‍💼', '🧑‍🏫', '👨‍💻', '👩‍🎓', '🧑‍🔧'].map((e, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-lg">{e}</div>
            ))}
            <div className="w-10 h-10 rounded-full bg-[#FF4500] border-2 border-white flex items-center justify-center text-xs font-bold text-white">+19</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mb-12">Start for free. Upgrade when you need more.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border-2 border-[#FF4500] p-8 relative">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-[#FF4500] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">Most Popular</div>
              <h3 className="text-lg font-bold mb-1">Beta Access</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black">$0</span>
                <span className="text-gray-400 text-sm">/forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited courses', 'Unlimited video imports', 'Community voting & notes', 'NoteVault access', 'AI summaries (coming soon)', 'Priority support'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><span className="text-[#FF4500]">✓</span>{f}</li>
                ))}
              </ul>
              <a href="/" className="block w-full py-3 rounded-xl text-sm font-bold bg-[#FF4500] text-white text-center hover:bg-[#e03d00] transition-colors">Get Started Free →</a>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-gray-300">$9</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in Beta', 'Advanced analytics', 'Custom branding', 'API access', 'Team workspaces', 'White-label courses'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400"><span className="text-gray-300">✓</span>{f}</li>
                ))}
              </ul>
              <button disabled className="block w-full py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-400 text-center cursor-not-allowed">Coming 2026</button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Ready to learn differently?</h2>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">Join thousands of learners who are building their own curriculum from the best YouTube content.</p>
          <a href="/" className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold bg-[#FF4500] text-white hover:bg-[#e03d00] transition-all hover:shadow-xl hover:shadow-[#FF4500]/20">
            Start Learning Free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5">{['Features', 'Pricing', 'Changelog', 'API Documentation'].map((l, i) => <li key={i}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">{['About', 'Careers', 'Blog', 'Press'].map((l, i) => <li key={i}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">{['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((l, i) => <li key={i}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Connect</h4>
              <ul className="space-y-2.5">{['Twitter / X', 'LinkedIn', 'Discord', 'GitHub'].map((l, i) => <li key={i}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l}</a></li>)}</ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#FF4500] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <span className="text-sm font-bold text-gray-900">Course Architect</span>
            </div>
            <p className="text-xs text-gray-400">© 2026 Course Architect Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
