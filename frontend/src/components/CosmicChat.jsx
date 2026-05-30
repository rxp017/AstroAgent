import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal, Cpu, CheckCircle2, XCircle, Loader2, Star, ChevronDown, ChevronRight, Code } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const INDICATOR_STATES = {
  idle: { color: 'rgba(255,255,255,0.2)', label: 'Idle', pulse: false },
  running: { color: '#fbbf24', label: 'Computing Chart…', pulse: true },
  complete: { color: '#34d399', label: 'Chart Ready', pulse: false },
  error: { color: '#ef4444', label: 'Error', pulse: false },
}

function ToolIndicator({ toolState, toolName }) {
  const config = INDICATOR_STATES[toolState] || INDICATOR_STATES.idle

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border-accent)] bg-black/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
      <div className="indicator-glass">
        <div 
          className="indicator-dot"
          style={{ 
            backgroundColor: config.color,
            boxShadow: config.pulse ? `0 0 10px ${config.color}, 0 0 20px ${config.color}` : 'none'
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        {toolState === 'running' && <Loader2 size={11} className="text-amber-400 animate-spin" />}
        {toolState === 'complete' && <CheckCircle2 size={11} className="text-emerald-400" />}
        {toolState === 'error' && <XCircle size={11} className="text-red-400" />}
        {toolState === 'idle' && <Cpu size={11} className="text-white/30" />}

        <span className="text-[10px] font-mono tracking-wider" style={{ color: config.color }}>
          {toolState !== 'idle' && toolName ? `${config.label} · ${toolName}` : config.label}
        </span>
      </div>
    </div>
  )
}

