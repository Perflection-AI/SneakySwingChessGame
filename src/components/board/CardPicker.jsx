import { useState } from 'react'
import { getCardDef } from '../../cards'
import Palette from '../../Palette'
import './CardPicker.css'

const EFFECT_COLORS = Palette.effect

function SystemBadge({ system }) {
  const c = EFFECT_COLORS[system] || EFFECT_COLORS.player_stat
  return (
    <span className="cp-badge" style={{ background: c.solidBg, color: c.base, borderColor: c.base }}>
      {c.label}
    </span>
  )
}

export default function CardPicker({ hand, onUseCard, onSkipCard, onExchange, currentPlayerName }) {
  const [selected, setSelected] = useState(new Set())

  const toggleSelect = (slotIdx) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(slotIdx)) {
        next.delete(slotIdx)
      } else if (next.size < 2) {
        next.add(slotIdx)
      }
      return next
    })
  }

  const exchangeIndices = [...selected]

  return (
    <div className="card-picker">
      <div className="cp-header">
        <span className="cp-title">Choose a Card</span>
        <span className="cp-player">{currentPlayerName}</span>
      </div>
      <div className="cp-hint">Cards spawn randomly along the path — land your ball nearby to pick them up!</div>
      <div className="cp-grid">
        {[0, 1, 2].map((i) => {
          const cardId = hand[i]
          const card = cardId ? getCardDef(cardId) : null
          const isSelected = selected.has(i)
          if (!card) return <div key={i} className="cp-slot cp-slot-empty" />
          const colors = EFFECT_COLORS[card.system] || EFFECT_COLORS.player_stat
          return (
            <div
              key={i}
              className={`cp-slot${isSelected ? ' cp-slot-selected' : ''}`}
              style={{ borderColor: isSelected ? '#EF4444' : colors.base }}
              onClick={() => toggleSelect(i)}
            >
              <div className="cp-emoji">{card.emoji}</div>
              <div className="cp-badge-row">
                <SystemBadge system={card.system} />
                <span className="cp-name" style={{ color: isSelected ? '#EF4444' : colors.base }}>{card.name}</span>
              </div>
              <div className="cp-desc">{card.description}</div>
              <div className="cp-flavor">{card.flavorText}</div>
              <button
                className="cp-use-btn"
                style={{ background: colors.base }}
                onClick={(e) => { e.stopPropagation(); onUseCard(cardId) }}
              >
                USE
              </button>
            </div>
          )
        })}
      </div>
      <div className="cp-actions">
        <button className="cp-skip" onClick={onSkipCard}>Skip</button>
        <button
          className={`cp-exchange${selected.size === 2 ? ' cp-exchange-ready' : ''}`}
          disabled={selected.size !== 2}
          onClick={() => {
            if (selected.size === 2) {
              onExchange(exchangeIndices)
              setSelected(new Set())
            }
          }}
        >
          Trade Selected (2 → 1)
        </button>
      </div>
    </div>
  )
}
