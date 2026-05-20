export default function DistanceGuide({ activePos, holePos, isClutch, clutchRadius }) {
  return (
    <svg className="distance-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line className="guide-line" x1={activePos.x} y1={activePos.y} x2={holePos.x} y2={holePos.y} />
      <circle className="guide-circle" cx={holePos.x} cy={holePos.y} r={clutchRadius} />
    </svg>
  )
}
