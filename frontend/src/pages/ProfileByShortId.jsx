import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { userService } from '../services/api';
import Profile from './Profile';

const ProfileByShortId = () => {
  const { shortId, id } = useParams();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShortId, setIsShortId] = useState(false);

  useEffect(() => {
    const resolveId = async () => {
      const paramId = shortId || id;
      
      if (!paramId) {
        setError('No user ID provided');
        setLoading(false);
        return;
      }
      
      // Check if it looks like a MongoDB ObjectId (24 hex chars) or UUID
      const isObjectId = /^[0-9a-f]{24}$/i.test(paramId);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
      
      if (isObjectId || isUUID) {
        // It's already a userId, use it directly
        setUserId(paramId);
        setIsShortId(false);
        setLoading(false);
        return;
      }
      
      // It's a shortId, resolve it
      try {
        setLoading(true);
        setIsShortId(true);
        const { data } = await userService.getProfileByShortId(paramId);
        setUserId(data._id || data.userId || data.id);
      } catch (err) {
        console.error('Profile resolution error:', err);
        setError(err.response?.data?.error || 'User not found');
      } finally {
        setLoading(false);
      }
    };

    resolveId();
  }, [shortId, id]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userId) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground">{error || 'The profile you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  // If it was a shortId, redirect to the standard profile route with userId
  // Otherwise, render Profile directly
  if (isShortId) {
    return <Navigate to={`/profile/${userId}`} replace />;
  }
  
  return <Profile />;
};

export default ProfileByShortId;
