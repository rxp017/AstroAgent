import { useState, useCallback, useRef, useEffect } from 'react'
import { Star, User, X, Settings2, Moon, Sun, Orbit, Save, Trash2 } from 'lucide-react'
import AstrolabeForm from './components/AstrolabeForm.jsx'
import CosmicChat from './components/CosmicChat.jsx'

const API_BASE = '/api'

const THEMES = [
  { id: 'cosmos', label: 'Cosmos', dot: '#d4af37', bg: '#050309' },
  { id: 'dawn', label: 'Mystic Dawn', dot: '#c07830', bg: '#120800' },
  { id: 'indigo', label: 'Deep Indigo', dot: '#9b6fd4', bg: '#04040f' },
]

function StarField({ count = 70 }) {
  const stars = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2.5,
      gold: i % 9 === 0,
    }))
  ).current

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            background: s.gold ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.75)',
            animation: `starTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function NebulaBackground({ theme }) {
  const colors = {
    cosmos: 'radial-gradient(ellipse at 15% 40%, rgba(123,45,139,0.12) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(26,58,107,0.15) 0%, transparent 45%)',
    dawn: 'radial-gradient(ellipse at 15% 40%, rgba(180,80,20,0.15) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(150,60,10,0.12) 0%, transparent 45%)',
    indigo: 'radial-gradient(ellipse at 15% 40%, rgba(80,30,180,0.18) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(60,20,150,0.14) 0%, transparent 45%)',
  }
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 transition-colors duration-700" style={{ background: 'radial-gradient(ellipse at center, #1e1830 0%, #0a0712 55%, #050309 100%)' }} />
      <div className="absolute inset-0" style={{ background: colors[theme] || colors.cosmos }} />
    </div>
  )
}

function ProfilePanel({ profile, onSave, onClose, onClear }) {
  const [editing, setEditing] = useState({ ...profile })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20" onClick={onClose}>
      <div
        className="skeuomorphic-panel w-80 panel-content p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brass-600/30 to-brass-900/50 border border-brass-600/30 flex items-center justify-center">
              <User size={14} className="text-brass-500" />
            </div>
            <h3 className="display-text text-sm font-semibold text-brass-500/80 tracking-widest">My Profile</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="brass-label">Display Name</label>
            <input
              className="engraved-input"
              value={editing.name || ''}
              onChange={(e) => setEditing(p => ({ ...p, name: e.target.value }))}
              placeholder="Your cosmic name..."
            />
          </div>
          <div>
            <label className="brass-label">Birth Date</label>
            <input
              type="date"
              className="engraved-input"
              value={editing.date || ''}
              onChange={(e) => setEditing(p => ({ ...p, date: e.target.value }))}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="brass-label">Birth Time</label>
            <input
              type="time"
              className="engraved-input"
              value={editing.time || ''}
              onChange={(e) => setEditing(p => ({ ...p, time: e.target.value }))}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="brass-label">Latitude</label>
              <input
                type="number"
                step="0.0001"
                className="engraved-input"
                value={editing.latitude || ''}
                onChange={(e) => setEditing(p => ({ ...p, latitude: e.target.value }))}
                placeholder="19.0760"
              />
            </div>
            <div>
              <label className="brass-label">Longitude</label>
              <input
                type="number"
                step="0.0001"
                className="engraved-input"
                value={editing.longitude || ''}
                onChange={(e) => setEditing(p => ({ ...p, longitude: e.target.value }))}
                placeholder="72.8777"
              />
            </div>
          </div>
          <div>
            <label className="brass-label">Timezone</label>
            <input
              className="engraved-input"
              value={editing.timezone || ''}
              onChange={(e) => setEditing(p => ({ ...p, timezone: e.target.value }))}
              placeholder="Asia/Kolkata"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => { onSave(editing); onClose(); }}
              className="brass-button flex-1 py-2 text-xs"
            >
              <Save size={12} /> Save Profile
            </button>
            <button
              onClick={() => { onClear(); onClose(); }}
              className="brass-button-ghost py-2 px-3"
              title="Clear profile"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {profile.name && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs font-sans text-white/25 italic text-center">
              ✦ Profile saved to this device ✦
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function AppHeader({ theme, setTheme, profile, onProfileOpen }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const moonPhases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
  const moonPhase = moonPhases[Math.floor(((Date.now() / 86400000 + 2451550.1) % 29.53) / 29.53 * 8)]

  return (
    <header className="relative z-20 border-b border-white/5" id="app-header">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,7,18,0.95) 0%, rgba(6,4,14,0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.08)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center relative"
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.06) 60%, rgba(0,0,0,0.5) 100%)',
              border: '1px solid rgba(212,175,55,0.35)',
              boxShadow: '0 0 0 2px rgba(212,175,55,0.08), 0 0 0 5px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Star size={16} className="text-brass-600" fill="rgba(212,175,55,0.4)" />
            <div
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #4ade80 0%, #10b981 60%)',
                boxShadow: '0 0 6px rgba(16,185,129,0.8), 0 0 12px rgba(16,185,129,0.4)',
              }}
            />
          </div>
          <div>
            <h1 className="display-text text-xl font-bold tracking-widest text-brass-shimmer">ARADHANA</h1>
            <p className="text-[10px] font-sans text-white/25 tracking-widest uppercase mt-[-2px]">Cosmic Companion</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`theme-pill ${theme === t.id ? 'active' : ''}`}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: t.dot }} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          <div className="flex items-center gap-2 text-xs font-mono text-white/30">
            <span>{moonPhase}</span>
            <span className="text-brass-600/40">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        <button
          id="profile-btn"
          onClick={onProfileOpen}
          className="brass-button-ghost"
          title="My Profile"
        >
          <User size={13} />
          <span className="hidden sm:inline">{profile.name || 'Profile'}</span>
        </button>
      </div>
    </header>
  )
}

function useSSEStream({ onToken, onToolStart, onToolEnd, onDone, onError, onIntentClassified }) {
  const esRef = useRef(null)

  const startStream = useCallback((url) => {
    if (esRef.current) esRef.current.close()
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('token', (e) => { try { onToken?.(JSON.parse(e.data).token) } catch {} })
    es.addEventListener('tool_start', (e) => { try { onToolStart?.(JSON.parse(e.data)) } catch {} })
    es.addEventListener('tool_end', (e) => { try { onToolEnd?.(JSON.parse(e.data)) } catch {} })
    es.addEventListener('done', (e) => { try { onDone?.(JSON.parse(e.data)); es.close() } catch {} })
    es.addEventListener('intent_classified', (e) => { try { onIntentClassified?.(JSON.parse(e.data)) } catch {} })
    es.addEventListener('processing_start', () => {})
    es.addEventListener('error', (e) => {
      if (e.data) { try { onError?.(JSON.parse(e.data).error || 'Error') } catch { onError?.('Stream error') } }
      else if (es.readyState === EventSource.CLOSED) onError?.('Connection lost. Please try again.')
      es.close()
    })
    es.onerror = () => { if (es.readyState === EventSource.CLOSED) { onError?.('Connection closed.'); es.close() } }
  }, [onToken, onToolStart, onToolEnd, onDone, onError, onIntentClassified])

  const stopStream = useCallback(() => { esRef.current?.close(); esRef.current = null }, [])
  useEffect(() => () => esRef.current?.close(), [])
  return { startStream, stopStream }
}

function buildStreamUrl(message, birthDetails, threadId) {
  const params = new URLSearchParams()
  params.set('message', message)
  if (threadId) params.set('thread_id', threadId)
  if (birthDetails) {
    params.set('birth_date', birthDetails.date)
    params.set('birth_time', birthDetails.time)
    params.set('latitude', String(birthDetails.latitude))
    params.set('longitude', String(birthDetails.longitude))
    params.set('timezone', birthDetails.timezone)
  }
  return `${API_BASE}/chat/stream?${params.toString()}`
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [toolState, setToolState] = useState('idle')
  const [toolName, setToolName] = useState('')
  const [threadId, setThreadId] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('aradhana_theme') || 'cosmos')
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aradhana_profile') || '{}') } catch { return {} }
  })

  const streamingIdRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('aradhana_theme', theme)
    const bgMap = { cosmos: '#050309', dawn: '#120800', indigo: '#04040f' }
    document.body.style.background = bgMap[theme] || '#050309'
  }, [theme])

  const saveProfile = useCallback((data) => {
    setProfile(data)
    localStorage.setItem('aradhana_profile', JSON.stringify(data))
  }, [])

  const clearProfile = useCallback(() => {
    setProfile({})
    localStorage.removeItem('aradhana_profile')
  }, [])

  const appendSystemMsg = useCallback((content) =>
    setMessages((p) => [...p, { role: 'system', content }]), [])

  const startStreamingMsg = useCallback(() => {
    const id = Date.now()
    streamingIdRef.current = id
    setMessages((p) => [...p, { role: 'assistant', content: '', streaming: true, id, metadata: null }])
    return id
  }, [])

  const appendToken = useCallback((token) => {
    const id = streamingIdRef.current
    if (!id) return
    setMessages((p) => p.map((m) => m.id === id && m.streaming ? { ...m, content: m.content + token } : m))
  }, [])

  const finalizeMsg = useCallback((metadata) => {
    const id = streamingIdRef.current
    streamingIdRef.current = null
    setMessages((p) => p.map((m) => m.id === id ? { ...m, streaming: false, metadata } : m))
  }, [])

  const { startStream } = useSSEStream({
    onToken: appendToken,
    onToolStart: useCallback((d) => { setToolState('running'); setToolName(d.tool || '') }, []),
    onToolEnd: useCallback(() => setToolState('complete'), []),
    onIntentClassified: useCallback((d) => {
      if (d.intent === 'CHART_REQUEST') appendSystemMsg('✦ Casting your celestial blueprint…')
    }, [appendSystemMsg]),
    onDone: useCallback((d) => {
      if (d.thread_id) setThreadId(d.thread_id)
      finalizeMsg({ intent: d.intent, toolCallsMade: d.tool_calls_made, chartAvailable: d.chart_available })
      setIsLoading(false)
      setTimeout(() => setToolState(d.tool_calls_made > 0 ? 'complete' : 'idle'), 4000)
    }, [finalizeMsg]),
    onError: useCallback((err) => {
      streamingIdRef.current = null
      setMessages((p) => [...p.filter((m) => !m.streaming), { role: 'system', content: `⚠ ${err}` }])
      setIsLoading(false)
      setToolState('error')
      setTimeout(() => setToolState('idle'), 5000)
    }, []),
  })

  const handleSubmit = useCallback(({ message, birthDetails }) => {
    if (isLoading) return
    setMessages((p) => [...p, { role: 'user', content: message }])
    setIsLoading(true)
    setToolState('idle')
    setToolName('')
    setTimeout(() => {
      startStreamingMsg()
      startStream(buildStreamUrl(message, birthDetails, threadId))
    }, 80)
  }, [isLoading, threadId, startStream, startStreamingMsg])

  return (
    <div className="relative min-h-screen flex flex-col" id="app-root" data-theme={theme}>
      <NebulaBackground theme={theme} />
      <StarField />

      <div className="relative z-10 flex flex-col min-h-screen">
        <AppHeader
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          onProfileOpen={() => setShowProfile(true)}
        />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex flex-col gap-5" id="main-content">
          <div className="text-center py-3">
            <p className="font-serif text-base text-white/25 italic">
              "As above, so below — the cosmos mirrors the soul's deepest nature"
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
            <div className="w-full lg:w-[400px] shrink-0 space-y-4">
              <AstrolabeForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                threadId={threadId}
                savedProfile={profile}
              />
              <div className="skeuomorphic-panel panel-content p-4">
                <h3 className="display-text text-xs font-semibold text-brass-600/50 tracking-widest mb-3 uppercase">
                  Session Oracle
                </h3>
                <div className="space-y-2">
                  {[
                    ['Thread', threadId ? threadId.slice(0, 10) + '…' : '—'],
                    ['Messages', messages.filter((m) => m.role !== 'system').length],
                    ['Charts Cast', messages.filter((m) => m.metadata?.toolCallsMade > 0).length],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="text-[11px] font-mono text-white/20">{k}</span>
                      <span className="text-[11px] font-mono text-brass-600/50">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`theme-pill ${theme === t.id ? 'active' : ''}`}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[580px] lg:min-h-0">
              <CosmicChat
                messages={messages}
                toolState={toolState}
                toolName={toolName}
                isLoading={isLoading}
                threadId={threadId}
              />
            </div>
          </div>
        </main>

        <footer className="relative z-10 py-3 text-center border-t border-white/5" id="app-footer">
          <p className="text-[10px] font-mono text-white/12 tracking-widest">
            ✦ ARADHANA · ASTROAGENT · v1.0 · For spiritual exploration only
          </p>
        </footer>
      </div>

      {showProfile && (
        <ProfilePanel
          profile={profile}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
          onClear={clearProfile}
        />
      )}
    </div>
  )
}
