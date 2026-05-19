export default function HoledEffect({ x, y, visible }) {
  if (!visible) return null
  return <div className="holed-effect" style={{ left: `${x}%`, top: `${y}%` }} />
}
