import Player from '../Player'
import PlayerThumbnail from './PlayerThumbnail'

export default function PlayerSlot({ player, pos, isActive, distYd, showDist, transition, cardEffect, penaltyActive, teleportPhase, thumbnails, animSpeed, style }) {
  const isTeleportingOut = teleportPhase === 'fade_out'
  const isTeleportingIn = teleportPhase === 'fade_in'

  return (
    <div
      className={`board-player-slot${isActive ? ' active-shooter' : ''}${isTeleportingOut ? ' player-teleporting-out' : ''}${isTeleportingIn ? ' player-teleporting-in' : ''}`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transition: transition && !isTeleportingOut && !isTeleportingIn ? 'left 0.5s ease, top 0.5s ease' : 'none',
        ...style,
      }}
    >
      {cardEffect === 'buff' && <div className="card-buff-ring" />}
      {penaltyActive && <div className="card-penalty-ring" />}
      {thumbnails?.length > 0 && <PlayerThumbnail images={thumbnails} active={isActive} speedMultiplier={animSpeed || 1} />}
      <Player player={player} />
      {showDist && (
        <span className="player-dist-label">{distYd} yd</span>
      )}
    </div>
  )
}
