import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 bg-card">
            <div className="text-center mb-6">
              <Skeleton className="h-8 w-8 mx-auto mb-4 rounded" />
              <Skeleton className="h-6 w-24 mx-auto mb-2" />
              <div className="flex items-center justify-center gap-1 mb-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
            <div className="space-y-3 mb-6">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
