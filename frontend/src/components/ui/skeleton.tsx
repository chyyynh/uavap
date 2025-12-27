import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-[var(--uav-radius-xs)] bg-white/5',
        className
      )}
      {...props}
    />
  )
}

function SkeletonText({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('h-4 w-full', className)}
      {...props}
    />
  )
}

function SkeletonCircle({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('size-10 rounded-full', className)}
      {...props}
    />
  )
}

export { Skeleton, SkeletonText, SkeletonCircle }
