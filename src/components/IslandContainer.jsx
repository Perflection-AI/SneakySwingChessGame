import { useState, useRef, useCallback, useEffect } from 'react'
import Palette from '../Palette'
import Board from './Board'
import './IslandContainer.css'

const players = [
  {
    id: 'marcus',
    name: 'Marcus Chen',
    abbr: 'MC',
    score: 50,
    color: Palette.yellow[700],
    stats: { power: 5, aim: 3, nerve: 2 },
    curse: {
      issue: 'Hip Betrayal',
      desc: '屁股提前下班，球突然不认路',
      effect: { stat: 'aim', mod: -1, label: 'Aim −1' },
    },
  },
  {
    id: 'sofia',
    name: 'Sofia Reyes',
    abbr: 'SR',
    score: 82,
    color: Palette.green[700],
    stats: { power: 8, aim: 5, nerve: 6 },
    curse: {
      issue: 'Premature Release',
      desc: '力量提前花完，球还没到地方人已经没了',
      effect: { stat: 'power', mod: -2, label: 'Power −2' },
    },
  },
]

const STAT_META = [
  { key: 'power', label: 'Power' },
  { key: 'aim', label: 'Aim' },
  { key: 'nerve', label: 'Nerve' },
]

export default function IslandContainer() {
  const [activePlayerId, setActivePlayerId] = useState('marcus')
  const [mode, setMode] = useState('game')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const dragRef = useRef(null)

  const onDrawerPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = { startY: e.clientY, wasOpen: drawerOpen, moved: false }
  }, [drawerOpen])

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const dy = d.startY - e.clientY
      if (Math.abs(dy) > 8) d.moved = true
      if (dy > 30 && !d.wasOpen) { setDrawerOpen(true); dragRef.current = null }
      else if (dy < -30 && d.wasOpen) { setDrawerOpen(false); dragRef.current = null }
    }
    const onUp = () => {
      const d = dragRef.current
      if (d && !d.moved) setDrawerOpen(v => !v)
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div className="app-layout">
      <aside className="debug-panel">
        <div className="debug-title">Debug</div>
        <div className="debug-label">Mode</div>
        <div className="debug-buttons">
          <button className={`debug-btn${mode === 'test' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#828282' }} onClick={() => setMode('test')}>Test</button>
          <button className={`debug-btn${mode === 'game' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#719342' }} onClick={() => setMode('game')}>Game</button>
        </div>
        <div className="debug-label">Active Shooter</div>
        <div className="debug-buttons">
          {players.map(p => (
            <button
              key={p.id}
              className={`debug-btn${activePlayerId === p.id ? ' debug-btn-active' : ''}`}
              style={{ '--btn-color': p.color }}
              onClick={() => setActivePlayerId(p.id)}
            >
              <span className="debug-btn-dot" />
              {p.abbr}
            </button>
          ))}
        </div>
        <div className="debug-stats">
          {(() => {
            const p = players.find(p => p.id === activePlayerId)
            return (
              <>
                <div className="debug-stat"><span>PWR</span><span>{p.stats.power}</span></div>
                <div className="debug-stat"><span>AIM</span><span>{p.stats.aim}</span></div>
                <div className="debug-stat"><span>NRV</span><span>{p.stats.nerve}</span></div>
              </>
            )
          })()}
        </div>
      </aside>

      <div className="island">
        <div className="island-notch" />

        <header className="island-header">
          <span className="header-time">9:41</span>
          <div className="header-island-bar" />
          <div className="header-icons">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white"><rect x="0" y="5" width="3" height="7" rx="0.5"/><rect x="4.5" y="3" width="3" height="9" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white"><path d="M8 2.5C5.5 2.5 3.3 3.8 2 5.8L0 4.2C1.7 1.7 4.7 0 8 0s6.3 1.7 8 4.2l-2 1.6C12.7 3.8 10.5 2.5 8 2.5z" opacity="0.3"/><path d="M8 5.5c-1.7 0-3.2.8-4.2 2L2 6.2C3.3 4.7 5.5 3.5 8 3.5s4.7 1.2 6 2.7l-1.8 1.3C11.2 6.3 9.7 5.5 8 5.5z" opacity="0.6"/><circle cx="8" cy="10" r="2"/></svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="white"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="23" y="4" width="2" height="4" rx="1" opacity="0.4"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/></svg>
          </div>
        </header>

        <div className="island-body">
          <h1 className="game-title">Sneaky Swing</h1>
          <p className="game-subtitle">Auto Chess</p>
          <Board players={players} activePlayerId={activePlayerId} mode={mode} />
        </div>

        <div
          className={`player-drawer${drawerOpen ? ' open' : ''}`}
          onPointerDown={onDrawerPointerDown}
        >
          <div className="drawer-handle">
            <div className="drawer-handle-bar" />
          </div>

          <div className="drawer-peeks">
            {players.map(p => (
              <div key={p.id} className="drawer-peek">
                <div className="player-dot" style={{ background: p.color }} />
                <span className="drawer-peek-name">{p.abbr}</span>
              </div>
            ))}
          </div>

          <div className="drawer-detail">
            {players.map((p) => (
              <div key={p.id} className="player-card">
                <div className="player-card-header">
                  <div className="player-dot" style={{ background: p.color }} />
                  <span className="player-name">{p.abbr}</span>
                  <span className="player-score">{p.score}</span>
                </div>

                <div className="player-stats">
                  {STAT_META.map(({ key, label }) => (
                    <div key={key} className="stat-row">
                      <span className="stat-label">{label}</span>
                      <span className={`stat-value${p.curse.effect?.stat === key ? ' stat-cursed' : ''}`}>
                        {p.curse.effect?.stat === key ? p.stats[key] + p.curse.effect.mod : p.stats[key]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="curse-section">
                  <span className="curse-title">SWING CURSE</span>
                  <div className="curse-name">{p.curse.issue}</div>
                  <div className="curse-desc">{p.curse.desc}</div>
                  <div className="curse-effect">{p.curse.effect.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}