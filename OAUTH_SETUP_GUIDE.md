# OAuth/SSO Integration - Complete Setup Guide

## 🚀 Quick Start

This guide will help you set up and test the OAuth/SSO integration for SkillConnect.

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (running locally or MongoDB Atlas)
3. **Redis** (required for OAuth state management)
4. **GitHub Account** (for creating OAuth app)

## 🔧 Step 1: Install Redis

### macOS
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

### Windows
Use WSL or download Redis for Windows from: https://github.com/microsoftarchive/redis/releases

### Docker (All platforms)
```bash
docker run -d -p 6379:6379 redis
```

### Verify Redis is running
```bash
redis-cli ping
# Should return: PONG
```

## 🔑 Step 2: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: SkillConnect Dev (or your app name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:5000/api/auth/oauth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** and copy it

## ⚙️ Step 3: Configure Environment Variables

### Backend Configuration

1. Navigate to backend directory:
```bash
cd backend
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Edit `.env` and add your OAuth credentials:
```bash
# Backend and Frontend URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# GitHub OAuth (REQUIRED)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Redis (if not using default localhost)
REDIS_URL=redis://localhost:6379

# Existing variables (keep as is)
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
# ... other existing variables
```

### Frontend Configuration

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env`:
```bash
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:3000
```

## 📦 Step 4: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 🏃 Step 5: Start the Application

### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
✅ Server running on port 5000
[Redis] Connected successfully
[MongoDB] Connected successfully
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

## 🧪 Step 6: Test OAuth Flow

### Method 1: Direct Browser Test

1. Open browser and navigate to:
   ```
   http://localhost:5000/api/auth/oauth/github
   ```

2. You should be redirected to GitHub login

3. Authorize the application

4. You should be redirected back to:
   ```
   http://localhost:3000/auth/callback?token=<jwt_token>
   ```

5. The token should be stored in localStorage and you should be redirected to home

### Method 2: Using Frontend UI

1. Navigate to: `http://localhost:3000/auth`

2. You should see OAuth buttons (if implemented in Auth page)

3. Click "Continue with GitHub"

4. Complete the OAuth flow

### Method 3: Using cURL

```bash
# Get available providers
curl http://localhost:5000/api/auth/oauth/providers

# Initiate OAuth (will return redirect URL)
curl -L http://localhost:5000/api/auth/oauth/github
```

## ✅ Step 7: Verify Everything Works

### Check User Creation

1. Open MongoDB Compass or mongo shell

2. Query users collection:
```javascript
db.users.findOne({ githubId: { $exists: true } })
```

You should see a user with:
- `githubId`: Your GitHub user ID
- `email`: Your GitHub email
- `isEmailVerified`: true
- `avatarUrl`: Your GitHub avatar

### Check Skill Verification

If you have more than 5 public repos on GitHub:

```javascript
db.skillverifications.find({ verificationType: 'github' })
```

You should see:
```javascript
{
  userId: "...",
  skillName: "Coding",
  verificationType: "github",
  status: "verified",
  verifiedAt: ISODate("..."),
  metadata: {
    publicRepos: 10,
    followers: 5,
    username: "your-github-username"
  }
}
```

### Check Redis State Management

```bash
redis-cli
> KEYS oauth:state:*
# Should show active OAuth states (they expire after 10 minutes)
```

### Check Backend Logs

Look for these log messages:
```
[OAuth] Initiation for provider: github
[OAuth] State created: <uuid>
[OAuth] Callback received for provider: github
[OAuth] State verified successfully
[OAuth] Token exchange successful
[OAuth] User profile fetched
[OAuth] User created/linked: <userId>
[OAuth] Verified Coding skill for user <userId> (X repos)
```

## 🎨 Step 8: Integrate OAuth Buttons in Your UI

### Add to Login/Signup Page

Edit `frontend/src/pages/Auth.jsx`:

