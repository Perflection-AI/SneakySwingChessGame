import { useState, useCallback, useEffect } from 'react'

export function useBoardZoom(boardRef) {
  const [zoom, setZoom] = useState(1.0)

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(z => Math.min(3, Math.max(0.5, z - e.deltaY * 0.0008)))
  }, [])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const handler = (e) => { e.preventDefault(); handleWheel(e) }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [handleWheel, boardRef])

  return { zoom, setZoom }
}

function calcZoomForPoints(points, boardWidth, boardHeight) {
  if (!boardWidth || !boardHeight || points.length < 2) return { zoom: 1.0, pan: { x: 0, y: 0 } }

  const allX = points.map(p => p.x)
  const allY = points.map(p => p.y)
  const minX = Math.min(...allX), maxX = Math.max(...allX)
  const minY = Math.min(...allY), maxY = Math.max(...allY)
  const spanX = Math.max(maxX - minX, 4)
  const spanY = Math.max(maxY - minY, 4)

  const fillX = 0.65
  const fillY = 0.70
  const zFromX = (100 * fillX) / spanX
  const zFromY = (100 * fillY) / spanY
  let z = Math.min(zFromX, zFromY, 3.0)
  z = Math.max(z, 0.5)

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2 + 5
  const px = -z * (cx - 50) / 100 * boardWidth
  const py = -z * (cy - 50) / 100 * boardHeight

  return { zoom: z, pan: { x: px, y: py } }
}

export function calcAutoZoom(positions, hole, boardWidth, boardHeight) {
  const all = [...positions, hole]
  return calcZoomForPoints(all, boardWidth, boardHeight)
}

export function calcFollowUpZoom(activePos, hole, boardWidth, boardHeight) {
  const midX = (activePos.x + hole.x) / 2
  const midY = (activePos.y + hole.y) / 2
  const dx = Math.abs(activePos.x - hole.x)
  const dy = Math.abs(activePos.y - hole.y)
  const pad = 12
  return calcZoomForPoints([
    { x: activePos.x, y: activePos.y },
    { x: hole.x, y: hole.y },
    { x: midX - pad, y: midY - pad },
    { x: midX + pad, y: midY + pad },
  ], boardWidth, boardHeight)
}
