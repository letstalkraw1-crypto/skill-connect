/**
 * AI Analysis Service — uses Groq (free, no billing needed)
 * Model: llama3-8b-8192
 * AssemblyAI for transcription (optional)
 */

const https = require('https');

const GROQ_KEY = process.env.GROQ_API_KEY;
const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('JSON parse failed: ' + raw.slice(0, 200))); } });
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

async function scoreWithGroq(transcript, challengeTopic) {
  if (!GROQ_KEY) { console.error('[AI] GROQ_API_KEY not set'); return null; }

  const prompt = `You are an expert communication coach evaluating a short speaking video for the challenge: "${challengeTopic}".

The speaker said: "${transcript}"

Score on 5 dimensions (1-10 each): confidence, clarity, structure, relevance, overall.
Give 2-3 strengths, 2-3 improvements, and a 2-sentence feedback summary.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"scores":{"confidence":7,"clarity":8,"structure":6,"relevance":9,"overall":7},"strengths":["strength1","strength2"],"improvements":["improvement1","improvement2"],"feedback":"Sentence one. Sentence two."}`;

  console.log('[AI] Calling Groq API...');
  const data = await httpsPost('api.groq.com', '/openai/v1/chat/completions',
    { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    {
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    }
  );

  console.log('[AI] Groq response:', JSON.stringify(data).slice(0, 300));

  if (data.error) throw new Error(`Groq error: ${data.error.message || JSON.stringify(data.error)}`);

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq response empty');

  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Extract JSON from response (Groq sometimes adds text before/after)
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Groq response: ' + clean.slice(0, 200));
  return JSON.parse(match[0]);
}

async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  if (!GROQ_KEY && !ASSEMBLYAI_KEY) return;

  const { ChallengeVideo } = require('../config/db');

  try {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'processing' });

    let transcript = null;
    if (ASSEMBLYAI_KEY) {
      try { transcript = await transcribeVideo(videoUrl); }
      catch (err) { console.error('[AI] Transcription failed:', err.message); }
    }

    const textForAI = transcript || `[No transcript — video submitted for topic: "${challengeTopic}"]`;
    const result = await scoreWithGroq(textForAI, challengeTopic);

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

    console.log(`[AI] Groq analysis complete for video ${videoId}`);
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' }).catch(() => {});
  }
}

module.exports = { analyzeVideo };
