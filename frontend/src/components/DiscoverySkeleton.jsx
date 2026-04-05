import React from 'react';
import Skeleton from './Skeleton';

const DiscoverySkeleton = () => {
  return (
    <div className="glass-card p-6 rounded-2xl animate-pulse space-y-4">
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-14 rounded-lg" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default DiscoverySkeleton;
