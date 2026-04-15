import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if dismissed recently
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed && Date.now() - +dismissed < 7 * 24 * 60 * 60 * 1000) return;

    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000); // Show after 3s
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-[300] md:left-auto md:right-4 md:w-80"
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="Collabro" className="h-8 w-8 rounded-lg object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Install Collabro</p>
              <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={handleInstall}
                className="h-9 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1">
                <Download size={14} /> Install
              </button>
              <button onClick={handleDismiss}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-accent hover:bg-accent/80">
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
