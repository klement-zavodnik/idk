/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WhaleSnake from './components/WhaleSnake';
import WhalePacman from './components/WhalePacman';
import ChickPlatformer from './components/ChickPlatformer';
import confetti from 'canvas-confetti';

type Level = 'welcome' | 1 | 2 | 3 | 'complete';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<Level>('welcome');

  const handleLevelComplete = () => {
    if (currentLevel === 'welcome') {
      setCurrentLevel(1);
    } else if (currentLevel === 1) {
      setCurrentLevel(2);
    } else if (currentLevel === 2) {
      setCurrentLevel(3);
    } else if (currentLevel === 3) {
      setCurrentLevel('complete');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0ea5e9', '#10b981', '#f59e0b']
      });
    }
  };

  return (
    <main className="min-h-screen bg-sky-50 overflow-hidden relative">
      {currentLevel !== 'complete' && currentLevel !== 'welcome' && (
        <button
          onClick={handleLevelComplete}
          className="fixed bottom-4 right-4 z-50 bg-white/10 hover:bg-white/30 text-white/40 hover:text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/10"
        >
          Skip Level
        </button>
      )}
      <AnimatePresence mode="wait">
        {currentLevel === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
          >
            <div className="max-w-2xl text-center">
              <motion.h1 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-black text-white mb-8 italic tracking-tighter drop-shadow-2xl"
              >
                Welcome to the <br/>
                <span className="text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]">MDŽ challenge</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl md:text-3xl text-white/90 font-medium mb-12 drop-shadow-lg"
              >
                Let's play some games!
              </motion.p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentLevel(1)}
                className="bg-white text-purple-600 px-12 py-5 rounded-full text-2xl font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all"
              >
                Start Challenge
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentLevel === 1 && (
          <motion.div
            key="level1"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <WhaleSnake onComplete={handleLevelComplete} />
          </motion.div>
        )}

        {currentLevel === 2 && (
          <motion.div
            key="level2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <WhalePacman onComplete={handleLevelComplete} />
          </motion.div>
        )}

        {currentLevel === 3 && (
          <motion.div
            key="level3"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <ChickPlatformer onComplete={handleLevelComplete} />
          </motion.div>
        )}

        {currentLevel === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-sky-400 to-blue-600"
          >
            <div className="text-center max-w-3xl">
              <motion.h1 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-6xl md:text-8xl font-black text-white mb-8 italic tracking-tighter drop-shadow-2xl"
              >
                YOU DID IT!
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/20 backdrop-blur-lg p-8 md:p-12 rounded-[3rem] border-2 border-white/30 shadow-2xl"
              >
                <p className="text-sky-100 font-bold uppercase tracking-widest text-sm mb-6 opacity-80">
                  Here is a message from the author of the challenge:
                </p>
                <p className="text-xl md:text-3xl text-white font-serif italic leading-relaxed">
                  "Ahoj lasinka, gratulujem k úspešnému prejdeniu levelov! Chcem ti zaželať všetko dobré ku dňu žien, a poďakovať ti za to, že môžem mať takú skvelú ženu v živote. Ďakujem za tvoju lásku a nehu, za to že ma ľúbiš. Veľmi ťa ľúbim a posielam ti pusinky 💋😘😚😽"
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                onClick={() => setCurrentLevel('welcome')}
                className="mt-12 text-white/60 hover:text-white font-bold uppercase tracking-widest text-sm transition-colors"
              >
                Play Again
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
