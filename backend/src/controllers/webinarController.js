const { v4: uuidv4 } = require('uuid');
const https = require('https');

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'api.daily.co';

// Helper to call Daily.co REST API
const dailyRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: DAILY_API_URL,
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch { resolve(responseData); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

// POST /api/webinars — create a webinar room
const createWebinar = async (req, res) => {
  try {
    const { title, scheduledAt, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const roomName = `collabro-${uuidv4().slice(0, 8)}`;

    // Create Daily.co room
    const room = await dailyRequest('POST', '/rooms', {
      name: roomName,
      privacy: 'private', // only people with token can join
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: true,
        start_video_off: false,
        start_audio_off: true, // participants start muted
        exp: scheduledAt
          ? Math.floor(new Date(scheduledAt).getTime() / 1000) + 86400 // expires 24h after scheduled time
          : Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
      },
    });

    if (room.error) {
      return res.status(500).json({ error: room.error });
    }

    res.json({
      id: uuidv4(),
      title,
      description,
      scheduledAt,
      roomName: room.name,
      roomUrl: room.url,
      hostId: req.user.userId,
      createdAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/webinars/:roomName/token — get a meeting token
const getMeetingToken = async (req, res) => {
  try {
    const { roomName } = req.params;
    const { isHost } = req.body;

    const tokenData = await dailyRequest('POST', '/meeting-tokens', {
      properties: {
        room_name: roomName,
        is_owner: !!isHost, // host gets owner privileges (can mute others, etc.)
        enable_screenshare: !!isHost, // only host can screen share by default
        start_video_off: false,
        start_audio_off: !isHost, // participants start muted, host doesn't
        exp: Math.floor(Date.now() / 1000) + 86400, // token valid for 24h
      },
    });

    if (tokenData.error) {
      return res.status(500).json({ error: tokenData.error });
    }

    res.json({ token: tokenData.token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/webinars/:roomName — end/delete a room
const deleteWebinar = async (req, res) => {
  try {
    const { roomName } = req.params;
    await dailyRequest('DELETE', `/rooms/${roomName}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createWebinar, getMeetingToken, deleteWebinar };
