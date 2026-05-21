import { useState, useEffect, useRef } from 'react'

function useBoomerang(images, active, speedMultiplier = 1) {
  const [idx, setIdx] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!active || images.length === 0) {
      setIdx(0)
      return
    }
    const total = images.length
    const seq = []
    for (let i = 0; i < total; i++) seq.push(i)
    for (let i = total - 2; i >= 1; i--) seq.push(i)

    let pos = 0
    const tick = () => {
      pos = (pos + 1) % seq.length
      setIdx(seq[pos])
      const baseDelay = 80 + Math.random() * 40
      frameRef.current = setTimeout(tick, baseDelay / speedMultiplier)
    }
    frameRef.current = setTimeout(tick, 80 / speedMultiplier)
    return () => clearTimeout(frameRef.current)
  }, [active, images.length, speedMultiplier])

  return active && images.length > 0 ? images[idx] : images[0]
}

export default function PlayerThumbnail({ images, active, speedMultiplier }) {
  const src = useBoomerang(images, active, speedMultiplier)

  if (!src) return null

  return (
    <img
      className="player-thumbnail"
      src={src}
      alt=""
      style={{ opacity: 1 }}
    />
  )
}
