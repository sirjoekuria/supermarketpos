import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md ${className}`}
    />
  );
}

export function AppLoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-pos-dark p-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      <div className="flex flex-1 gap-4">
        {/* Sidebar Navigation Skeleton */}
        <div className="hidden md:flex flex-col gap-4 w-64">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-4">
            <Skeleton className="h-32 flex-1 rounded-xl" />
            <Skeleton className="h-32 flex-1 rounded-xl" />
            <Skeleton className="h-32 flex-1 rounded-xl" />
          </div>
          <Skeleton className="flex-1 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
