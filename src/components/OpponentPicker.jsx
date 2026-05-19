import { useState, useEffect, useRef, useCallback } from 'react'
import './OpponentPicker.css'

const STAT_KEYS = [
  { key: 'power', label: 'PWR', color: '#EF4444' },
  { key: 'aim', label: 'AIM', color: '#008BFF' },
  { key: 'touch', label: 'TCH', color: '#719241' },
]

const ROLES = { marcus: 'The Bomber', sofia: 'The Sniper', david: 'The Closer' }

const FOLLOWING_IDS = ['marcus', 'sofia']

function tryLoad(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

async function discoverImages(id) {
  const images = []
  const exts = ['jpg', 'png']
  for (let i = 1; i <= 30; i++) {
    let found = false
    for (const ext of exts) {
      const url = `/mock-record/opponents/${id}/P_${i}.${ext}`
      if (await tryLoad(url)) {
        images.push(url)
        found = true
        break
      }
    }
    if (!found) break
  }
  return images
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
      className={`opp-card${isSelected ? ' opp-card-selected' : ''}`}
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
          {STAT_KEYS.map(s => (
            <div key={s.key} className="opp-stat">
              <span className="opp-stat-label" style={{ color: s.color }}>{s.label}</span>
              <div className="opp-stat-bar-track">
                <div
                  className="opp-stat-bar-fill"
                  style={{
                    width: `${(player.stats[s.key] / 10) * 100}%`,
                    background: s.color,
                  }}
                />
              </div>
              <span className="opp-stat-val" style={{ color: s.color }}>{player.stats[s.key]}</span>
            </div>
          ))}
          {meta?.distance && (
            <span className="opp-distance">{meta.distance}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'following', label: '关注' },
  { id: 'nearby', label: '附近' },
]

// Per-player metadata (online status, distance)
const PLAYER_META = {
  marcus: { online: true },
  sofia: { online: false },
  david: { online: true, distance: '0.3 km' },
}

export default function OpponentPicker({ aiPlayers, selected, onToggle, onConfirm, onBack }) {
  const [imageMap, setImageMap] = useState({})
  const [tab, setTab] = useState('following')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const map = {}
      for (const p of aiPlayers) {
        map[p.id] = await discoverImages(p.id)
      }
      if (!cancelled) setImageMap(map)
    }
    load()
    return () => { cancelled = true }
  }, [aiPlayers])

  const following = aiPlayers.filter(p => FOLLOWING_IDS.includes(p.id))
  const nearby = aiPlayers.filter(p => !FOLLOWING_IDS.includes(p.id))
  const visible = tab === 'following' ? following : nearby

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

      <div className="opp-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`opp-tab${tab === t.id ? ' opp-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="opp-tab-count">
              {t.id === 'following' ? following.length : nearby.length}
            </span>
          </button>
        ))}
      </div>

      <div className="opp-grid">
        {visible.map(p => (
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
