"use client"

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Search, Swords } from 'lucide-react'
import type { ArenaReplay, ArenaSquad } from '@/lib/ffl-arena'
import { arenaOwners, arenaTimeline, buildArenaMotion, sampleArenaBall, sampleArenaMotion } from '@/lib/arena-motion'

type Directory = { own: ArenaSquad | null; rivals: ArenaSquad[]; nextPage: boolean; history: { id: string; home: string; away: string; score: number[]; createdAt: string }[] }

export function MatchPlayer({ replay }: { replay: ArenaReplay }) {
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const canvas = useRef<HTMLCanvasElement>(null)
  const feed = useRef<HTMLDivElement>(null)
  const playbackTime = useRef(0)
  const paint = useRef<(time: number) => void>(() => {})
  const starts = useMemo(() => arenaTimeline(replay.events), [replay])
  const owners = useMemo(() => arenaOwners(replay.events), [replay])
  const duration = starts[starts.length - 1] || 1
  const motion = useMemo(() => buildArenaMotion(replay.events, starts, duration), [replay, starts, duration])
  const index = Math.max(0, starts.findLastIndex(start => start <= elapsed))
  const event = replay.events[index]
  // Replays from engine 1 carry no minute, so their clock follows playback progress.
  const minuteAt = (entry: ArenaReplay['events'][number], position: number) => entry.minute ?? Math.floor(position / Math.max(1, replay.events.length - 1) * 90)
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    let lastUpdate = last
    const tick = (now: number) => {
      const delta = Math.min(now - last, 100) * speed
      last = now
      playbackTime.current = Math.min(duration, playbackTime.current + delta)
      paint.current(playbackTime.current)
      // The pitch renders every frame; React only updates the controls and commentary.
      if (now - lastUpdate >= 100 || playbackTime.current >= duration) {
        setElapsed(playbackTime.current)
        lastUpdate = now
      }
      if (playbackTime.current < duration) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, duration])
  useEffect(() => { if (elapsed >= duration) setPlaying(false) }, [elapsed, duration])
  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight }, [index])
  useEffect(() => {
    const surface = canvas.current
    const ctx = surface?.getContext('2d')
    if (!surface || !ctx) return
    const draw = (time: number) => {
    const frameIndex = Math.max(0, starts.findLastIndex(start => start <= time))
    const event = replay.events[frameIndex]
    const next = replay.events[Math.min(replay.events.length - 1, frameIndex + 1)]
    const span = (starts[frameIndex + 1] ?? duration) - starts[frameIndex]
    const progress = Math.max(0, Math.min(1, span > 0 ? (time - starts[frameIndex]) / span : 1))
    ctx.fillStyle = '#353b39'; ctx.fillRect(0, 0, 1000, 600)
    for (let stripe = 0; stripe < 10; stripe++) { ctx.fillStyle = stripe % 2 ? '#ffffff03' : '#00000006'; ctx.fillRect(stripe * 100, 0, 100, 600) }
    ctx.strokeStyle = '#ffffff38'; ctx.lineWidth = 2
    ctx.strokeRect(30, 25, 940, 550)
    ctx.beginPath(); ctx.moveTo(500, 25); ctx.lineTo(500, 575); ctx.stroke()
    ctx.beginPath(); ctx.arc(500, 300, 78, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeRect(30, 180, 115, 240); ctx.strokeRect(855, 180, 115, 240)
    ctx.strokeStyle = '#e2e8f0'; ctx.strokeRect(10, 255, 20, 90); ctx.strokeRect(970, 255, 20, 90)
    ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 1
    for (const gx of [10, 970]) for (let gy = 265; gy < 345; gy += 10) {
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 20, gy); ctx.stroke()
    }
    const cards = [...replay.home.cards, ...replay.away.cards]
    const movingPlayers = sampleArenaMotion(motion, time)
    movingPlayers.forEach((point, i) => {
      const x = point.x + 30
      const y = point.y + 25
      ctx.shadowColor = '#0008'; ctx.shadowBlur = 8
      const isDiving = event.kind === 'shot' && event.durationMs !== undefined && i === (1 - event.team) * 7 + 6
      if (isDiving) {
        const reach = Math.sin(progress * Math.PI) * 19
        const direction = next.ball.y < 50 ? -1 : 1
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 7; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (event.team === 0 ? 9 : -9), y + direction * (17 + reach)); ctx.stroke()
        ctx.lineCap = 'butt'
      }
      const radius = surface.clientWidth < 500 ? 22 : 17
      ctx.beginPath()
      if (isDiving) ctx.ellipse(x, y, radius, radius + Math.sin(progress * Math.PI) * 10, next.ball.y < 50 ? -.35 : .35, 0, Math.PI * 2)
      else ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = i < 7 ? '#12b8ad' : '#ee9858'; ctx.fill()
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#071619'; ctx.font = surface.clientWidth < 500 ? 'bold 20px Arial' : 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(i % 7 + 1), x, y + 5)
      ctx.font = '12px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(cards[i].playerName.slice(0, 16), x, y + 33)
    })
    const ball = sampleArenaBall(replay.events, starts, motion, owners, time)
    const bx = ball.x + 30, by = ball.y + 25
    ctx.globalAlpha = ball.alpha
    if (ball.trail) {
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ball.trail.x + 30, ball.trail.y + 25)
      ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 3; ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke()
    ctx.globalAlpha = 1
    if (next.kind === 'save' || event.kind === 'save') {
      const save = next.kind === 'save' ? next : event
      const keeper = movingPlayers[save.team * 7 + 6]
      const kx = keeper.x + 30, ky = keeper.y + 25
      ctx.beginPath(); ctx.arc(kx, ky, 27 + Math.sin(progress * Math.PI) * 8, 0, Math.PI * 2)
      ctx.strokeStyle = '#f8fafc99'; ctx.lineWidth = 4; ctx.stroke()
    }
    if (['goal', 'celebration'].includes(event.kind)) {
      ctx.fillStyle = '#071619e8'; ctx.fillRect(290, 32, 420, 48)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText(`GOL! ${cards[event.team * 7 + event.actor].playerName}`, 500, 63, 400)
    }
    }
    paint.current = draw
    draw(playbackTime.current)
    const resize = new ResizeObserver(() => draw(playbackTime.current))
    resize.observe(surface)
    return () => resize.disconnect()
  }, [replay, starts, motion, duration, owners])
  function seek(time: number) {
    playbackTime.current = time
    paint.current(time)
    setElapsed(time)
  }
  function togglePlayback() {
    if (playing) setElapsed(playbackTime.current)
    else if (playbackTime.current >= duration) seek(0)
    setPlaying(!playing)
  }
  return <section className="mt-8 border-t border-white/15 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <h2 className="text-lg font-semibold">{replay.home.name} <span className="mx-3 text-emerald-300 tabular-nums">{event.score[0]} - {event.score[1]}</span> {replay.away.name}</h2>
      <span className="tabular-nums text-amber-300">{elapsed >= duration ? 'FT' : `${minuteAt(event, index)}'`}</span>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(230px,1fr)]">
      <div className="min-w-0">
        <canvas ref={canvas} width={1000} height={600} className="aspect-[5/3] w-full rounded border border-white/20" aria-label="Animated match replay" />
        <div className="mt-3 flex items-center gap-3">
          <button className="rounded border border-white/20 p-2" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlayback}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <button className="rounded border border-white/20 p-2" title="Replay" aria-label="Replay" onClick={() => { seek(0); setPlaying(true) }}><RotateCcw size={18} /></button>
          <input aria-label="Match progress" type="range" min={0} max={duration} value={elapsed} onChange={e => seek(Number(e.target.value))} className="min-w-0 flex-1 accent-emerald-400" />
          <select aria-label="Replay speed" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="rounded bg-zinc-800 p-2">{[1, 2, 4].map(value => <option key={value} value={value}>{value}x</option>)}</select>
        </div>
      </div>
      <div ref={feed} className="h-80 overflow-y-auto border-l border-white/15 pl-4 lg:h-96" aria-label="Match commentary">
        {replay.events.slice(0, index + 1).map((entry, i) => entry.text && <p key={i} className={`mb-3 border-b border-white/5 pb-2 text-sm ${entry.kind === 'goal' ? 'font-semibold text-amber-300' : 'text-slate-300'}`}><span className="mr-2 text-slate-500">{minuteAt(entry, i)}&apos;</span>{entry.text}</p>)}
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-sm">
      {[replay.home, replay.away].map((side, sideIndex) => <div key={sideIndex}><p className={sideIndex === 0 ? 'text-emerald-300' : 'text-orange-300'}>{side.name}</p><p className="mt-1 text-slate-400">Shots: {replay.events.slice(0, index + 1).filter(e => e.team === sideIndex && e.kind === 'shot').length} · Passes: {replay.events.slice(0, index + 1).filter(e => e.team === sideIndex && e.kind === 'pass').length} · Saves: {replay.events.slice(0, index + 1).filter(e => e.team === sideIndex && e.kind === 'save').length}</p></div>)}
    </div>
  </section>
}

