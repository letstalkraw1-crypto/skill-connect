import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get token from URL
      const token = searchParams.get('token');
      const errorType = searchParams.get('error');
      const errorMessage = searchParams.get('message');

      // Handle error from backend
      if (errorType) {
        setStatus('error');
        setError(getErrorMessage(errorType, errorMessage));
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return;
      }

      // Handle success
      if (token) {
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        setStatus('success');
        
        // Redirect to home or profile after 1 second
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        throw new Error('No token received from OAuth provider');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setError(err.message || 'Authentication failed');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  const getErrorMessage = (errorType, message) => {
    const errorMessages = {
      authentication_cancelled: 'You cancelled the authentication process.',
      authentication_failed: 'Authentication failed. Please try again.',
      token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
      profile_fetch_failed: 'Failed to fetch your profile. Please try again.',
      provider_timeout: 'The authentication provider is not responding. Please try again later.',
      invalid_state: 'Invalid authentication state. This may be a security issue.',
    };

    return errorMessages[errorType] || message || 'An unknown error occurred.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Completing Sign In
            </h2>
            <p className="text-gray-600">
              Please wait while we complete your authentication...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Success!
            </h2>
            <p className="text-gray-600">
              You've been successfully authenticated. Redirecting...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
