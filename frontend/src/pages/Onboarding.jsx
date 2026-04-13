import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, ArrowRight, Check } from 'lucide-react';
import api from '../services/api';

const INTENTS = [
  { id: 'interview', emoji: '🎯', label: 'Ace job interviews', desc: 'Practice answers, build confidence' },
  { id: 'confidence', emoji: '💬', label: 'Speak more confidently', desc: 'Overcome camera shyness' },
  { id: 'creator', emoji: '📱', label: 'Build a personal brand', desc: 'Create compelling content' },
  { id: 'communication', emoji: '🎤', label: 'Become a better communicator', desc: 'Professional & social settings' },
];

const COMFORT_LEVELS = [
  { id: 'beginner', emoji: '😰', label: "Nervous — I've barely done this", challenge: 'starter' },
  { id: 'intermediate', emoji: '😐', label: "Okay — I've tried a few times", challenge: 'builder' },
  { id: 'confident', emoji: '😊', label: 'Comfortable — I do this regularly', challenge: 'pro' },
];

const CHALLENGE_PACKS = [
  { id: 'starter', emoji: '🟢', label: 'Starter Pack', videos: 3, days: 7, desc: '3 videos in 7 days', recommended: ['beginner'] },
  { id: 'builder', emoji: '🟡', label: 'Builder Pack', videos: 5, days: 10, desc: '5 videos in 10 days', recommended: ['intermediate'] },
  { id: 'pro', emoji: '🔴', label: 'Pro Pack', videos: 7, days: 14, desc: '7 videos in 14 days', recommended: ['confident'] },
];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState('');
  const [comfortLevel, setComfortLevel] = useState('');
  const [challengeType, setChallengeType] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedChallenge = COMFORT_LEVELS.find(c => c.id === comfortLevel)?.challenge || 'starter';

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.post('/user-challenges/onboarding', {
        intent,
        comfortLevel,
        challengeType: challengeType || suggestedChallenge,
      });
      updateUser({ userIntent: intent, comfortLevel, onboardingDone: true });
      navigate('/daily-challenge');
    } catch (err) {
      console.error(err);
      navigate('/daily-challenge');
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Mic2 size={22} className="text-primary" />
          </div>
          <span className="text-2xl font-black">Collabro</span>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-primary' : s < step ? 'w-2 bg-primary/50' : 'w-2 bg-border'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1 — Intent */}
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">What brings you here?</h1>
                <p className="text-muted-foreground text-sm">We'll personalize your experience</p>
              </div>
              <div className="space-y-3">
                {INTENTS.map(item => (
                  <button key={item.id} onClick={() => setIntent(item.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${intent === item.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-bold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {intent === item.id && <Check size={18} className="text-primary ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} disabled={!intent}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                Continue <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* Step 2 — Comfort level */}
          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">How comfortable are you on camera?</h1>
                <p className="text-muted-foreground text-sm">No judgment — just helps us set the right pace</p>
              </div>
              <div className="space-y-3">
                {COMFORT_LEVELS.map(item => (
                  <button key={item.id} onClick={() => setComfortLevel(item.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${comfortLevel === item.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="font-bold text-sm flex-1">{item.label}</p>
                    {comfortLevel === item.id && <Check size={18} className="text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-3.5 bg-accent rounded-2xl font-bold hover:bg-accent/80 transition-all">Back</button>
                <button onClick={() => setStep(3)} disabled={!comfortLevel}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Challenge selection */}
          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
              className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-black mb-2">Pick your first challenge</h1>
                <p className="text-muted-foreground text-sm">No daily pressure — complete X videos whenever you're ready</p>
              </div>
              <div className="space-y-3">
                {CHALLENGE_PACKS.map(pack => {
                  const isRecommended = pack.recommended.includes(comfortLevel);
                  const selected = (challengeType || suggestedChallenge) === pack.id;
                  return (
                    <button key={pack.id} onClick={() => setChallengeType(pack.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left relative ${selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                      <span className="text-2xl">{pack.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{pack.label}</p>
                          {isRecommended && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">Recommended</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{pack.desc}</p>
                      </div>
                      {selected && <Check size={18} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">You can always switch later. Start small, build momentum.</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3.5 bg-accent rounded-2xl font-bold hover:bg-accent/80 transition-all">Back</button>
                <button onClick={handleFinish} disabled={loading}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                  {loading ? 'Starting...' : "Let's go! 🚀"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
