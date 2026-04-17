/**
 * AI Analysis Service — Groq + AssemblyAI
 * 
 * Two-phase design to survive Render free tier:
 * 1. submitTranscriptionJob() — submits to AssemblyAI, saves job ID, returns immediately
 * 2. checkAndCompleteAnalysis() — called on each poll, checks AssemblyAI status, scores with Groq when done
 * 
 * This means NO long-running background jobs. The server just handles short requests.
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

/**
 * Phase 1: Submit video to AssemblyAI, save job ID, return immediately.
 * Called once when user first requests transcript.
 */
async function submitTranscriptionJob(videoId, videoUrl) {
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_KEY) {
    console.warn('[AI] ASSEMBLYAI_API_KEY not set');
    return null;
  }

  const { ChallengeVideo } = require('../config/db');

  console.log(`[AI] Submitting AssemblyAI job for video ${videoId}`);

  const submit = await httpsPost(
    'api.assemblyai.com', '/v2/transcript',
    { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    { audio_url: videoUrl, language_detection: true, speech_threshold: 0.1 }
  );

  if (!submit.id) {
    console.error('[AI] AssemblyAI submission failed:', JSON.stringify(submit).slice(0, 300));
    throw new Error('AssemblyAI submission failed: ' + JSON.stringify(submit));
  }

  console.log(`[AI] AssemblyAI job submitted: ${submit.id}`);

  // Save job ID so we can check it on subsequent polls
  await ChallengeVideo.findByIdAndUpdate(videoId, {
    'aiAnalysis.status': 'processing',
    'aiAnalysis.assemblyJobId': submit.id,
    'aiAnalysis.processingStartedAt': new Date(),
  });

  return submit.id;
}

/**
 * Phase 2: Check AssemblyAI job status. If done, score with Groq and save.
 * Called on each frontend poll — fast, no waiting.
 */
async function checkAndCompleteAnalysis(videoId, challengeTopic) {
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const { ChallengeVideo } = require('../config/db');

  const video = await ChallengeVideo.findById(videoId).lean();
  if (!video) return { status: 'error', error: 'Video not found' };

  const jobId = video.aiAnalysis?.assemblyJobId;
  if (!jobId) return { status: 'pending' };

  if (!ASSEMBLYAI_KEY) return { status: 'error', error: 'AssemblyAI key not set' };

  // Check job status — single fast HTTP call
  const poll = await httpsGet(
    'api.assemblyai.com',
    `/v2/transcript/${jobId}`,
    { authorization: ASSEMBLYAI_KEY }
  );

  console.log(`[AI] AssemblyAI job ${jobId}: status=${poll.status}`);

  if (poll.status === 'queued' || poll.status === 'processing') {
    return { status: 'processing' };
  }

  if (poll.status === 'error') {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' });
    return { status: 'failed', error: poll.error };
  }

  if (poll.status === 'completed') {
    const transcript = poll.text || '';
    const wordCount = transcript.trim().split(/\s+/).filter(w => w.length > 1).length;

    if (wordCount < 3) {
      // Silent/blank video
      await ChallengeVideo.findByIdAndUpdate(videoId, {
        'aiAnalysis.status': 'done',
        'aiAnalysis.transcript': transcript,
        'aiAnalysis.scores': { confidence: 1, clarity: 1, structure: 1, relevance: 1, overall: 1 },
        'aiAnalysis.feedback': 'No speech detected. Please record a video where you speak clearly.',
        'aiAnalysis.strengths': [],
        'aiAnalysis.improvements': ['Speak clearly into the microphone', 'Address the challenge topic'],
        'aiAnalysis.analyzedAt': new Date(),
      });
      return { status: 'done', transcript };
    }

    // Score with Groq — fast single call
    let result = null;
    if (GROQ_KEY) {
      try {
        result = await scoreWithGroq(transcript, challengeTopic);
      } catch (err) {
        console.error('[AI] Groq scoring failed:', err.message);
      }
    }

    await ChallengeVideo.findByIdAndUpdate(videoId, {
      'aiAnalysis.status': 'done',
      'aiAnalysis.transcript': transcript,
      'aiAnalysis.scores': result?.scores || null,
      'aiAnalysis.feedback': result?.feedback || null,
      'aiAnalysis.strengths': result?.strengths || [],
      'aiAnalysis.improvements': result?.improvements || [],
      'aiAnalysis.nlp': result?.nlp || null,
      'aiAnalysis.analyzedAt': new Date(),
    });

    console.log(`[AI] Analysis complete for ${videoId}`);
    return { status: 'done', transcript };
  }

  return { status: 'processing' };
}

async function scoreWithGroq(transcript, challengeTopic) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return null;

  const words = transcript.trim().split(/\s+/);
  const wordCount = words.length;
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right'];
  const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''))).size;
  const vocabularyRichness = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentences > 0 ? Math.round(wordCount / sentences) : 0;

  const prompt = `You are an expert communication coach evaluating a short speaking video for the challenge: "${challengeTopic}".

The speaker said: "${transcript}"

NLP: words=${wordCount}, fillers=${fillerCount}, vocab richness=${vocabularyRichness}%, avg words/sentence=${avgWordsPerSentence}

Score on 5 dimensions (1-10): confidence, clarity, structure, relevance, overall.
Give 2-3 strengths, 2-3 improvements, 2-sentence feedback.

Respond ONLY with this JSON (no markdown):
{"scores":{"confidence":7,"clarity":8,"structure":6,"relevance":9,"overall":7},"strengths":["s1","s2"],"improvements":["i1","i2"],"feedback":"Sentence one. Sentence two.","nlp":{"wordCount":${wordCount},"fillerCount":${fillerCount},"vocabularyRichness":${vocabularyRichness},"avgWordsPerSentence":${avgWordsPerSentence}}}`;

  const data = await httpsPost(
    'api.groq.com', '/openai/v1/chat/completions',
    { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 400 }
  );

  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq response empty');
  const match = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Groq response');
  return JSON.parse(match[0]);
}

/**
 * Legacy wrapper — used when video is submitted (triggers job submission only)
 */
async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!ASSEMBLYAI_KEY && !GROQ_KEY) return;

  try {
    // Just submit the job — don't wait for it
    await submitTranscriptionJob(videoId, videoUrl);
    // Store topic for later use when checking
    const { ChallengeVideo } = require('../config/db');
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.challengeTopic': challengeTopic });
  } catch (err) {
    console.error('[AI] Job submission failed:', err.message);
    const { ChallengeVideo } = require('../config/db');
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'failed' }).catch(() => {});
  }
}

module.exports = { analyzeVideo, submitTranscriptionJob, checkAndCompleteAnalysis };
