import appConfig from '../../appConfig'
import './DeckPicker.css'

const DECKS = [
  { type: 'base', label: 'Base Deck', count: 17, desc: 'Stat tweaks, weather, animals' },
  { type: 'brainrot', label: 'Brainrot Deck', count: 10, desc: 'Overflow, teleport, chaos' },
]

export default function DeckPicker({ selected, onSelect }) {
  return (
    <div className="deck-picker">
      <span className="dp-label">DECK</span>
      {DECKS.map(d => (
        <button
          key={d.type}
          className={`dp-option${selected === d.type ? ' dp-active' : ''}${d.type === 'brainrot' ? ' dp-brainrot' : ''}`}
          onClick={() => onSelect(d.type)}
        >
          <span className="dp-name">{d.label}</span>
          <span className="dp-info">{d.count} cards</span>
        </button>
      ))}
    </div>
  )
}