export function Arena() {
  const [data, setData] = useState<Directory | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replay, setReplay] = useState<ArenaReplay | null>(null)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await fetch(`/api/ffl-arena?q=${encodeURIComponent(query)}&page=${page}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Could not load Arena')
        setData(await response.json())
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Connection failed') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, page, refresh])
  async function play(id: string, historical = false) {
    setBusy(true); setError('')
    try {
      const response = await fetch(historical ? `/api/ffl-arena?replay=${id}` : '/api/ffl-arena', historical ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'play', rivalId: id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not start match')
      setReplay(result); setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed') }
    finally { setBusy(false) }
  }
  return <section className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4"><h2 className="text-xl font-semibold">FFL Arena <span className="ml-2 text-sm font-normal text-amber-300">Friendlies</span></h2><Link href="/ffl-cards" className="text-sm text-emerald-300">My Club</Link></div>
    {error && <p role="alert" className="mt-4 text-red-300">{error} <button onClick={() => setRefresh(v => v + 1)} className="underline">Retry</button></p>}
    {!data && loading && <p className="py-6 text-slate-400">Loading squads...</p>}
    {data && !data.own && <div className="py-10"><p>Save a complete seven-player squad in My Club to enter FFL Arena.</p><Link href="/ffl-cards" className="mt-4 inline-block text-emerald-300 underline">Complete squad</Link></div>}
    {data?.own && <>
      {replay && <MatchPlayer key={replay.id} replay={replay} />}
      <div className="my-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">{data.own.formation} <span className="ml-3 text-emerald-300">OVR {data.own.rating}</span></p><label className="flex items-center gap-2 rounded border border-white/20 px-3 py-2"><Search size={16} /><input aria-label="Search opponents" placeholder="Search opponent" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }} className="min-w-0 bg-transparent outline-none" /></label></div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.rivals.map(rival => <article key={rival.id} className="min-w-0 rounded-md border border-white/15 bg-zinc-900/50 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{rival.name}</h3><p className="text-xs text-slate-400">{rival.formation} · {rival.rating}</p></div><button disabled={busy || loading} onClick={() => play(rival.id)} className="flex items-center gap-2 rounded bg-emerald-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"><Swords size={16} />Play</button></div><div className="mt-4 grid grid-cols-7 gap-1">{rival.cards.map(card => <img key={card.id} src={card.image} alt={card.playerName} title={`${card.playerName} - ${card.position}`} className="aspect-[670/1080] w-full object-contain" />)}</div></article>)}
      </div>
      {!data.rivals.length && <p className="py-6 text-slate-400">{query ? 'No opponents match your search.' : 'No complete rival squads yet.'}</p>}
      <div className="mt-4 flex gap-4"><button disabled={!page || loading} onClick={() => setPage(v => v - 1)} className="text-sm disabled:opacity-30">Previous</button><button disabled={!data.nextPage || loading} onClick={() => setPage(v => v + 1)} className="text-sm disabled:opacity-30">Next</button></div>
      {!!data.history.length && <div className="mt-8 border-t border-white/15 pt-5"><h3 className="mb-3 font-semibold">Match history</h3>{data.history.map(match => <button disabled={busy} onClick={() => play(match.id, true)} key={match.id} className="flex w-full items-center justify-between gap-3 border-b border-white/10 py-3 text-left text-sm"><span>{match.home} <strong className="mx-2 text-amber-300">{match.score.join(' - ')}</strong> {match.away}</span><Play size={16} aria-label="Replay match" /></button>)}</div>}
    </>}
  </section>
}
