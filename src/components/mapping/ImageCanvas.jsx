import { useRef, useState, useCallback, useEffect } from 'react'
import './ImageCanvas.css'

const MIN_ZOOM = 1
const MAX_ZOOM = 10
const CLICK_THRESHOLD = 4

export default function ImageCanvas({ imageSrc, imageSize, points, selectedId, onCanvasTap, onPointMove, onSelect }) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [interaction, setInteraction] = useState(null)

  // Track container size — containerRef is always mounted via the wrapper
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Reset zoom/pan when image changes
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [imageSrc])

  // Base image rect (fit to container, centered)
  const base = containerSize.w && imageSize.w
    ? (() => {
        const s = Math.min(containerSize.w / imageSize.w, containerSize.h / imageSize.h)
        const w = imageSize.w * s
        const h = imageSize.h * s
        return { w, h, x: (containerSize.w - w) / 2, y: (containerSize.h - h) / 2 }
      })()
    : null

  // Screen coords → UV
  const screenToUV = useCallback((clientX, clientY) => {
    if (!base || !containerRef.current || !imageSize.w) return null
    const rect = containerRef.current.getBoundingClientRect()
    const relX = clientX - rect.left
    const relY = clientY - rect.top
    const cx = containerSize.w / 2
    const cy = containerSize.h / 2
    const layerX = (relX - cx - pan.x) / zoom + cx
    const layerY = (relY - cy - pan.y) / zoom + cy
    const u = (layerX - base.x) / base.w
    const v = (layerY - base.y) / base.h
    if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return null
    const cu = Math.max(0, Math.min(1, u))
    const cv = Math.max(0, Math.min(1, v))
    return { uv: { u: cu, v: cv }, px: { x: Math.round(cu * imageSize.w), y: Math.round(cv * imageSize.h) } }
  }, [base, containerSize, pan, zoom, imageSize])

  // Wheel → zoom toward cursor (non-passive so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      if (!base || !imageSrc) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top
      const cx = containerSize.w / 2
      const cy = containerSize.h / 2
      const cursorLayerX = (relX - cx - pan.x) / zoom + cx
      const cursorLayerY = (relY - cy - pan.y) / zoom + cy
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor))
      if (newZoom === zoom) return
      setZoom(newZoom)
      setPan({
        x: relX - cx - (cursorLayerX - cx) * newZoom,
        y: relY - cy - (cursorLayerY - cy) * newZoom,
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [base, imageSrc, zoom, pan, containerSize])

  // Pointer down
  const handlePointerDown = useCallback((e) => {
    if (!imageSrc || !base) return
    const pointEl = e.target.closest('.map-point')
    if (pointEl) {
      onSelect(pointEl.dataset.id)
      setInteraction({ type: 'point-drag', id: pointEl.dataset.id })
      e.preventDefault()
      return
    }
    setInteraction({ type: 'pending', sx: e.clientX, sy: e.clientY })
    e.preventDefault()
  }, [imageSrc, base, onSelect])

  // Pointer move + up
  useEffect(() => {
    if (!interaction) return
    const handleMove = (e) => {
      if (interaction.type === 'point-drag') {
        const coords = screenToUV(e.clientX, e.clientY)
        if (coords) onPointMove(interaction.id, coords.uv, coords.px)
      } else if (interaction.type === 'pending') {
        if (Math.abs(e.clientX - interaction.sx) > CLICK_THRESHOLD || Math.abs(e.clientY - interaction.sy) > CLICK_THRESHOLD) {
          setInteraction(prev => ({ ...prev, type: 'pan', px: pan.x, py: pan.y }))
        }
      } else if (interaction.type === 'pan') {
        setPan({
          x: interaction.px + (e.clientX - interaction.sx),
          y: interaction.py + (e.clientY - interaction.sy),
        })
      }
    }
    const handleUp = (e) => {
      if (interaction.type === 'pending') {
        const coords = screenToUV(e.clientX, e.clientY)
        if (coords) onCanvasTap(coords.uv, coords.px)
      }
      setInteraction(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [interaction, screenToUV, onPointMove, onCanvasTap, pan])

  // Double-click → reset zoom
  const handleDoubleClick = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const isPanning = interaction?.type === 'pan'

  return (
    <div
      className={`map-canvas-container${isPanning ? ' map-canvas-panning' : ''}`}
      ref={containerRef}
      onPointerDown={imageSrc && base ? handlePointerDown : undefined}
      onDoubleClick={imageSrc ? handleDoubleClick : undefined}
    >
      {!imageSrc ? (
        <div className="map-canvas-empty">
          <div className="map-canvas-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div className="map-canvas-empty-text">Load an image to start mapping</div>
        </div>
      ) : base ? (
        <>
          <div
            className="map-canvas-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <img
              src={imageSrc}
              className="map-canvas-image"
              style={{ left: base.x, top: base.y, width: base.w, height: base.h }}
              draggable={false}
            />
            {points.map((p, i) => (
              <div
                key={p.id}
                data-id={p.id}
                className={`map-point${selectedId === p.id ? ' map-point-selected' : ''}`}
                style={{
                  left: base.x + p.uv.u * base.w,
                  top: base.y + p.uv.v * base.h,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
              >
                <span className="map-point-num">{i + 1}</span>
              </div>
            ))}
          </div>
          {zoom > 1 && (
            <div className="map-zoom-badge" onClick={handleDoubleClick}>
              {Math.round(zoom * 100)}%
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