```jsx
import OAuthButtons from '../components/OAuthButtons';

// Inside your Auth component
<div className="space-y-4">
  <h2 className="text-2xl font-bold text-center">Sign In</h2>
  
  {/* OAuth Buttons */}
  <OAuthButtons onError={(error) => console.error(error)} />
  
  {/* Divider */}
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">Or continue with email</span>
    </div>
  </div>
  
  {/* Existing email/password form */}
  {/* ... */}
</div>
```

### Add to Profile Page

Edit `frontend/src/pages/Profile.jsx`:

```jsx
import VerifiedSkills from '../components/VerifiedSkills';

// Inside your Profile component
<div className="mt-4">
  <h3 className="text-lg font-semibold mb-2">Skills</h3>
  <VerifiedSkills userId={user._id} />
</div>
```

## 🔒 Step 9: Add More OAuth Providers (Optional)

### Google OAuth

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:5000/api/auth/oauth/google/callback`
6. Add to `.env`:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Microsoft OAuth

1. Go to https://portal.azure.com/
2. Register a new application
3. Add redirect URI: `http://localhost:5000/api/auth/oauth/microsoft/callback`
4. Add to `.env`:
```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

### Strava OAuth

1. Go to https://www.strava.com/settings/api
2. Create an application
3. Add authorization callback domain: `localhost`
4. Add to `.env`:
```bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
```

## 🐛 Troubleshooting

### Issue: "Invalid or unsupported provider"

**Solution**: Check that environment variables are set correctly and restart the backend.

```bash
# Verify environment variables are loaded
cd backend
node -e "require('dotenv').config(); console.log(process.env.GITHUB_CLIENT_ID)"
```

### Issue: "Invalid or expired state"

**Possible causes**:
1. Redis is not running
2. State expired (10 minute timeout)
3. Browser cached old state

**Solutions**:
```bash
# Check Redis is running
redis-cli ping

# Clear Redis state
redis-cli
> FLUSHDB

# Clear browser localStorage
# In browser console:
localStorage.clear()
```

### Issue: "Failed to exchange authorization code"

**Possible causes**:
1. Wrong client secret
2. Callback URL mismatch
3. Code already used

**Solutions**:
1. Verify client secret in `.env`
2. Check callback URL in GitHub OAuth app settings matches exactly:
   `http://localhost:5000/api/auth/oauth/github/callback`
3. Try the OAuth flow again (codes are single-use)

### Issue: "CORS error"

**Solution**: Ensure FRONTEND_URL is in the CORS allowed origins in `backend/src/server.js`

### Issue: Skill verification not working

**Check**:
1. Do you have more than 5 public repos on GitHub?
2. Check backend logs for skill verification messages
3. Verify SkillVerification model exists in database

## 📊 Monitoring and Logs

### View Backend Logs
```bash
cd backend
tail -f combined.log
```

### View OAuth-specific Logs
```bash
cd backend
grep "OAuth" combined.log
```

### Monitor Redis
```bash
redis-cli MONITOR
```

## 🚀 Production Deployment

### Update Environment Variables

```bash
# Production backend URL
BACKEND_URL=https://your-backend.com
FRONTEND_URL=https://your-frontend.com

# Update OAuth app callback URLs in provider settings
# GitHub: https://your-backend.com/api/auth/oauth/github/callback
# Google: https://your-backend.com/api/auth/oauth/google/callback
# etc.
```

### Security Checklist

- [ ] HTTPS enabled on both frontend and backend
- [ ] Environment variables secured (not in version control)
- [ ] Redis secured with password
- [ ] Rate limiting configured
- [ ] CORS restricted to production domains
- [ ] OAuth app secrets rotated regularly

## 📚 Additional Resources

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure Redis and MongoDB are running
5. Check OAuth app configuration in provider settings

## ✨ Success!

If everything is working, you should be able to:
- ✅ Sign in with GitHub
- ✅ See your GitHub profile data in the database
- ✅ Have your Coding skill verified (if you have 5+ repos)
- ✅ Link multiple OAuth providers to one account
- ✅ Unlink OAuth providers safely

Congratulations! Your OAuth/SSO integration is complete! 🎉
