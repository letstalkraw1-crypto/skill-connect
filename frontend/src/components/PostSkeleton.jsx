import React from 'react';
import Skeleton from './Skeleton';

const PostSkeleton = () => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden mb-6 animate-pulse">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      <div className="px-4 pb-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="w-full aspect-video rounded-xl" />
      </div>

      <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;
