import { useState, useRef, useCallback, useEffect, useMemo, useSyncExternalStore, Children } from 'react'
import Palette from '../Palette'
import Board from './Board'
import GameControls from './board/GameControls'
import MappingView from './mapping/MappingView'
import TrainingPicker from './TrainingPicker'
import OpponentPicker from './OpponentPicker'
import MapPicker from './MapPicker'
import DeckPickerScreen from './DeckPickerScreen'
import { SWING_ISSUES } from '../utils/shotPhysics'
import appConfig from '../appConfig'
import trainingRecords, { computeStatsFromTraining } from '../data/trainingRecords'
import PracticeRange from './PracticeRange'
import './IslandContainer.css'

const PHASE_ORDER = [
  'training_select', 'opponent_select', 'map_select', 'deck_select', 'playing', 'practice_range',
]

function phaseKey(mode, gamePhase) {
  if (mode === 'mapping') return 'mapping'
  if (mode === 'test' && gamePhase !== 'practice_range') return 'test'
  if (mode === 'illustrate') return 'illustrate'
  return gamePhase
}

function SlideTransition({ slideKey, children }) {
  const [animClass, setAnimClass] = useState('')
  const prevKeyRef = useRef(slideKey)
  const childRef = useRef(children)
  const timerRef = useRef(null)

  if (slideKey !== prevKeyRef.current) {
    const prevIdx = PHASE_ORDER.indexOf(prevKeyRef.current)
    const nextIdx = PHASE_ORDER.indexOf(slideKey)
    const forward = nextIdx > prevIdx
    prevKeyRef.current = slideKey
    childRef.current = children
    setAnimClass(forward ? 'slide-enter' : 'slide-enter-back')
    if (timerRef.current) clearTimeout(timerRef.current)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimClass(forward ? 'slide-enter slide-active' : 'slide-enter-back slide-active')
      })
    })
    timerRef.current = setTimeout(() => setAnimClass(''), 530)
  } else {
    childRef.current = children
  }

  return (
    <div className={`slide-wrapper${animClass ? ' ' + animClass : ''}`}>
      {childRef.current}
    </div>
  )
}

const STAT_META = [
  { key: 'power', label: 'Power' },
  { key: 'aim', label: 'Aim' },
  { key: 'touch', label: 'Touch' },
]

const STAT_VALUES = [1, 3, 5, 7, 9]

const ISSUE_KEYS = Object.keys(SWING_ISSUES)

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerWidth <= MOBILE_BREAKPOINT,
    () => false,
  )
}

function useViewportHeight() {
  return useSyncExternalStore(
    (cb) => {
      const vv = window.visualViewport
      vv.addEventListener('resize', cb)
      vv.addEventListener('scroll', cb)
      return () => { vv.removeEventListener('resize', cb); vv.removeEventListener('scroll', cb) }
    },
    () => window.visualViewport?.height ?? window.innerHeight,
    () => window.innerHeight,
  )
}

const ONBOARDING_LINES = [
  'Stats ← training report',
  'PWR = Rotation + Sequencing',
  'AIM = Plane + Impact Ctrl',
  'TCH = Tempo + Contact + Stability',
  'Issue ← dominant flaw pattern',
  'Click field to hit a shot →',
]

