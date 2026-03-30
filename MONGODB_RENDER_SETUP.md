# MongoDB Atlas Setup Guide

This guide walks you through setting up MongoDB Atlas for your Skill Connect backend and deploying to Render.

## Part 1: Create MongoDB Atlas Account & Cluster

### Step 1: Go to MongoDB Atlas
1. Visit [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **Sign Up Free** (or log in if you have an account)
3. Create a MongoDB account or sign in with Google

### Step 2: Create a New Project
1. After logging in, you'll see the Organizations page
2. Click **New Project** button
3. Name your project (e.g., "Skill Connect")
4. Click **Create Project**

### Step 3: Create a Cluster
1. In your project, click **Build a Database** (or **Create Deployment**)
2. Choose **M0 Free** tier (this is free, no credit card required for testing)
3. Select cloud provider and region closest to you
4. Click **Create Deployment**

### Step 4: Create Database User
1. After the cluster is created, go to **Security** → **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Create a username (e.g., `skillconnect_user`)
5. Create a strong password (auto-generated is fine) - **SAVE THIS PASSWORD**
6. Click **Add User**

### Step 5: Add IP Whitelist
1. Go to **Security** → **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
   - For production with Render, you'll see Render's IP range in your documentation
4. Click **Confirm**

### Step 6: Get Connection String
1. Go back to **Databases** and click **Connect**
2. Select **Drivers** (not MongoDB Compass)
3. Choose **Node.js** as your driver
4. Copy the connection string that looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Part 2: Configure Your Backend

### Step 1: Update .env File
1. In your `backend/.env` file, add this line with your actual credentials:
   ```
   MONGO_URI=mongodb+srv://skillconnect_user:YourPasswordHere@cluster0.xxxxx.mongodb.net/skillconnect?retryWrites=true&w=majority
   ```

   Replace:
   - `skillconnect_user` with your database username
   - `YourPasswordHere` with your password (URL-encode special characters)
   - `cluster0.xxxxx.mongodb.net` with your cluster URL
   - `skillconnect` with your database name

### Step 2: Install Dependencies
```bash
cd backend
npm install
```

### Step 3: Test Locally
```bash
npm start
```

You should see:
```
✅ Connected to MongoDB Atlas
✅ Skills seeded
✅ Proficiency levels seeded
✅ Production API Server running on port 5000
```

## Part 3: Deploy to Render

### Step 1: Create Render Account
1. Visit [https://render.com](https://render.com)
2. Sign up with GitHub (recommended) or email

### Step 2: Create Web Service
1. Go to Dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select your skill-connect repo

### Step 3: Configure Deploy Settings
Fill in these fields:

| Setting | Value |
|---------|-------|
| **Name** | skill-connect-api |
| **Environment** | Node |
| **Region** | Choose closest to you |
| **Branch** | main |
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && npm start` |

### Step 4: Add Environment Variables
1. Under **Environment**, click **Add Environment Variable** for each:

```
MONGO_URI = mongodb+srv://skillconnect_user:YourPassword@cluster0.xxxxx.mongodb.net/skillconnect?retryWrites=true&w=majority
JWT_SECRET = (generate a long random string)
PORT = 5000
NODE_ENV = production
```

### Step 5: Deploy
1. Click **Create Web Service**
2. Wait for deployment (2-3 minutes)
3. You'll get a URL like: `https://skill-connect-api.onrender.com`

## Part 4: Update MongoDB IP Whitelist for Render

### Step 1: Get Render's IP
After deployment, your Render app will show an IP address. Alternatively, you can use `0.0.0.0/0` during development.

### Step 2: Update MongoDB Atlas
1. Go to MongoDB Atlas → **Security** → **Network Access**
2. Edit the IP whitelist entry
3. Replace it with Render's IP or keep it as "Anywhere" for now

## Part 5: Update Your Android App

Your backend URL is now: `https://skill-connect-api.onrender.com`

Update your Android app's API base URL:

```java
// In your API client configuration
String BASE_URL = "https://skill-connect-api.onrender.com/";
```

All existing endpoints remain the same - only the database backend changed, not the API contract.

## Verification

### Test Your API
```bash
curl https://skill-connect-api.onrender.com/health
```

Expected response:
```json
{"status":"ok"}
```

### Check Logs
- In Render dashboard, click your service
- View **Logs** tab to see real-time server output
- Look for connection confirmation messages

## Troubleshooting

### "MONGO_URI not set" error
- Check that `MONGO_URI` is added to Render environment variables
- Verify the connection string is correct
- Check that special characters in password are URL-encoded

### "Cannot connect to MongoDB"
- Verify IP is whitelisted in MongoDB Atlas
- Check username and password are correct
- Ensure cluster is created and running (it sleeps after 30 days of inactivity on free tier)

### Data not persisting
- MongoDB Atlas automatically persists data
- Check logs for save errors
- Verify collections are being created in MongoDB

## Next Steps

1. **Monitor** your deployment on Render dashboard
2. **Scale up** to M2+ tier when you have real users
3. **Enable encryption** in production (MongoDB Atlas Pro)
4. **Set up backups** through MongoDB Atlas
5. **Use strong passwords** - never commit `.env` file with real credentials

## Important Notes

⚠️ **Production Security Checklist:**
- Never hardcode credentials in code - use environment variables
- Use strong, randomly generated JWT_SECRET
- Use complex database passwords
- Restrict MongoDB IP whitelist to your actual server IPs
- Enable HTTPS (Render handles this automatically)
- Use production-tier MongoDB cluster for real data

✅ **Android App Compatibility:**
- All existing API endpoints work unchanged
- Database swap is transparent to your mobile app
- Authentication tokens remain the same
- Data format remains compatible

## Support

For Render support: https://render.com/docs
For MongoDB Atlas support: https://docs.atlas.mongodb.com/
