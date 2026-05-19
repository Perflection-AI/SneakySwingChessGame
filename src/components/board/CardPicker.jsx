import { getCardDef } from '../../cards'
import './CardPicker.css'

export default function CardPicker({ hand, onUseCard, onSkipCard, currentPlayerName }) {
  const slots = [0, 1]
  return (
    <div className="card-picker">
      <div className="cp-cards">
        {slots.map((_, i) => {
          const cardId = hand[i]
          if (!cardId) return <div key={i} className="cp-slot cp-slot-empty" />
          const card = getCardDef(cardId)
          if (!card) return <div key={i} className="cp-slot cp-slot-empty" />
          return (
            <div key={i} className="cp-slot">
              <div className="cp-name">{card.name}</div>
              <div className="cp-desc">{card.description}</div>
              <div className="cp-flavor">{card.flavorText}</div>
              <button className="cp-use-btn" onClick={() => onUseCard(cardId)}>USE</button>
            </div>
          )
        })}
      </div>
      <button className="cp-skip" onClick={onSkipCard}>Skip →</button>
    </div>
  )
}
