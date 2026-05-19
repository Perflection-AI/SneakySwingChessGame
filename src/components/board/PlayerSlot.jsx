import Player from '../Player'

export default function PlayerSlot({ player, pos, isActive, distYd, showDist, transition }) {
  return (
    <div
      className={`board-player-slot${isActive ? ' active-shooter' : ''}`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transition: transition ? 'left 0.5s ease, top 0.5s ease' : 'none',
      }}
    >
      <Player player={player} />
      {showDist && (
        <span className="player-dist-label">{distYd} yd</span>
      )}
    </div>
  )
}
