/**
 * AI Analysis Service
 * Uses AssemblyAI for transcription + OpenAI GPT-4o for scoring
 * Gracefully skips if API keys are not configured
 */

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

/**
 * Transcribe audio from a video URL using AssemblyAI
 */
async function transcribeVideo(videoUrl) {
  if (!ASSEMBLYAI_KEY) return null;

  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  // Submit transcription job
  const submitRes = await (await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: videoUrl, language_detection: true }),
  })).json();

  if (!submitRes.id) throw new Error('AssemblyAI submission failed');

  // Poll until done (max 2 minutes)
  const pollUrl = `https://api.assemblyai.com/v2/transcript/${submitRes.id}`;
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await (await fetch(pollUrl, { headers: { authorization: ASSEMBLYAI_KEY } })).json();
    if (poll.status === 'completed') return poll.text || '';
    if (poll.status === 'error') throw new Error(`Transcription error: ${poll.error}`);
  }
  throw new Error('Transcription timed out');
}

/**
 * Score a video transcript using OpenAI GPT-4o
 */
async function scoreWithGPT(transcript, challengeTopic) {
  if (!OPENAI_KEY) return null;

  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${OPENAI_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // cheaper, fast
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('GPT response empty');
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Main: analyze a submitted video asynchronously
 * Call this after saving the video — it updates the DB itself
 */
async function analyzeVideo(videoId, videoUrl, challengeTopic) {
  if (!OPENAI_KEY && !ASSEMBLYAI_KEY) return; // silently skip if no keys

  const { ChallengeVideo } = require('../config/db');

  try {
    await ChallengeVideo.findByIdAndUpdate(videoId, { 'aiAnalysis.status': 'processing' });

    let transcript = null;
    if (ASSEMBLYAI_KEY) {
      try {
        transcript = await transcribeVideo(videoUrl);
      } catch (err) {
        console.error('[AI] Transcription failed:', err.message);
      }
    }

    // If no transcript (no AssemblyAI key or failed), use a placeholder for GPT
    const textForGPT = transcript || `[No transcript available — video submitted for topic: "${challengeTopic}"]`;

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
