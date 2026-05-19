import { useState, useCallback, useRef, useEffect } from 'react'
import ImageCanvas from './ImageCanvas'
import MappingToolbar from './MappingToolbar'
import PointList from './PointList'
import './MappingView.css'

let nextId = 1

export default function MappingView() {
  const [imageSrc, setImageSrc] = useState(null)
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [points, setPoints] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const imageInputRef = useRef(null)
  const jsonInputRef = useRef(null)
  const blobUrlRef = useRef(null)

  // Revoke old blob URL when unmounting or loading new image
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [imageSrc])

  const handleImageLoad = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(file)
    blobUrlRef.current = url
    const img = new Image()
    img.onload = () => {
      setImageSrc(url)
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      blobUrlRef.current = null
    }
    img.src = url
    e.target.value = ''
  }, [])

  const handleCanvasTap = useCallback((uv, px) => {
    const id = `pt-${nextId++}`
    setPoints(prev => [...prev, { id, uv, px }])
    setSelectedId(id)
  }, [])

  const handlePointMove = useCallback((id, uv, px) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, uv, px } : p))
  }, [])

  const handleSelect = useCallback((id) => {
    setSelectedId(prev => prev === id ? null : id)
  }, [])

  const handleDelete = useCallback((id) => {
    setPoints(prev => prev.filter(p => p.id !== id))
    setSelectedId(prev => prev === id ? null : prev)
  }, [])

  const handleReorder = useCallback((id, dir) => {
    setPoints(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx < 0) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy
    })
  }, [])

  const handleClear = useCallback(() => {
    setPoints([])
    setSelectedId(null)
  }, [])

  const handleSaveJSON = useCallback(() => {
    const now = new Date()
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('')
    const data = {
      version: 1,
      image: { width: imageSize.w, height: imageSize.h },
      points: points.map((p, i) => ({
        index: i + 1,
        uv: { u: +p.uv.u.toFixed(4), v: +p.uv.v.toFixed(4) },
        px: { x: Math.round(p.px.x), y: Math.round(p.px.y) },
      })),
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `map/${ts}/mapping_points.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [points, imageSize])

  const handleLoadJSON = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.points || !Array.isArray(data.points)) return
        nextId = 1
        const loaded = data.points.map(pt => {
          const id = `pt-${nextId++}`
          const uv = { u: pt.uv?.u ?? 0, v: pt.uv?.v ?? 0 }
          const px = pt.px
            ? { x: pt.px.x, y: pt.px.y }
            : { x: Math.round(uv.u * (data.image?.width ?? 1)), y: Math.round(uv.v * (data.image?.height ?? 1)) }
          return { id, uv, px }
        })
        setPoints(loaded)
        setSelectedId(null)
        if (data.image?.width && data.image?.height) {
          setImageSize({ w: data.image.width, h: data.image.height })
        }
      } catch { /* invalid JSON, ignore */ }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  return (
    <div className="mapping-view">
      <ImageCanvas
        imageSrc={imageSrc}
        imageSize={imageSize}
        points={points}
        selectedId={selectedId}
        onCanvasTap={handleCanvasTap}
        onPointMove={handlePointMove}
        onSelect={handleSelect}
      />
      <MappingToolbar
        hasImage={!!imageSrc}
        hasPoints={points.length > 0}
        onOpenImage={() => imageInputRef.current?.click()}
        onOpenJSON={() => jsonInputRef.current?.click()}
        onSave={handleSaveJSON}
        onClear={handleClear}
      />
      <PointList
        points={points}
        selectedId={selectedId}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageLoad} />
      <input ref={jsonInputRef} type="file" accept=".json" hidden onChange={handleLoadJSON} />
    </div>
  )
}
