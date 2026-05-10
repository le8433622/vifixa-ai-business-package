interface LoadingSkeletonProps {
  rows?: number
  height?: string
}

export default function LoadingSkeleton({ rows = 4, height = 'h-16' }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`bg-gray-200 rounded-lg ${height}`} />
      ))}
    </div>
  )
}
