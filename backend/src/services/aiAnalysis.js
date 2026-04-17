/**
 * AI Analysis Service — uses Groq + AssemblyAI
 * Keys are read dynamically on each call so Render env vars always work
 */

const https = require('https');

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON parse failed: ' + raw.slice(0, 300))); }
      });
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
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function transcribeVideo(videoUrl) {
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_KEY) {
    console.warn('[AI] ASSEMBLYAI_API_KEY not set — skipping transcription');
    return null;
  }

  console.log('[AI] Submitting to AssemblyAI:', videoUrl.slice(0, 60) + '...');

  const submit = await httpsPost(
    'api.assemblyai.com', '/v2/transcript',
    { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    { audio_url: videoUrl, language_detection: true }
  );

  if (!submit.id) {
    console.error('[AI] AssemblyAI submission failed:', JSON.stringify(submit).slice(0, 200));
    throw new Error('AssemblyAI submission failed: ' + JSON.stringify(submit));
  }

  console.log('[AI] AssemblyAI job ID:', submit.id);

  // Poll up to 2 minutes (24 × 5s)
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await httpsGet(
      'api.assemblyai.com',
      `/v2/transcript/${submit.id}`,
      { authorization: ASSEMBLYAI_KEY }
    );
    console.log(`[AI] AssemblyAI poll ${i + 1}: status=${poll.status}`);
    if (poll.status === 'completed') return poll.text || '';
    if (poll.status === 'error') throw new Error(`AssemblyAI error: ${poll.error}`);
  }

  throw new Error('AssemblyAI transcription timed out after 2 minutes');
}

async function scoreWithGroq(transcript, challengeTopic) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    console.error('[AI] GROQ_API_KEY not set');
    return null;
  }

  const words = transcript.trim().split(/\s+/);
  const wordCount = words.length;
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right'];
  const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''))).size;
  const vocabularyRichness = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0;

  const nlpContext = `NLP Pre-analysis:
- Word count: ${wordCount}
- Filler words: ${fillerCount} (${fillerWords.filter(f => transcript.toLowerCase().includes(f)).join(', ') || 'none'})
- Vocabulary richness: ${vocabularyRichness}% unique words
- Sentences: ${sentences}, avg ${avgWordsPerSentence} words/sentence`;

  const prompt = `You are an expert communication coach evaluating a short speaking video for the challenge: "${challengeTopic}".

The speaker said: "${transcript}"

${nlpContext}

IMPORTANT RULES:
- If the transcript is very short (under 10 words), score everything 1-2.
- Score honestly based ONLY on what was actually said.
- If the speaker did not address the topic at all, relevance must be 1.
- Factor in filler words and vocabulary richness when scoring.

Score on 5 dimensions (1-10 each): confidence, clarity, structure, relevance, overall.
Give 2-3 strengths, 2-3 improvements, and a 2-sentence feedback summary.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"scores":{"confidence":7,"clarity":8,"structure":6,"relevance":9,"overall":7},"strengths":["strength1","strength2"],"improvements":["improvement1","improvement2"],"feedback":"Sentence one. Sentence two.","nlp":{"wordCount":${wordCount},"fillerCount":${fillerCount},"vocabularyRichness":${vocabularyRichness},"avgWordsPerSentence":${avgWordsPerSentence}}}`;

  console.log('[AI] Calling Groq API...');
  const data = await httpsPost(
    'api.groq.com', '/openai/v1/chat/completions',
    { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    {
      model: 'llama-3.3-70b-versatile',
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
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Groq response: ' + clean.slice(0, 200));
  return JSON.parse(match[0]);
}

async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

  if (!GROQ_KEY && !ASSEMBLYAI_KEY) {
    console.warn('[AI] No API keys set — skipping analysis');
    return;
  }

  const { ChallengeVideo } = require('../config/db');

  try {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'processing' });
    console.log(`[AI] Starting analysis for video ${videoId}`);

    let transcript = null;
    if (ASSEMBLYAI_KEY) {
      try {
        transcript = await transcribeVideo(videoUrl);
        console.log(`[AI] Transcript length: ${transcript?.length || 0} chars`);
      } catch (err) {
        console.error('[AI] Transcription failed:', err.message);
      }
    }

    const wordCount = transcript ? transcript.trim().split(/\s+/).filter(w => w.length > 1).length : 0;
    const isBlank = !transcript || wordCount < 5;

    if (isBlank) {
      console.log(`[AI] Blank/silent video (${wordCount} words) — scoring 1`);
      await ChallengeVideo.findByIdAndUpdate(videoId, {
        'aiAnalysis.status': 'done',
        'aiAnalysis.transcript': transcript || '',
        'aiAnalysis.scores': { confidence: 1, clarity: 1, structure: 1, relevance: 1, overall: 1 },
        'aiAnalysis.feedback': 'No speech detected. Please record a video where you speak clearly.',
        'aiAnalysis.strengths': [],
        'aiAnalysis.improvements': [
          'Record with clear speech',
          'Address the challenge topic directly',
          'Ensure your microphone is working',
        ],
        'aiAnalysis.analyzedAt': new Date(),
      });
      return;
    }

    const result = await scoreWithGroq(transcript, challengeTopic);

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
      'aiAnalysis.nlp': result.nlp || null,
      'aiAnalysis.analyzedAt': new Date(),
    });

    console.log(`[AI] Analysis complete for video ${videoId} — overall: ${result.scores?.overall}/10`);
  } catch (err) {
    console.error('[AI] Analysis failed:', err.message);
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' }).catch(() => {});
  }
}

module.exports = { analyzeVideo, transcribeVideo };
