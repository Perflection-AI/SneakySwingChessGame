import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { computeStatsFromTraining } from '../data/trainingRecords'
import { SWING_ISSUES, YD_TO_PCT, distPct } from '../utils/shotPhysics'
import Board from './Board'
import Palette from '../Palette'
import './TrainingPicker.css'

function tierOf(score) {
  if (score >= 80) return 'S'
  if (score >= 60) return 'A'
  if (score >= 40) return 'B'
  return 'C'
}

function tierColor(score) {
  if (score >= 80) return '#FFD700'
  if (score >= 60) return '#719241'
  if (score >= 40) return '#5B9BD5'
  return '#B0B0B0'
}

const IMAGES = Array.from({ length: 10 }, (_, i) => `/mock-record/day-1/P_${i + 1}.jpg`)
const CLUBS = ['Driver', '6-Iron', '7-Iron', '8-Iron', '9-Iron', 'PW', 'SW', 'GW', '5-Iron', 'Putter']

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1))
}

function makeSessions(count) {
  return Array.from({ length: count }, () => ({
    src: IMAGES[randInt(0, IMAGES.length - 1)],
    club: CLUBS[randInt(0, CLUBS.length - 1)],
    score: randInt(30, 95),
  }))
}

const SESSION_THUMBS = [makeSessions(7), makeSessions(5), makeSessions(8), makeSessions(4), makeSessions(6)]

function StatBadge({ value, label, size = 'sm' }) {
  const tier = value >= 8 ? 'S' : value >= 6 ? 'A' : value >= 4 ? 'B' : 'C'
  return (
    <div className={`tp-stat-badge tp-stat-badge-${size}`} data-tier={tier}>
      <span className="tp-stat-badge-val">{value}</span>
      <span className="tp-stat-badge-label">{label}</span>
    </div>
  )
}

