import React from 'react';
import Skeleton from './Skeleton';

const ChatSkeleton = () => {
  return (
    <div className="flex h-[calc(100vh-10rem)] bg-background/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-border shadow-2xl shadow-black/50 animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex flex-col w-96 border-r border-border bg-accent/10">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 p-2">
              <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Main Chat Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-20 border-b border-border px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
           <div className="flex justify-start"><Skeleton className="h-16 w-64 rounded-2xl rounded-tl-none bg-accent/40" /></div>
           <div className="flex justify-end"><Skeleton className="h-16 w-48 rounded-2xl rounded-tr-none bg-primary/40" /></div>
           <div className="flex justify-start"><Skeleton className="h-20 w-72 rounded-2xl rounded-tl-none bg-accent/40" /></div>
           <div className="flex justify-end"><Skeleton className="h-12 w-56 rounded-2xl rounded-tr-none bg-primary/40" /></div>
        </div>
        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
             <Skeleton className="h-12 flex-1 rounded-2xl" />
             <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSkeleton;
