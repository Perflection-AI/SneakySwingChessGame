import { forwardRef } from 'react'

const mapImgTransition = 'left 1.5s cubic-bezier(0.25,0.1,0.25,1),top 1.5s cubic-bezier(0.25,0.1,0.25,1),width 1.5s cubic-bezier(0.25,0.1,0.25,1),height 1.5s cubic-bezier(0.25,0.1,0.25,1)'

const BoardArea = forwardRef(function BoardArea({ zoom, pan, aspectRatio, fullscreen, onClick, mapImageUrl, mapTransform, darkBg, children }, boardRef) {
  const ar = aspectRatio || 1
  const style = {
    '--zoom': zoom,
    aspectRatio: `${ar} / 1`,
    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
  }
  const mapImgStyle = mapTransform
    ? {
        position: 'absolute',
        width: `${mapTransform.scale}%`,
        height: `${mapTransform.scale * mapTransform.imgAspect}%`,
        left: `${mapTransform.offsetX}%`,
        top: `${mapTransform.offsetY}%`,
        pointerEvents: 'none',
        zIndex: 0,
        transition: mapImgTransition,
      }
    : undefined
  return (
    <div
      className={`board-area${zoom > 1 ? ' zoomed' : ''}${fullscreen ? ' board-area-fullscreen' : ''}${(mapImageUrl || darkBg) ? ' has-map' : ''}${darkBg && !mapImageUrl ? ' dark-bg' : ''}`}
      ref={boardRef}
      style={style}
      onClick={onClick}
      onWheel={undefined}
    >
      {mapImageUrl && (
        <img
          src={mapImageUrl}
          className="board-map-img"
          draggable={false}
          alt=""
          style={mapImgStyle}
        />
      )}
      {children}
    </div>
  )
})

export default BoardArea
