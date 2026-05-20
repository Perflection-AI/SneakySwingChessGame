import { useState, useEffect, useRef, useCallback } from 'react'
import { discoverPhotos } from '../imageCache'
import './OpponentPicker.css'

const STAT_KEYS = [
  { key: 'power', label: 'PWR', color: '#EF4444' },
  { key: 'aim', label: 'AIM', color: '#008BFF' },
  { key: 'touch', label: 'TCH', color: '#719241' },
]

const ROLES = { marcus: 'The Bomber', sofia: 'The Sniper', david: 'The Closer' }

const FOLLOWING_IDS = ['marcus', 'sofia']

function getTier(val) {
  if (val >= 9) return 'S'
  if (val >= 7) return 'A'
  if (val >= 5) return 'B'
  return 'C'
}

function useBoomerang(images, active) {
  const [idx, setIdx] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!active || images.length === 0) {
      setIdx(0)
      return
    }
    const total = images.length
    const seq = []
    for (let i = 0; i < total; i++) seq.push(i)
    for (let i = total - 2; i >= 1; i--) seq.push(i)

    let pos = 0
    const tick = () => {
      pos = (pos + 1) % seq.length
      setIdx(seq[pos])
      frameRef.current = setTimeout(tick, 80 + Math.random() * 40)
    }
    frameRef.current = setTimeout(tick, 80)
    return () => clearTimeout(frameRef.current)
  }, [active, images.length])

  return active && images.length > 0 ? images[idx] : images[0]
}

function OpponentCard({ player, images, isSelected, onToggle, meta }) {
  const src = useBoomerang(images, isSelected)
  const role = ROLES[player.id] || player.abbr

  return (
    <div
      className={`opp-card${isSelected ? ' opp-card-selected' : ' opp-card-dimmed'}`}
      onClick={onToggle}
    >
      {src && <img className="opp-card-bg" src={src} alt={player.name} />}
      {isSelected && <div className="opp-card-glitch" />}
      <div className="opp-card-overlay">
        <div className="opp-card-top">
          <div className="opp-card-info">
            <div className="opp-card-name-row">
              <span className="opp-card-name">{player.name}</span>
              {meta?.online && <span className="opp-online-dot" />}
            </div>
            <span className="opp-card-role">{role}</span>
          </div>
          <div className={`opp-card-check${isSelected ? ' opp-card-check-on' : ''}`}>
            {isSelected ? '✓' : ''}
          </div>
        </div>
        <div className="opp-card-stats">
          {STAT_KEYS.map(s => {
            const val = player.stats[s.key]
            const tier = getTier(val)
            return (
              <div key={s.key} className="opp-stat-badge" data-tier={tier}>
                <span className="opp-stat-val">{val}</span>
                <span className="opp-stat-label">{s.label}</span>
              </div>
            )
          })}
          {meta?.distance && (
            <span className="opp-distance">{meta.distance}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const SECTIONS = [
  { id: 'following', label: 'Following' },
  { id: 'nearby', label: 'Nearby' },
]

// Per-player metadata (online status, distance)
const PLAYER_META = {
  marcus: { online: true },
  sofia: { online: false },
  david: { online: true, distance: '0.3 km' },
}

export default function OpponentPicker({ aiPlayers, selected, onToggle, onConfirm, onBack }) {
  const [imageMap, setImageMap] = useState({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map = {}
      await Promise.all(aiPlayers.map(async p => {
        map[p.id] = await discoverPhotos(`/mock-record/opponents/${p.id}`)
      }))
      if (!cancelled) setImageMap(map)
    }
    load()
    return () => { cancelled = true }
  }, [aiPlayers])

  const following = aiPlayers.filter(p => FOLLOWING_IDS.includes(p.id))
  const nearby = aiPlayers.filter(p => !FOLLOWING_IDS.includes(p.id))

  const sections = [
    { ...SECTIONS[0], players: following },
    { ...SECTIONS[1], players: nearby },
  ]

  return (
    <div className="opp-container">
      <div className="opp-header">
        {onBack && (
          <button className="opp-back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12.5 15L7.5 10L12.5 5" />
            </svg>
            <span>Training</span>
          </button>
        )}
        <h2 className="opp-title">Pick Opponents</h2>
        <span className="opp-subtitle">Select who you want to challenge</span>
      </div>

      <div className="opp-scroll">
        {sections.map(sec => (
          <div key={sec.id} className="opp-section">
            <div className="opp-section-header">
              <span className="opp-section-label">{sec.label}</span>
              <span className="opp-section-count">{sec.players.length}</span>
            </div>
            <div className="opp-grid">
              {sec.players.map(p => (
                <OpponentCard
                  key={p.id}
                  player={p}
                  images={imageMap[p.id] || []}
                  isSelected={selected.includes(p.id)}
                  onToggle={() => onToggle(p.id)}
                  meta={PLAYER_META[p.id]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="opp-footer">
        <button
          className="opp-start-btn"
          disabled={selected.length === 0}
          onClick={onConfirm}
        >
          {selected.length > 0 ? 'Go Next' : 'Select Opponents'}
        </button>
      </div>
    </div>
  )
}
