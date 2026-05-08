import './Player.css'

const PERSON_SVG = (
  <svg className="player-icon" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4 15v-1.5C4 10.5 5.8 9 8 9s4 1.5 4 4.5V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
  </svg>
)

export default function Player({ player }) {
  return (
    <div className="player-node" style={{ '--player-color': player.color }}>
      <div className="player-marker">
        <div className="player-ring" />
        {PERSON_SVG}
      </div>
    </div>
  )
}
