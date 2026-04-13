/**
 * AI Analysis Service
 * Uses Google Gemini 1.5 Flash (free tier) for scoring
 * Uses AssemblyAI for transcription (optional)
 */

const https = require('https');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function transcribeVideo(videoUrl) {
  if (!ASSEMBLYAI_KEY) return null;

  const submit = await httpsPost('api.assemblyai.com', '/v2/transcript',
    { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    { audio_url: videoUrl, language_detection: true }
  );

  if (!submit.id) throw new Error('AssemblyAI submission failed');

  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await httpsGet('api.assemblyai.com', `/v2/transcript/${submit.id}`, { authorization: ASSEMBLYAI_KEY });
    if (poll.status === 'completed') return poll.text || '';
    if (poll.status === 'error') throw new Error(`Transcription error: ${poll.error}`);
  }
  throw new Error('Transcription timed out');
}

async function scoreWithGemini(transcript, challengeTopic) {
  if (!GEMINI_KEY) return null;

  const prompt = `You are an expert communication coach evaluating a short speaking video for the challenge: "${challengeTopic}".

The speaker said:
"${transcript}"

Score the speaker on these 5 dimensions (1-10 each):
1. Confidence — tone, assertiveness, no filler words
2. Clarity — clear articulation, easy to understand
3. Structure — logical flow, intro/body/conclusion
4. Relevance — how well they addressed the challenge topic
5. Overall — holistic score

Also provide:
- 2-3 specific strengths (short bullet points)
- 2-3 specific improvements (short bullet points)
- A 2-sentence encouraging feedback summary

Respond ONLY with valid JSON in this exact format:
{
  "scores": { "confidence": 7, "clarity": 8, "structure": 6, "relevance": 9, "overall": 7 },
  "strengths": ["Good eye contact mentioned", "Clear opening statement"],
  "improvements": ["Reduce filler words like 'um'", "Add a stronger conclusion"],
  "feedback": "You showed great enthusiasm and relevance to the topic. Focus on reducing filler words to sound more polished."
}`;

  const path = `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
  const data = await httpsPost('generativelanguage.googleapis.com', path,
    { 'content-type': 'application/json' },
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    }
  );

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini response empty');

  // Strip markdown code fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  if (!GEMINI_KEY && !ASSEMBLYAI_KEY) return;

  const { ChallengeVideo } = require('../config/db');

  try {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'processing' });

    let transcript = null;
    if (ASSEMBLYAI_KEY) {
      try { transcript = await transcribeVideo(videoUrl); }
      catch (err) { console.error('[AI] Transcription failed:', err.message); }
    }

    const textForGPT = transcript || `[No transcript — video submitted for topic: "${challengeTopic}"]`;

    let result = null;
    if (GEMINI_KEY) {
      result = await scoreWithGemini(textForGPT, challengeTopic);
    }

    if (!result) {
      await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' });
      return;
    }

    await ChallengeVideo.findByIdAndUpdate(videoId, {
      'aiAnalysis.status': 'done',
      'aiAnalysis.transcript': transcript,
      'aiAnalysis.scores': result.scores,
      'aiAnalysis.feedback': result.feedback,
      'aiAnalysis.strengths': result.strengths || [],
      'aiAnalysis.improvements': result.improvements || [],
      'aiAnalysis.analyzedAt': new Date(),
    });

    console.log(`[AI] Gemini analysis complete for video ${videoId}`);
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' }).catch(() => {});
  }
}

module.exports = { analyzeVideo };


function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function transcribeVideo(videoUrl) {
  if (!ASSEMBLYAI_KEY) return null;

  const submit = await httpsPost('api.assemblyai.com', '/v2/transcript',
    { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    { audio_url: videoUrl, language_detection: true }
  );

  if (!submit.id) throw new Error('AssemblyAI submission failed');

  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await httpsGet('api.assemblyai.com', `/v2/transcript/${submit.id}`, { authorization: ASSEMBLYAI_KEY });
    if (poll.status === 'completed') return poll.text || '';
    if (poll.status === 'error') throw new Error(`Transcription error: ${poll.error}`);
  }
  throw new Error('Transcription timed out');
}

async function scoreWithGPT(transcript, challengeTopic) {
  if (!OPENAI_KEY) return null;

  const prompt = `You are an expert communication coach evaluating a short speaking video for the challenge: "${challengeTopic}".

The speaker said:
"${transcript}"

Score the speaker on these 5 dimensions (1-10 each):
1. Confidence — tone, assertiveness, no filler words
2. Clarity — clear articulation, easy to understand
3. Structure — logical flow, intro/body/conclusion
4. Relevance — how well they addressed the challenge topic
5. Overall — holistic score

Also provide:
- 2-3 specific strengths (short bullet points)
- 2-3 specific improvements (short bullet points)
- A 2-sentence encouraging feedback summary

Respond ONLY with valid JSON in this exact format:
{
  "scores": { "confidence": 7, "clarity": 8, "structure": 6, "relevance": 9, "overall": 7 },
  "strengths": ["Good eye contact mentioned", "Clear opening statement"],
  "improvements": ["Reduce filler words like 'um'", "Add a stronger conclusion"],
  "feedback": "You showed great enthusiasm and relevance to the topic. Focus on reducing filler words to sound more polished."
}`;

  const data = await httpsPost('api.openai.com', '/v1/chat/completions',
    { authorization: `Bearer ${OPENAI_KEY}`, 'content-type': 'application/json' },
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }
  );

  if (!data.choices?.[0]?.message?.content) throw new Error('GPT response empty');
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Main: analyze a submitted video asynchronously
 * Call this after saving the video — it updates the DB itself
 */
async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  if (!OPENAI_KEY && !ASSEMBLYAI_KEY) return;

  const { ChallengeVideo } = require('../config/db');

  try {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'processing' });

    let transcript = null;
    if (ASSEMBLYAI_KEY) {
      try { transcript = await transcribeVideo(videoUrl); }
      catch (err) { console.error('[AI] Transcription failed:', err.message); }
    }

    const textForGPT = transcript || `[No transcript — video submitted for topic: "${challengeTopic}"]`;

    let result = null;
    if (OPENAI_KEY) {
      result = await scoreWithGPT(textForGPT, challengeTopic);
    }

    if (!result) {
      await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' });
      return;
    }

    await ChallengeVideo.findByIdAndUpdate(videoId, {
      'aiAnalysis.status': 'done',
      'aiAnalysis.transcript': transcript,
      'aiAnalysis.scores': result.scores,
      'aiAnalysis.feedback': result.feedback,
      'aiAnalysis.strengths': result.strengths || [],
      'aiAnalysis.improvements': result.improvements || [],
      'aiAnalysis.analyzedAt': new Date(),
    });

    console.log(`[AI] Analysis complete for video ${videoId}`);
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' }).catch(() => {});
  }
}

module.exports = { analyzeVideo };
