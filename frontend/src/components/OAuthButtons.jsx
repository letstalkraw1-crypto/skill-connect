import { useEffect, useState } from 'react';
import OAuthButton from './OAuthButton';

const OAuthButtons = ({ onError }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/auth/oauth/providers`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch OAuth providers');
      }

      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching OAuth providers:', error);
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <OAuthButton
          key={provider.name}
          provider={provider.name}
          displayName={provider.displayName}
          icon={provider.icon}
          onError={onError}
        />
      ))}
    </div>
  );
};

export default OAuthButtons;
