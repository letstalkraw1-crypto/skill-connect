import React from 'react';
import Skeleton from './Skeleton';

const ProfileSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden rounded-3xl h-[400px] bg-accent/20 flex flex-col items-center justify-center p-8">
        <Skeleton className="h-40 w-40 rounded-3xl mb-6 shadow-2xl" />
        <div className="space-y-4 w-full flex flex-col items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Bio & Stats Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4 pt-4 border-t border-border">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-2xl" />
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Right: Skills & Content Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-2 rounded-2xl flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-6 rounded-2xl space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
