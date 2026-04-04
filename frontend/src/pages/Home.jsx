import React, { useState, useEffect } from 'react';
import Feed from '../components/Feed';
import CreatePost from '../components/CreatePost';
import Suggestions from '../components/Suggestions';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar - User Info */}
      <div className="hidden lg:block lg:col-span-3">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 rounded-2xl sticky top-24"
        >
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-1 mb-4">
              <img 
                src={user.avatarUrl || '/logo.png'} 
                alt={user.name}
                className="h-full w-full rounded-xl object-cover border-2 border-background"
              />
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">@{user.shortId}</p>
            <div className="w-full border-t border-border pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Posts</span>
                <span className="font-bold">0</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Feed */}
      <div className="col-span-1 lg:col-span-6 space-y-6">
        <CreatePost />
        <Feed />
      </div>

      {/* Right Sidebar - Suggestions */}
      <div className="hidden lg:block lg:col-span-3">
        <div className="sticky top-24 space-y-6">
          <Suggestions />
          <div className="glass-card p-4 rounded-xl text-center text-xs text-muted-foreground">
            <p>© 2026 Collabro. All rights reserved.</p>
            <div className="flex justify-center gap-2 mt-2">
              <button className="hover:text-primary">About</button>
              <button className="hover:text-primary">Privacy</button>
              <button className="hover:text-primary">Terms</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