function SkeuomorphicDataCard({ chartData }) {
  if (!chartData) return null

  const items = [
    { label: 'Sun', data: chartData.planets?.Sun },
    { label: 'Moon', data: chartData.planets?.Moon },
    { label: 'Ascendant', data: chartData.ascendant },
  ]

  return (
    <div className="mb-6 rounded-xl border border-[var(--brass-primary)]/30 bg-gradient-to-b from-black/60 to-black/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] relative">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_50%_-20%,var(--brass-primary)_0%,transparent_60%)]" />
      <div className="px-4 py-2 border-b border-[var(--brass-primary)]/20 flex items-center justify-between bg-black/50">
        <span className="text-[10px] font-mono text-[var(--brass-light)]/70 uppercase tracking-[0.2em]">Celestial Alignment</span>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brass-primary)]/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brass-primary)]/20" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/5 bg-white/[0.02] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
              <span className="text-2xl mb-1 text-[var(--brass-light)] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                {item.data?.glyph || '—'}
              </span>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider mb-0.5">{item.label}</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {item.data?.sign || 'Unknown'}
              </span>
              <span className="text-[10px] font-mono text-[var(--brass-primary)]/70 mt-1">
                {item.data?.longitude ? `${item.data.longitude.toFixed(2)}°` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgentTraceToggle({ chartData }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!chartData) return null
  
  return (
    <div className="mt-5 border-t border-[var(--brass-primary)]/10 pt-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/30 border border-[var(--brass-primary)]/20 hover:border-[var(--brass-primary)]/50 transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.02),0_2px_4px_rgba(0,0,0,0.2)]"
      >
        <Code size={12} className="text-[var(--brass-primary)]" />
        <span className="text-[10px] font-mono text-[var(--brass-light)]/80 uppercase tracking-widest">
          [ {expanded ? '</>' : '< />'} View Agent Trace ]
        </span>
      </button>
      
      {expanded && (
        <div className="mt-3 rounded-md bg-[#0a0a0a] border border-white/10 p-4 overflow-x-auto shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent" />
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <span className="text-[9px] font-mono text-emerald-500/70 uppercase">Tool Execution: compute_birth_chart</span>
            <span className="text-[9px] font-mono text-emerald-500/50">
              {chartData.execution_time_ms ? `${chartData.execution_time_ms}ms` : '—'}
            </span>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400/80 leading-relaxed">
            <code>{JSON.stringify(chartData, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, index, threadId }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isStreaming = message.streaming
  const [chartData, setChartData] = useState(null)
  
  // Fetch chart data if this message involved tool calls
  useEffect(() => {
    if (!isUser && !isSystem && !isStreaming && message.metadata?.toolCallsMade > 0 && threadId) {
      fetch(`/api/chart/${threadId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setChartData(data)
        })
        .catch(err => console.error("Failed to fetch chart trace", err))
    }
  }, [isUser, isSystem, isStreaming, message.metadata, threadId])

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fade-in" key={index}>
        <div className="px-4 py-2 rounded-full border border-[var(--brass-primary)]/20 bg-[var(--brass-primary)]/5 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
          <p className="text-xs font-mono text-[var(--brass-light)]/60 tracking-wider uppercase text-[10px]">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 animate-slide-in-up ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 px-1">
        {!isUser && (
          <div className="flex items-center gap-1.5">
            <Star size={10} className="text-[var(--brass-primary)]" />
            <span className="text-[10px] font-display text-[var(--brass-light)] tracking-widest uppercase">Aradhana</span>
          </div>
        )}
        {isUser && <span className="text-[10px] font-sans text-white/30 tracking-wider uppercase">You</span>}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'rounded-tr-sm bg-gradient-to-br from-[var(--brass-primary)]/10 to-[var(--brass-primary)]/5 border border-[var(--brass-primary)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.3)]'
            : 'rounded-tl-sm border border-white/5 bg-[var(--void-card)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.02),0_4px_12px_rgba(0,0,0,0.5)]'
        }`}
      >
        {!isUser && chartData && <SkeuomorphicDataCard chartData={chartData} />}
        
        {isUser ? (
          <p className="text-sm font-sans text-[var(--text-primary)] leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose-cosmic text-[15px] leading-relaxed">
            <ReactMarkdown 
              components={{
                p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-[var(--brass-light)]" {...props} />,
                li: ({node, ...props}) => <li className="pl-1"><span className="text-[var(--text-primary)]">{props.children}</span></li>,
                strong: ({node, ...props}) => <strong className="font-semibold text-[var(--brass-light)] drop-shadow-[0_0_8px_rgba(212,175,55,0.2)]" {...props} />
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-[var(--brass-light)] ml-1 animate-pulse align-middle" />
            )}
          </div>
        )}
        
        {!isUser && chartData && <AgentTraceToggle chartData={chartData} />}
      </div>

      {message.metadata && (
        <div className="px-2 flex items-center gap-3 mt-1">
          {message.metadata.intent && (
            <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">
              intent: {message.metadata.intent}
            </span>
          )}
          {message.metadata.toolCallsMade > 0 && (
            <span className="text-[9px] font-mono text-emerald-500/50 tracking-widest uppercase">
              ✦ chart computed
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center panel-content">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border border-[var(--brass-primary)]/20 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.05),inset_0_0_20px_rgba(212,175,55,0.02)]">
          <div className="w-16 h-16 rounded-full border border-[var(--brass-primary)]/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-[var(--brass-primary)]/50 flex items-center justify-center bg-[var(--brass-primary)]/5">
              <Star size={14} className="text-[var(--brass-light)] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <h3 className="display-text text-lg font-semibold text-[var(--brass-light)] tracking-widest mb-3 uppercase">The Oracle Awaits</h3>
      <p className="font-serif text-sm text-[var(--text-primary)]/50 italic leading-relaxed max-w-xs">
        Enter your birth details and cast your astrolabe to align the cosmic channels.
      </p>
    </div>
  )
}

export default function CosmicChat({ messages, toolState, toolName, isLoading, threadId }) {
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'end' })
    }
  }, [])

  useEffect(() => {
    if (autoScroll) scrollToBottom()
  }, [messages, autoScroll, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setAutoScroll(isNearBottom)
    setShowScrollButton(!isNearBottom)
  }, [])

  const hasMessages = messages.length > 0

  return (
    <div className="skeuomorphic-panel flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 panel-content bg-black/40 shadow-[0_2px_10px_rgba(0,0,0,0.5)] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="indicator-glass !w-4 !h-4"><div className="indicator-dot !w-2 !h-2 !bg-red-500/80" /></div>
            <div className="indicator-glass !w-4 !h-4"><div className="indicator-dot !w-2 !h-2 !bg-amber-500/80" /></div>
            <div className="indicator-glass !w-4 !h-4"><div className="indicator-dot !w-2 !h-2 !bg-emerald-500/80" /></div>
          </div>
          <div className="w-px h-4 bg-[var(--border-accent)]" />
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-[var(--brass-primary)]" />
            <span className="text-[10px] font-mono text-[var(--brass-light)] tracking-widest uppercase">Astro_Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ToolIndicator toolState={toolState} toolName={toolName} />
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="terminal-screen flex-1 overflow-y-auto px-5 py-6 space-y-6 hide-scrollbar panel-content"
      >
        <div className="flex items-center gap-3 mb-4 opacity-50">
          <div className="h-px flex-1 bg-[var(--brass-primary)]/20" />
          <span className="text-[9px] font-mono text-[var(--brass-primary)] tracking-widest uppercase px-2">Link Established</span>
          <div className="h-px flex-1 bg-[var(--brass-primary)]/20" />
        </div>

        {!hasMessages && <EmptyState />}

        {messages.map((msg, i) => <MessageBubble key={`${msg.role}-${i}`} message={msg} index={i} threadId={threadId} />)}

        {isLoading && !messages.some((m) => m.streaming) && (
          <div className="flex items-start gap-3 animate-fade-in mt-4">
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--brass-primary)] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-[var(--brass-light)]/60 italic pt-0.5">
              Consulting planetary ephemeris…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {showScrollButton && (
        <button
          onClick={() => { setAutoScroll(true); scrollToBottom() }}
          className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-[var(--brass-primary)]/20 border border-[var(--brass-primary)]/40 flex items-center justify-center hover:bg-[var(--brass-primary)]/40 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 backdrop-blur-sm panel-content"
        >
          <ChevronDown size={14} className="text-[var(--brass-light)]" />
        </button>
      )}

      <div className="absolute top-2 left-2 brass-rivet z-20" />
      <div className="absolute top-2 right-2 brass-rivet z-20" />
      <div className="absolute bottom-2 left-2 brass-rivet z-20" />
      <div className="absolute bottom-2 right-2 brass-rivet z-20" />
    </div>
  )
}
