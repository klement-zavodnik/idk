import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const SPEED = 150;

interface Point {
  x: number;
  y: number;
}

export default function WhaleSnake({ onComplete }: { onComplete: () => void }) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [growthPending, setGrowthPending] = useState(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood!.x && segment.y === newFood!.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setGameOver(false);
    setScore(0);
    setGrowthPending(0);
    setIsPaused(true);
  };

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
      };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 1);
        setGrowthPending((prev) => prev + 2); // Grow by 3 total (1 from not popping + 2 pending)
        setFood(generateFood(newSnake));
      } else {
        if (growthPending > 0) {
          setGrowthPending((prev) => prev - 1);
        } else {
          newSnake.pop();
        }
      }

      return newSnake;
    });
  }, [direction, food, gameOver, isPaused, generateFood, growthPending]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          setIsPaused((p) => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, SPEED);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPaused, gameOver, moveSnake]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
    if (score >= 30) { // Win condition for Level 1
      setIsPaused(true);
    }
  }, [score, highScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-blue-700 p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -120],
              opacity: [0, 0.3, 0],
              x: Math.sin(i) * 20
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
            className="absolute bottom-0 text-white/20 text-2xl"
            style={{ left: `${Math.random() * 100}%` }}
          >
            🫧
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border-4 border-white/20 max-w-md w-full relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="text-white font-bold text-xl flex items-center gap-2 drop-shadow-sm">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <span>{score}</span>
          </div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter drop-shadow-lg">WHALE JOURNEY</h2>
          <div className="text-blue-100 font-bold drop-shadow-sm">Best: {highScore}</div>
        </div>

        <div 
          className="relative bg-blue-900/40 rounded-3xl overflow-hidden border-4 border-blue-300/30 shadow-inner"
          style={{ 
            width: '100%', 
            aspectRatio: '1/1',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            backgroundImage: 'radial-gradient(circle at center, #1e3a8a 0%, #172554 100%)'
          }}
        >
          {/* Light rays effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.1)_45%,rgba(255,255,255,0.1)_55%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_8s_infinite_linear]" />

          {/* Food (Chicks) */}
          <motion.div 
            animate={{ 
              y: [0, -4, 0],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute text-2xl flex items-center justify-center z-10"
            style={{
              left: `${(food.x / GRID_SIZE) * 100}%`,
              top: `${(food.y / GRID_SIZE) * 100}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
            }}
          >
            🐥
          </motion.div>

          {/* Snake (Whale & Waves) */}
          {snake.map((segment, i) => {
            const isHead = i === 0;
            // Rotation logic for 🐋 (which faces left by default)
            let rotate = 0;
            let scaleX = 1;

            if (isHead) {
              if (direction.x === 1) {
                scaleX = -1; // Face Right
                rotate = 0;
              } else if (direction.x === -1) {
                scaleX = 1; // Face Left
                rotate = 0;
              } else if (direction.y === -1) {
                scaleX = 1;
                rotate = 90; // Face Up (90 deg CW from Left)
              } else if (direction.y === 1) {
                scaleX = 1;
                rotate = -90; // Face Down (90 deg CCW from Left)
              }
            }

            return (
              <div
                key={i}
                className={`absolute flex items-center justify-center transition-all duration-150 ease-linear ${isHead ? 'z-20' : 'z-10'}`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                }}
              >
                {isHead ? (
                  <motion.div 
                    animate={{ 
                      scale: (1 + Math.min(score * 0.01, 0.1)), // Very subtle growth
                      rotate,
                      scaleX
                    }}
                    transition={{ duration: 0.1, ease: "linear" }}
                    className="text-3xl drop-shadow-xl"
                  >
                    🐋
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    className="text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  >
                    🌊
                  </motion.div>
                )}
              </div>
            );
          })}

          <AnimatePresence>
            {(isPaused || gameOver) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="bg-white p-6 rounded-2xl shadow-2xl text-center">
                  {gameOver ? (
                    <>
                      <h3 className="text-2xl font-bold text-red-500 mb-4 text-balance">Ouch! Try again?</h3>
                      <button 
                        onClick={resetGame}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Restart
                      </button>
                    </>
                  ) : score >= 30 ? (
                    <>
                      <h3 className="text-2xl font-bold text-sky-600 mb-4">Level 1 Clear!</h3>
                      <p className="text-sky-800 mb-6">The whale is full and happy!</p>
                      <button 
                        onClick={onComplete}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-all transform hover:scale-105"
                      >
                        Next Level
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-sky-900 mb-4">Ready?</h3>
                      <button 
                        onClick={() => setIsPaused(false)}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Start Game
                      </button>
                      <p className="mt-4 text-sky-400 text-sm">Use Arrows to move, Space to pause</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 text-center text-sky-400 text-sm font-medium">
          Eat 30 chicks to advance!
        </div>
      </motion.div>
    </div>
  );
}
