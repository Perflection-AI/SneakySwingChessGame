import './Player.css'

const EMOJIS = {
  you: '⛳',
  marcus: '🐯',
  sofia: '🦊',
  david: '🦅',
}

export default function Player({ player, dimmed }) {
  return (
    <div className={`player-node${dimmed ? ' player-dimmed' : ''}`} style={{ '--player-color': player.color }}>
      <div className="player-marker">
        <div className="player-ring" />
        <span className="player-emoji">{EMOJIS[player.id] || '⛳'}</span>
      </div>
    </div>
  )
}
