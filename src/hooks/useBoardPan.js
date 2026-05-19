import { useState, useRef, useEffect } from 'react'

export function useBoardPan(boardRef) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const panAnchor = useRef(null)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    const onCtx = (e) => e.preventDefault()
    const onDown = (e) => {
      if (e.button !== 2) return
      e.preventDefault()
      panAnchor.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y }
      el.classList.add('panning')
    }
    const onMove = (e) => {
      if (!panAnchor.current) return
      const dx = e.clientX - panAnchor.current.mx
      const dy = e.clientY - panAnchor.current.my
      const next = { x: panAnchor.current.px + dx, y: panAnchor.current.py + dy }
      panRef.current = next
      setPan(next)
    }
    const onUp = () => {
      panAnchor.current = null
      el.classList.remove('panning')
    }

    el.addEventListener('contextmenu', onCtx)
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('contextmenu', onCtx)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [boardRef])

  return { pan, panRef, setPan }
}