export default function IslandContainer() {
  const isMobile = useIsMobile()
  const viewportHeight = useViewportHeight()
  const [activePlayerId, setActivePlayerId] = useState('marcus')
  const [mode, setMode] = useState('game')
  const [controls, setControls] = useState(null)
  const [discoveredMaps, setDiscoveredMaps] = useState([])
  const [selectedMapIds, setSelectedMapIds] = useState([])

  const [gamePhase, setGamePhase] = useState('training_select') // 'training_select' | 'opponent_select' | 'map_select' | 'deck_select' | 'playing' | 'practice_range'
  const [playerTraining, setPlayerTraining] = useState(null)
  const [selectedOpponents, setSelectedOpponents] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('base')
  const [mapsLoading, setMapsLoading] = useState(false)

  const handleSelectTraining = useCallback((training) => {
    setPlayerTraining(training)
    setGamePhase('opponent_select')
  }, [])

  const handleConfirmOpponents = useCallback(() => {
    setGamePhase('map_select')
  }, [])

  const handleConfirmMap = useCallback(() => {
    setGamePhase('deck_select')
  }, [])

  const handleConfirmDeck = useCallback(() => {
    if (!playerTraining) return
    if (selectedDeck === 'none') {
      appConfig.cards.enabled = false
    } else {
      appConfig.cards.enabled = true
      appConfig.cards.deckType = selectedDeck
    }
    setActivePlayerId('you')
    setGamePhase('playing')
  }, [playerTraining, selectedDeck])

  const handleEnterPracticeRange = useCallback((training) => {
    const stats = training.stats || computeStatsFromTraining(training.day)
    setPlayerTraining(training)
    setTestConfig({ stats: { power: stats.power, aim: stats.aim, touch: stats.touch }, issue: stats.issue || 'none' })
    setMode('test')
    setGamePhase('practice_range')
  }, [])

  const handleExitPracticeRange = useCallback(() => {
    setMode('game')
    setGamePhase('training_select')
  }, [])

  const handleNewGame = useCallback(() => {
    setMode('game')
    setGamePhase('training_select')
    setPlayerTraining(null)
    setSelectedOpponents(['marcus', 'sofia', 'david'])
    setSelectedMapIds([])
    setSelectedDeck('base')
    appConfig.map.imageUrl = null
    appConfig.map.points = []
    appConfig.map.imageWidth = 0
    appConfig.map.imageHeight = 0
    appConfig.map.holePlan = []
    appConfig.map.transform = null
    setActivePlayerId('you')
  }, [])

  const aiPlayers = useMemo(() => [
    {
      id: 'marcus',
      name: 'Marcus Chen',
      abbr: 'MC',
      score: 45,
      color: Palette.yellow[700],
      stats: { power: 5, aim: 4, touch: 4 },
      issue: 'earlyExt',
      photoDir: '/mock-record/opponents/marcus',
    },
    {
      id: 'sofia',
      name: 'Sofia Reyes',
      abbr: 'SR',
      score: 68,
      color: Palette.green[700],
      stats: { power: 5, aim: 9, touch: 6 },
      issue: 'overTheTop',
      photoDir: '/mock-record/opponents/sofia',
    },
    {
      id: 'david',
      name: 'David Kim',
      abbr: 'DK',
      score: 91,
      color: Palette.blue[700],
      stats: { power: 6, aim: 9, touch: 10 },
      issue: 'poorTempo',
      photoDir: '/mock-record/opponents/david',
    },
  ], [])

  const players = useMemo(() => {
    const opponents = aiPlayers.filter(p => selectedOpponents.includes(p.id))
    if (gamePhase === 'playing' && playerTraining) {
      return [
        {
          id: 'you',
          name: 'You',
          abbr: 'YOU',
          score: playerTraining.day.avgScore,
          color: Palette.red[700],
          stats: playerTraining.stats,
          issue: playerTraining.stats.issue,
          photoDir: '/mock-record/day-1',
        },
        ...opponents,
      ]
    }
    if (gamePhase === 'practice_range' && playerTraining) {
      return [
        {
          id: 'you',
          name: 'You',
          abbr: 'YOU',
          score: playerTraining.day.avgScore,
          color: Palette.red[700],
          stats: playerTraining.stats,
          issue: playerTraining.stats.issue,
          photoDir: '/mock-record/day-1',
        },
      ]
    }
    return opponents
  }, [gamePhase, playerTraining, aiPlayers, selectedOpponents])

  const [illustrateConfig, setIllustrateConfig] = useState({
    varyStat: 'power',
    baseStats: { power: 5, aim: 5, touch: 5 },
    paused: false,
  })

  const [testConfig, setTestConfig] = useState({
    stats: { power: 5, aim: 5, touch: 5 },
    issue: 'none',
  })

  const setTestStat = useCallback((key, value) => {
    setTestConfig(c => ({ ...c, stats: { ...c.stats, [key]: value } }))
  }, [])

  // --- Map auto-discovery & management ---

  const discoverMaps = useCallback(async () => {
    const maps = []
    const tryImg = (url) => new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
    for (let i = 1; i <= 20; i++) {
      const id = `map_${i}`
      try {
        const res = await fetch(`/map/${id}/map.json`)
        if (!res.ok) break
        const data = await res.json()
        if (data.points?.length >= 2) {
          let imageUrl = null
          for (const ext of ['png', 'jpg']) {
            const url = `/map/${id}/map.${ext}`
            if (await tryImg(url)) { imageUrl = url; break }
          }
          maps.push({ id, pointCount: data.points.length, data, imageUrl })
        }
      } catch { break }
    }
    setDiscoveredMaps(maps)
    appConfig.map.availableMaps = maps
    return maps
  }, [])

  const rebuildMapConfig = useCallback((selIds, maps) => {
    const selected = selIds
      .map(id => maps.find(m => m.id === id))
      .filter(Boolean)

    if (selected.length === 0) {
      appConfig.map.imageUrl = null
      appConfig.map.points = []
      appConfig.map.imageWidth = 0
      appConfig.map.imageHeight = 0
      appConfig.map.holePlan = []
      return
    }

    // Build hole plan: each map's points generate independent holes
    // Map with N points → N-1 holes: (pt0→pt1), (pt1→pt2), ..., (pt_{N-2}→pt_{N-1})
    const holePlan = []
    for (const m of selected) {
      const pts = m.data.points
      for (let i = 0; i < pts.length - 1; i++) {
        holePlan.push({
          startPt: pts[i],
          endPt: pts[i + 1],
          mapId: m.id,
          imageUrl: m.imageUrl || `/map/${m.id}/map.png`,
          imageWidth: m.data.image?.width ?? 0,
          imageHeight: m.data.image?.height ?? 0,
        })
      }
    }

    // Set first map image as initial background
    const first = holePlan[0]
    appConfig.map.imageUrl = first.imageUrl
    appConfig.map.imageWidth = first.imageWidth
    appConfig.map.imageHeight = first.imageHeight
    appConfig.map.holePlan = holePlan
    appConfig.map.points = [] // no longer used for flat merge
    appConfig.map.availableMaps = selected
  }, [])

  // Auto-discover maps when entering map_select phase
  useEffect(() => {
    if (gamePhase !== 'map_select') return
    if (discoveredMaps.length > 0) return
    setMapsLoading(true)
    discoverMaps().then(maps => {
      // Preload map images after discovery
      maps.forEach(m => {
        if (m.imageUrl) { const img = new Image(); img.src = m.imageUrl }
      })
    }).finally(() => setMapsLoading(false))
  }, [gamePhase, discoveredMaps.length, discoverMaps])

  const handleCheckMap = useCallback((mapId) => {
    setSelectedMapIds(prev => {
      const next = prev.includes(mapId)
        ? prev.filter(id => id !== mapId)
        : [...prev, mapId]
      appConfig.map.selectedMaps = next
      rebuildMapConfig(next, discoveredMaps)
      return next
    })
  }, [discoveredMaps, rebuildMapConfig])

  return (
    <div className={`app-layout${isMobile ? ' app-layout-mobile' : ''}`} style={isMobile ? { height: viewportHeight + 'px' } : undefined}>
      {!isMobile && <aside className="debug-panel">
        <div className="debug-title">Debug</div>
        <div className="debug-label">Mode</div>
        <div className="debug-buttons">
          <button className={`debug-btn${mode === 'test' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#828282' }} onClick={() => setMode('test')}>Test</button>
          <button className={`debug-btn${mode === 'game' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#719342' }} onClick={() => setMode('game')}>Game</button>
          <button className={`debug-btn${mode === 'illustrate' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#008BFF' }} onClick={() => setMode('illustrate')}>Illust</button>
          <button className={`debug-btn${mode === 'mapping' ? ' debug-btn-active' : ''}`} style={{ '--btn-color': '#E0A030' }} onClick={() => setMode('mapping')}>Map</button>
        </div>

        {mode === 'test' && gamePhase !== 'practice_range' && (
          <div className="test-config">
            {/* Onboarding hint */}
            <div className="test-onboarding">
              {ONBOARDING_LINES.map((line, i) => (
                <div key={i} className="test-onboarding-line">{line}</div>
              ))}
            </div>

            {/* Stat pickers */}
            <div className="debug-label">Stats</div>
            <div className="test-stat-group">
              {STAT_META.map(({ key, label }) => (
                <div key={key} className="illustrate-base-row">
                  <span className="illustrate-base-label">{key.slice(0, 3).toUpperCase()}</span>
                  <div className="illustrate-base-vals">
                    {STAT_VALUES.map(v => (
                      <button
                        key={v}
                        className={`illustrate-base-btn${testConfig.stats[key] === v ? ' illustrate-base-btn-active' : ''}`}
                        onClick={() => setTestStat(key, v)}
                      >{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Swing Issue selector */}
            <div className="debug-label">Issue</div>
            <div className="test-issue-selector">
              <select
                className="test-issue-select"
                value={testConfig.issue}
                onChange={(e) => setTestConfig(c => ({ ...c, issue: e.target.value }))}
              >
                {ISSUE_KEYS.map(k => (
                  <option key={k} value={k}>
                    {SWING_ISSUES[k].label}
                  </option>
                ))}
              </select>
              {testConfig.issue !== 'none' && (
                <div className="test-issue-info">
                  <div className="test-issue-effect">{SWING_ISSUES[testConfig.issue].effect}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'illustrate' && (
          <div className="illustrate-config">
            <div className="debug-label">Vary Stat</div>
            <div className="illustrate-stat-toggles">
              {['power', 'aim', 'touch'].map(s => (
                <button
                  key={s}
                  className={`illustrate-stat-btn${illustrateConfig.varyStat === s ? ' illustrate-stat-btn-active' : ''}`}
                  onClick={() => setIllustrateConfig(c => ({ ...c, varyStat: s }))}
                >
                  {s.slice(0, 1).toUpperCase() + s.slice(1, 3)}
                </button>
              ))}
            </div>
            <div className="debug-label">Base Values</div>
            <div className="illustrate-base-group">
              {['power', 'aim', 'touch'].filter(s => s !== illustrateConfig.varyStat).map(s => (
                <div key={s} className="illustrate-base-row">
                  <span className="illustrate-base-label">{s.slice(0, 3).toUpperCase()}</span>
                  <div className="illustrate-base-vals">
                    {[1, 3, 5, 7, 9].map(v => (
                      <button
                        key={v}
                        className={`illustrate-base-btn${illustrateConfig.baseStats[s] === v ? ' illustrate-base-btn-active' : ''}`}
                        onClick={() => setIllustrateConfig(c => ({
                          ...c,
                          baseStats: { ...c.baseStats, [s]: v },
                        }))}
                      >{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="illustrate-pause-btn"
              onClick={() => setIllustrateConfig(c => ({ ...c, paused: !c.paused }))}
            >
              {illustrateConfig.paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        )}

        {controls && !controls.gameFinished && <GameControls {...controls} />}
        {controls && controls.gameFinished && (
          <div className="board-controls">
            <button className="control-btn control-start" onClick={handleNewGame}>New Game</button>
          </div>
        )}
      </aside>}

      <div className={`island${isMobile ? ' island-mobile' : ''}`} style={isMobile ? { height: viewportHeight + 'px' } : undefined}>
        {!isMobile && <div className="island-notch" />}

        {!isMobile && <header className="island-header">
          <span className="header-time">9:41</span>
          <div className="header-island-bar" />
          <div className="header-icons">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white"><rect x="0" y="5" width="3" height="7" rx="0.5"/><rect x="4.5" y="3" width="3" height="9" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white"><path d="M8 2.5C5.5 2.5 3.3 3.8 2 5.8L0 4.2C1.7 1.7 4.7 0 8 0s6.3 1.7 8 4.2l-2 1.6C12.7 3.8 10.5 2.5 8 2.5z" opacity="0.3"/><path d="M8 5.5c-1.7 0-3.2.8-4.2 2L2 6.2C3.3 4.7 5.5 3.5 8 3.5s4.7 1.2 6 2.7l-1.8 1.3C11.2 6.3 9.7 5.5 8 5.5z" opacity="0.6"/><circle cx="8" cy="10" r="2"/></svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="white"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="23" y="4" width="2" height="4" rx="1" opacity="0.4"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/></svg>
          </div>
        </header>}

        <div className={`island-body${(mode === 'game' && gamePhase === 'playing') || gamePhase === 'practice_range' ? ' island-body-game' : ''}${(mode === 'game' && (gamePhase === 'training_select' || gamePhase === 'opponent_select' || gamePhase === 'map_select' || gamePhase === 'deck_select')) ? ' island-body-picker' : ''}`}>
          <SlideTransition slideKey={phaseKey(mode, gamePhase)}>
            {mode === 'mapping' ? (
              <MappingView />
            ) : mode === 'game' && gamePhase === 'deck_select' ? (
              <DeckPickerScreen
                selected={selectedDeck}
                onSelect={setSelectedDeck}
                onConfirm={handleConfirmDeck}
                onBack={() => setGamePhase('map_select')}
              />
            ) : mode === 'game' && gamePhase === 'map_select' ? (
              <MapPicker
                discoveredMaps={discoveredMaps}
                selectedMapIds={selectedMapIds}
                onToggleMap={handleCheckMap}
                onConfirm={handleConfirmMap}
                onSkip={() => { setSelectedMapIds([]); setGamePhase('deck_select') }}
                onBack={() => setGamePhase('opponent_select')}
                loading={mapsLoading}
              />
            ) : mode === 'game' && gamePhase === 'opponent_select' ? (
              <OpponentPicker
                aiPlayers={aiPlayers}
                selected={selectedOpponents}
                onToggle={id => setSelectedOpponents(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                )}
                onConfirm={handleConfirmOpponents}
                onBack={() => setGamePhase('training_select')}
              />
            ) : mode === 'game' && gamePhase === 'training_select' ? (
              <TrainingPicker
                trainingRecords={trainingRecords}
                onSelectTraining={handleSelectTraining}
                onPracticeRange={handleEnterPracticeRange}
              />
            ) : gamePhase === 'practice_range' ? (
              <PracticeRange
                playerTraining={playerTraining}
                testConfig={testConfig}
                onBack={handleExitPracticeRange}
                players={players}
                mapImageUrl={(() => {
                  const m = discoveredMaps.find(m => m.id === selectedMapIds[0])
                  return m?.imageUrl || (selectedMapIds.length > 0 ? `/map/${selectedMapIds[0]}/map.png` : null)
                })()}
              />
            ) : (
              <>
                {mode !== 'game' && <h1 className="game-title">Sneaky Swing</h1>}
                {mode !== 'game' && <p className="game-subtitle">Auto Chess</p>}
                <Board
                  players={players}
                  activePlayerId={activePlayerId}
                  mode={mode}
                  onControls={setControls}
                  illustrateConfig={illustrateConfig}
                  testConfig={testConfig}
                  mapImageUrl={(() => {
                    const m = discoveredMaps.find(m => m.id === selectedMapIds[0])
                    return m?.imageUrl || (selectedMapIds.length > 0 ? `/map/${selectedMapIds[0]}/map.png` : null)
                  })()}
                />
              </>
            )}
          </SlideTransition>
        </div>
      </div>
    </div>
  )
}