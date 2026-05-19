import { useMemo } from 'react'
import { getCardDef, STAT_CARD_POOL, BRAINROT_CARD_POOL } from '../cards'
import Palette from '../Palette'
import './DeckPickerScreen.css'

const DECKS = [
  {
    type: 'base',
    label: 'Base Deck',
    count: 17,
    desc: 'Stat tweaks, weather, animals',
    color: '#719241',
  },
  {
    type: 'brainrot',
    label: 'Brainrot Deck',
    count: 10,
    desc: 'Overflow, teleport, chaos',
    color: '#8B5CF6',
  },
]

function sampleCards(pool, n) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n).map(id => getCardDef(id)).filter(Boolean)
}

function PreviewCard({ card, position }) {
  const colors = Palette.effect[card.system] || Palette.effect.player_stat
  const rotation = position === 'left' ? -5 : position === 'right' ? 5 : 0

  return (
    <div
      className="dk-preview-card"
      style={{
        transform: `rotate(${rotation}deg)`,
        '--card-base': colors.base,
        '--card-bg': colors.bg,
        '--card-border': colors.border,
      }}
    >
      <div className="dk-preview-card-inner">
        <span className="dk-preview-badge" style={{ background: colors.solidBg, color: colors.base }}>{colors.label}</span>
        <span className="dk-preview-name" style={{ color: colors.base }}>{card.name}</span>
        <span className="dk-preview-desc">{card.description}</span>
        <span className="dk-preview-flavor">{card.flavorText}</span>
      </div>
    </div>
  )
}

export default function DeckPickerScreen({ selected, onSelect, onConfirm, onBack }) {
  const positions = ['left', 'center', 'right']

  return (
    <div className="dk-container">
      <div className="dk-header">
        <button className="dk-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12.5 15L7.5 10L12.5 5" />
          </svg>
          <span>Course</span>
        </button>
        <h2 className="dk-title">Pick Your Deck</h2>
        <span className="dk-subtitle">Choose a card deck for the match</span>
      </div>

      <div className="dk-grid">
        {DECKS.map(d => {
          const isSelected = selected === d.type
          const pool = d.type === 'brainrot' ? BRAINROT_CARD_POOL : STAT_CARD_POOL
          const previewCards = useMemo(() => sampleCards(pool, 3), [pool])

          return (
            <div
              key={d.type}
              className={`dk-card${isSelected ? ' dk-card-selected' : ''}${selected && !isSelected ? ' dk-card-dimmed' : ''}`}
              style={isSelected ? { borderColor: d.color, '--dk-accent': d.color } : {}}
              onClick={() => onSelect(d.type)}
            >
              <div className="dk-card-color-bar" style={{ background: isSelected ? d.color : '#CDCDCD' }} />
              <div className="dk-card-info">
                <div className="dk-card-text">
                  <span className="dk-card-name" style={isSelected ? { color: d.color } : {}}>{d.label}</span>
                  <span className="dk-card-desc">{d.desc}</span>
                </div>
                <div className="dk-card-right">
                  <span className="dk-card-count" style={isSelected ? { color: d.color } : {}}>{d.count}</span>
                  <div className={`dk-card-check${isSelected ? ' dk-card-check-on' : ''}`}
                    style={isSelected ? { background: d.color, borderColor: d.color } : {}}
                  >
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="dk-card-preview">
                  <div className="dk-preview-fan">
                    {previewCards.map((card, i) => (
                      <PreviewCard key={card.id + i} card={card} position={positions[i]} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="dk-footer">
        <button className="dk-start-btn" onClick={onConfirm}>
          Start Match
        </button>
      </div>
    </div>
  )
}