export default function TrainingPicker({ trainingRecords, onSelectTraining }) {
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [shotLabel, setShotLabel] = useState(null)
  const lastShotTime = useRef(0)
  const labelTimeout = useRef(null)

  const selectedDay = selectedIdx !== null ? trainingRecords[selectedIdx] : null
  const playerStats = useMemo(() => {
    if (!selectedDay) return null
    return computeStatsFromTraining(selectedDay)
  }, [selectedDay])

  useEffect(() => {
    return () => { if (labelTimeout.current) clearTimeout(labelTimeout.current) }
  }, [])

  const testConfig = useMemo(() => {
    if (!playerStats) return { stats: { power: 5, aim: 5, touch: 5 }, issue: 'none' }
    return { stats: { power: playerStats.power, aim: playerStats.aim, touch: playerStats.touch }, issue: playerStats.issue || 'none' }
  }, [playerStats])

  const practicePlayers = useMemo(() => {
    const stats = playerStats || { power: 5, aim: 5, touch: 5 }
    return [{
      id: 'you',
      name: 'You',
      abbr: 'YOU',
      score: selectedDay?.avgScore ?? 50,
      color: Palette.red[700],
      stats,
      issue: stats.issue || 'none',
      photoDir: '/mock-record/day-1',
    }]
  }, [playerStats, selectedDay])

  const handleStart = () => {
    if (!selectedDay || !playerStats) return
    onSelectTraining({ day: selectedDay, stats: playerStats })
  }

  const handleShotResult = useCallback(({ endX, endY, holeX, holeY, outcome }) => {
    const now = Date.now()
    if (now - lastShotTime.current < 300) return
    lastShotTime.current = now

    const distPctVal = distPct({ x: endX, y: endY }, { x: holeX, y: holeY })
    const distYd = distPctVal / YD_TO_PCT

    let shot
    if (outcome === 'holed' || outcome === 'miracle') {
      shot = { label: outcome === 'miracle' ? 'MIRACLE!' : 'HOLED!', color: '#FFD700', distYd: 0 }
    } else {
      const dist = Math.round(distYd)
      shot = {
        label: dist <= 5 ? 'GREAT!' : dist <= 15 ? 'GOOD' : 'OK',
        color: dist <= 5 ? '#719241' : dist <= 15 ? '#5B9BD5' : '#B0B0B0',
        distYd: dist,
      }
    }

    setShotLabel(shot)
    if (labelTimeout.current) clearTimeout(labelTimeout.current)
    labelTimeout.current = setTimeout(() => setShotLabel(null), 1200)
  }, [])

  const issueDef = playerStats?.issue && playerStats.issue !== 'none' ? SWING_ISSUES[playerStats.issue] : null
  const issueKey = playerStats?.issue && playerStats.issue !== 'none' ? playerStats.issue : null

  // Determine which stats are debuffed by the current swing issue
  const debuffedStats = useMemo(() => {
    if (!issueKey || !issueDef) return {}
    return {
      power: !!(issueDef.distMult || issueDef.distRandom || issueDef.maxPushMult),
      aim: !!(issueDef.aimMod || issueDef.offsetMult || issueDef.offsetBias || issueDef.randomDir),
      touch: !!(issueDef.randomPenalty || issueDef.outcomeDrop),
    }
  }, [issueKey, issueDef])

  return (
    <div className="tp-container">
      <div className="tp-nav">
        <span className="tp-nav-label">Sneaky Swing</span>
      </div>
      <div className="tp-header">
        <h2 className="tp-title">Training Records</h2>
        <span className="tp-subtitle">Pick a day to build your stats</span>
      </div>

      <div className="tp-day-list">
        {trainingRecords.map((day, i) => {
          const stats = computeStatsFromTraining(day)
          const tier = tierOf(day.avgScore)
          const active = selectedIdx === i
          return (
            <div
              key={day.id}
              className={`tp-day-card${active ? ' tp-day-card-active' : ''}`}
              onClick={() => setSelectedIdx(prev => prev === i ? null : i)}
            >
              <div className="tp-day-top">
                <div className="tp-day-meta">
                  <span className="tp-day-num">DAY {i + 1}</span>
                  <span className="tp-day-date">{day.date}</span>
                </div>
                <div className="tp-day-score-ring" data-tier={tier}>
                  <span className="tp-day-score-val">{day.avgScore}</span>
                </div>
              </div>
              <div className="tp-day-body">
                <div className="tp-day-left">
                  <div className="tp-sessions">
                    {(SESSION_THUMBS[i] || []).map((s, si) => (
                      <div key={si} className="tp-session">
                        <div className="tp-session-thumb">
                          <img src={s.src} alt="" loading="lazy" />
                          <span className="tp-session-club">{s.club}</span>
                        </div>
                        <span className="tp-session-score" style={{ color: tierColor(s.score) }}>{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tp-day-right">
                  <div className="tp-day-stat-row">
                    <StatBadge value={stats.power} label="PWR" size="xs" />
                    <StatBadge value={stats.aim} label="AIM" size="xs" />
                    <StatBadge value={stats.touch} label="TCH" size="xs" />
                  </div>
                  {stats.issue && stats.issue !== 'none' && (
                    <div className="tp-day-debuff">
                      <span className="tp-debuff-icon">!</span>
                      <span className="tp-debuff-name">{SWING_ISSUES[stats.issue]?.label || stats.issue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="tp-board-area">
        <Board
          players={practicePlayers}
          activePlayerId="you"
          mode="test"
          testConfig={testConfig}
          illustrateConfig={{ varyStat: 'power', baseStats: { power: 5, aim: 5, touch: 5 }, paused: true }}
          onShotResult={handleShotResult}
        />
        {shotLabel && (
          <div className="tp-shot-label" style={{ color: shotLabel.color }}>
            {shotLabel.label}
            {shotLabel.distYd > 0 && <span className="tp-shot-dist">{shotLabel.distYd}yd</span>}
          </div>
        )}
      </div>

      <div className="tp-hud">
        <button
          className={`tp-hud-match-btn${selectedDay && playerStats ? ' tp-hud-match-cover' : ''}${!selectedDay ? ' tp-hud-match-disabled' : ''}`}
          onClick={handleStart}
          disabled={!selectedDay}
        >
          {selectedDay && playerStats ? (
            <div className="tp-hud-match-inner">
              <div className="tp-hud-match-top">
                <div className="tp-hud-match-stats">
                  <span className="tp-hud-match-stat">
                    <span className={`tp-hud-match-stat-val${debuffedStats.power ? ' tp-hud-debuffed' : ''}`}>{playerStats.power}</span>
                    <span className="tp-hud-match-stat-lbl">PWR</span>
                  </span>
                  <span className="tp-hud-match-stat">
                    <span className={`tp-hud-match-stat-val${debuffedStats.aim ? ' tp-hud-debuffed' : ''}`}>{playerStats.aim}</span>
                    <span className="tp-hud-match-stat-lbl">AIM</span>
                  </span>
                  <span className="tp-hud-match-stat">
                    <span className={`tp-hud-match-stat-val${debuffedStats.touch ? ' tp-hud-debuffed' : ''}`}>{playerStats.touch}</span>
                    <span className="tp-hud-match-stat-lbl">TCH</span>
                  </span>
                </div>
                <span className="tp-hud-match-go">GO &#x2192;</span>
              </div>
              {issueDef && (
                <div className="tp-hud-match-debuff">
                  <div className="tp-hud-match-debuff-left">
                    <span className="tp-hud-match-debuff-icon">!</span>
                    <span className="tp-hud-match-debuff-name">{issueDef.label}</span>
                  </div>
                  <span className="tp-hud-match-debuff-desc">{issueDef.effect}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="tp-hud-match-label">Select a day</span>
          )}
        </button>
      </div>
    </div>
  )
}
