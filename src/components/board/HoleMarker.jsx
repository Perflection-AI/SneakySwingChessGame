export default function HoleMarker({ x, y }) {
  return (
    <div className="hole-marker" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="hole-flag" />
      <div className="hole-ring" />
    </div>
  )
}
