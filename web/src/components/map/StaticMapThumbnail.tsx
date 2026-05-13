interface StaticMapThumbnailProps {
  lat: number
  lng: number
  zoom?: number
  width?: number
  height?: number
  className?: string
}

export default function StaticMapThumbnail({
  lat,
  lng,
  zoom = 15,
  width = 300,
  height = 200,
  className = '',
}: StaticMapThumbnailProps) {
  const src = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=${lat},${lng},red-pushpin`

  return (
    <img
      src={src}
      alt="Bản đồ"
      width={width}
      height={height}
      className={`rounded-lg border border-gray-200 object-cover ${className}`}
      loading="lazy"
      onError={(e) => {
        const parent = (e.target as HTMLImageElement).parentElement
        if (parent) {
          parent.innerHTML = `<div class="flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-sm" style="width:${width}px;height:${height}px">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`
        }
      }}
    />
  )
}
