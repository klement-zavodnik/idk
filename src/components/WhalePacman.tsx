import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, ChevronRight, Skull } from 'lucide-react';

const GRID_SIZE = 15;
const CELL_SIZE = 30;

// 0: Path, 1: Wall, 2: Dot
const INITIAL_MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 2, 1, 2, 2, 2, 1, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1],
  [1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface Point {
  x: number;
  y: number;
}

interface Ghost {
  pos: Point;
  dir: Point;
  color: string;
}

export default function WhalePacman({ onComplete }: { onComplete: () => void }) {
  const [maze, setMaze] = useState(INITIAL_MAZE.map(row => [...row]));
  const [playerPos, setPlayerPos] = useState<Point>({ x: 7, y: 9 });
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 });
  const [nextDir, setNextDir] = useState<Point>({ x: 0, y: 0 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { pos: { x: 1, y: 1 }, dir: { x: 1, y: 0 }, color: 'bg-red-500' },
    { pos: { x: 13, y: 1 }, dir: { x: -1, y: 0 }, color: 'bg-pink-500' },
    { pos: { x: 1, y: 13 }, dir: { x: 1, y: 0 }, color: 'bg-cyan-500' },
  ]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [totalDots, setTotalDots] = useState(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let dots = 0;
    INITIAL_MAZE.forEach(row => row.forEach(cell => { if (cell === 2) dots++; }));
    setTotalDots(dots);
  }, []);

  const resetGame = () => {
    setMaze(INITIAL_MAZE.map(row => [...row]));
    setPlayerPos({ x: 7, y: 9 });
    setDirection({ x: 0, y: 0 });
    setNextDir({ x: 0, y: 0 });
    setGhosts([
      { pos: { x: 1, y: 1 }, dir: { x: 1, y: 0 }, color: 'bg-red-500' },
      { pos: { x: 13, y: 1 }, dir: { x: -1, y: 0 }, color: 'bg-pink-500' },
      { pos: { x: 1, y: 13 }, dir: { x: 1, y: 0 }, color: 'bg-cyan-500' },
    ]);
    setScore(0);
    setGameOver(false);
    setIsPaused(true);
  };

  const movePlayer = useCallback(() => {
    if (gameOver || isPaused) return;

    setPlayerPos(prev => {
      // Try to change to nextDir if possible
      let currentDir = direction;
      if (nextDir.x !== 0 || nextDir.y !== 0) {
        const nx = prev.x + nextDir.x;
        const ny = prev.y + nextDir.y;
        if (maze[ny]?.[nx] !== 1) {
          currentDir = nextDir;
          setDirection(nextDir);
          setNextDir({ x: 0, y: 0 });
        }
      }

      const nx = prev.x + currentDir.x;
      const ny = prev.y + currentDir.y;

      if (maze[ny]?.[nx] === 1) return prev; // Hit wall

      // Eat dot
      if (maze[ny]?.[nx] === 2) {
        const newMaze = [...maze];
        newMaze[ny][nx] = 0;
        setMaze(newMaze);
        setScore(s => s + 1);
      }

      return { x: nx, y: ny };
    });

    // Move Ghosts
    setGhosts(prevGhosts => prevGhosts.map(ghost => {
      let { x, y } = ghost.pos;
      let { x: dx, y: dy } = ghost.dir;

      // Simple AI: try to keep moving, if wall, pick random direction
      const nx = x + dx;
      const ny = y + dy;

      if (maze[ny]?.[nx] === 1 || Math.random() < 0.1) {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const validDirs = dirs.filter(d => maze[y + d.y]?.[x + d.x] !== 1);
        const newDir = validDirs[Math.floor(Math.random() * validDirs.length)] || ghost.dir;
        return { ...ghost, dir: newDir, pos: { x: x + newDir.x, y: y + newDir.y } };
      }

      return { ...ghost, pos: { x: nx, y: ny } };
    }));
  }, [direction, nextDir, maze, gameOver, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': setNextDir({ x: 0, y: -1 }); break;
        case 'ArrowDown': setNextDir({ x: 0, y: 1 }); break;
        case 'ArrowLeft': setNextDir({ x: -1, y: 0 }); break;
        case 'ArrowRight': setNextDir({ x: 1, y: 0 }); break;
        case ' ': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = setInterval(movePlayer, 200);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [isPaused, gameOver, movePlayer]);

  // Collision detection
  useEffect(() => {
    if (ghosts.some(g => g.pos.x === playerPos.x && g.pos.y === playerPos.y)) {
      setGameOver(true);
    }
  }, [ghosts, playerPos]);

  const isWin = score >= totalDots && totalDots > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-black p-4 font-sans relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border-4 border-white/20 max-w-fit relative z-10"
      >
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-white font-bold text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <span>{score} / {totalDots}</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">WHALE MAZE</h2>
          <div className="text-blue-200 font-bold">LVL 2</div>
        </div>

        <div 
          className="relative bg-black/40 rounded-xl overflow-hidden border-2 border-blue-500/30"
          style={{ 
            width: GRID_SIZE * CELL_SIZE, 
            height: GRID_SIZE * CELL_SIZE,
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
        >
          {maze.map((row, y) => row.map((cell, x) => (
            <div key={`${x}-${y}`} className="relative flex items-center justify-center">
              {cell === 1 && <div className="w-full h-full bg-blue-800/50 border border-blue-400/20 rounded-sm" />}
              {cell === 2 && <div className="w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_5px_rgba(254,240,138,0.8)]" />}
            </div>
          )))}

          {/* Player */}
          <motion.div 
            animate={{ 
              x: playerPos.x * CELL_SIZE, 
              y: playerPos.y * CELL_SIZE,
              scaleX: direction.x === 1 ? -1 : 1,
              rotate: direction.y === -1 ? 90 : direction.y === 1 ? -90 : 0
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute text-2xl z-20 flex items-center justify-center"
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
          >
            🐋
          </motion.div>

          {/* Ghosts */}
          {ghosts.map((ghost, i) => (
            <motion.div
              key={i}
              animate={{ x: ghost.pos.x * CELL_SIZE, y: ghost.pos.y * CELL_SIZE }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute text-2xl z-10 flex items-center justify-center"
              style={{ width: CELL_SIZE, height: CELL_SIZE }}
            >
              🦈
            </motion.div>
          ))}

          <AnimatePresence>
            {(isPaused || gameOver || isWin) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-[200px]">
                  {isWin ? (
                    <>
                      <h3 className="text-xl font-bold text-emerald-500 mb-4">Maze Cleared!</h3>
                      <button 
                        onClick={onComplete}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 mx-auto transition-all"
                      >
                        Level 3
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : gameOver ? (
                    <>
                      <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center justify-center gap-2">
                        <Skull className="w-5 h-5" /> Caught!
                      </h3>
                      <button 
                        onClick={resetGame}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-blue-900 mb-4 italic">Ready?</h3>
                      <button 
                        onClick={() => setIsPaused(false)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Swim!
                      </button>
                      <p className="mt-4 text-blue-400 text-xs">Avoid the sharks, eat the plankton!</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
