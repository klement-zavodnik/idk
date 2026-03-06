import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, ChevronRight, Heart } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PLAYER_SPEED = 4;

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'platform' | 'enemy' | 'goal' | 'player' | 'egg';
  emoji?: string;
  vx?: number;
  vy?: number;
  isSpecial?: boolean;
  isUsed?: boolean;
}

const INITIAL_ENEMIES: Entity[] = [
  { x: 300, y: 348, width: 32, height: 32, type: 'enemy', emoji: '🐍', vx: 1.2, vy: 0 },
  { x: 550, y: 268, width: 32, height: 32, type: 'enemy', emoji: '🕷️', vx: -1.5, vy: 0 },
  { x: 950, y: 188, width: 32, height: 32, type: 'enemy', emoji: '🐍', vx: 1.2, vy: 0 },
  { x: 1350, y: 168, width: 32, height: 32, type: 'enemy', emoji: '🕷️', vx: -1.2, vy: 0 },
  { x: 1800, y: 218, width: 32, height: 32, type: 'enemy', emoji: '🐍', vx: 0.8, vy: 0 },
  { x: 2100, y: 188, width: 32, height: 32, type: 'enemy', emoji: '🕷️', vx: -1, vy: 0 },
  { x: 2400, y: 268, width: 32, height: 32, type: 'enemy', emoji: '🐍', vx: 1.5, vy: 0 },
  { x: 2650, y: 188, width: 32, height: 32, type: 'enemy', emoji: '🕷️', vx: -1.2, vy: 0 },
];

const INITIAL_PLATFORMS: Entity[] = [
  { x: 0, y: 380, width: 400, height: 20, type: 'platform' }, // Starting ground
  { x: 480, y: 300, width: 200, height: 40, type: 'platform' },
  { x: 560, y: 180, width: 40, height: 40, type: 'platform', isSpecial: true }, // Mystery 1
  { x: 760, y: 220, width: 200, height: 40, type: 'platform' },
  { x: 1040, y: 300, width: 200, height: 40, type: 'platform' },
  { x: 1120, y: 180, width: 40, height: 40, type: 'platform', isSpecial: true }, // Mystery 2
  { x: 1320, y: 200, width: 200, height: 40, type: 'platform' }, // Lowered from 180 to 200, closer
  { x: 1600, y: 250, width: 200, height: 40, type: 'platform' },
  { x: 1680, y: 130, width: 40, height: 40, type: 'platform', isSpecial: true }, // Mystery 3
  { x: 1880, y: 160, width: 200, height: 40, type: 'platform' },
  { x: 2160, y: 300, width: 300, height: 40, type: 'platform' },
  { x: 2290, y: 180, width: 40, height: 40, type: 'platform', isSpecial: true }, // Mystery 4
  { x: 2540, y: 220, width: 200, height: 40, type: 'platform' },
  { x: 2820, y: 140, width: 400, height: 260, type: 'platform' }, // Tower base
];

export default function ChickPlatformer({ onComplete }: { onComplete: () => void }) {
  const [isPaused, setIsPaused] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  const playerRef = useRef<Entity>({
    x: 50,
    y: 300,
    width: 32,
    height: 32,
    type: 'player',
    vx: 0,
    vy: 0,
    emoji: '🐥'
  });

  const [enemies, setEnemies] = useState<Entity[]>(INITIAL_ENEMIES.map(e => ({ ...e }))); // Keep for state-based rendering if needed, but we use ref for logic
  const enemiesRef = useRef<Entity[]>(INITIAL_ENEMIES.map(e => ({ ...e })));
  const platformsRef = useRef<Entity[]>(INITIAL_PLATFORMS.map(p => ({ ...p })));
  const eggsRef = useRef<Entity[]>([]);
  const chickensRef = useRef<Entity[]>([]);
  const goal = useRef<Entity>({ x: 2970, y: 100, width: 64, height: 64, type: 'goal', emoji: '🐋' });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const cameraXRef = useRef(0);

  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, color: string}[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const camX = cameraXRef.current;

    // Draw background (Sky)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, '#bae6fd');
    skyGradient.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Lava (Floor is lava!)
    const lavaGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 40, 0, CANVAS_HEIGHT);
    lavaGradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
    lavaGradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.8)');
    lavaGradient.addColorStop(1, 'rgba(185, 28, 28, 1)');
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60);
    
    // Lava bubbles
    ctx.fillStyle = '#f87171';
    for (let i = 0; i < 5; i++) {
      const lx = (Date.now() * 0.05 + i * 200) % CANVAS_WIDTH;
      const ly = CANVAS_HEIGHT - 20 + Math.sin(Date.now() * 0.005 + i) * 10;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw clouds (Simple textures)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 10; i++) {
      const x = (i * 300 - camX * 0.2) % 2500;
      ctx.beginPath();
      ctx.arc(x, 50 + (i % 3) * 20, 30, 0, Math.PI * 2);
      ctx.arc(x + 20, 50 + (i % 3) * 20, 25, 0, Math.PI * 2);
      ctx.arc(x - 20, 50 + (i % 3) * 20, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw platforms with "textures"
    platformsRef.current.forEach(p => {
      const bx = p.x - camX;
      const by = p.y;
      
      if (p.isSpecial) {
        // Special block (Question mark block style)
        ctx.fillStyle = p.isUsed ? '#94a3b8' : '#f59e0b';
        ctx.fillRect(bx, by, p.width, p.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, p.width, p.height);
        
        if (!p.isUsed) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('?', bx + p.width / 2, by + p.height / 2);
        }
      } else if (p.width > 1000) {
        // Ground
        ctx.fillStyle = '#166534';
        ctx.fillRect(bx, by, p.width, p.height);
        ctx.fillStyle = '#3f2b1d';
        ctx.fillRect(bx, by + 6, p.width, p.height - 6);
      } else {
        // Regular block platforms
        const blockSize = 40;
        for (let x = 0; x < p.width; x += blockSize) {
          for (let y = 0; y < p.height; y += blockSize) {
            const curX = bx + x;
            const curY = by + y;
            
            // Block body
            ctx.fillStyle = '#b45309'; // Brick color
            ctx.fillRect(curX, curY, blockSize, blockSize);
            
            // Block border/texture
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(curX, curY, blockSize, blockSize);
            
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(curX + 2, curY + 2, blockSize - 4, 4);
          }
        }
        
        // Grass top for platforms
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bx, by, p.width, 6);
      }
    });

    // Draw eggs
    ctx.font = '20px serif';
    eggsRef.current.forEach(egg => {
      const wobble = Math.sin(Date.now() * 0.02) * 2;
      ctx.fillText(egg.emoji || '', egg.x - camX + egg.width / 2, egg.y + egg.height / 2 + wobble);
    });

    // Draw chickens
    ctx.font = '16px serif';
    chickensRef.current.forEach(chick => {
      const jump = Math.abs(Math.sin(Date.now() * 0.01 + chick.x)) * 5;
      ctx.fillText(chick.emoji || '', chick.x - camX + chick.width / 2, chick.y + chick.height / 2 - jump);
    });

    // Draw enemies
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    enemiesRef.current.forEach(e => {
      ctx.fillText(e.emoji || '', e.x - camX + e.width / 2, e.y + e.height / 2);
    });

    // Draw goal (Tower + Whale Room)
    const g = goal.current;
    
    // Tower body (Textured stone)
    const towerGradient = ctx.createLinearGradient(g.x - camX - 40, g.y - 100, g.x - camX + g.width + 40, g.y - 100);
    towerGradient.addColorStop(0, '#475569');
    towerGradient.addColorStop(0.5, '#64748b');
    towerGradient.addColorStop(1, '#475569');
    ctx.fillStyle = towerGradient;
    ctx.fillRect(g.x - camX - 40, g.y - 100, g.width + 80, 400); 

    // Tower brick lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let ty = g.y - 100; ty < g.y + 300; ty += 20) {
      ctx.beginPath();
      ctx.moveTo(g.x - camX - 40, ty);
      ctx.lineTo(g.x - camX + g.width + 40, ty);
      ctx.stroke();
    }

    // Whale Room (Archway)
    ctx.fillStyle = '#1e293b'; // Dark interior
    ctx.beginPath();
    ctx.roundRect(g.x - camX - 10, g.y - 20, g.width + 20, g.height + 40, [30, 30, 0, 0]);
    ctx.fill();
    
    // Room glow
    const roomGlow = ctx.createRadialGradient(g.x - camX + g.width / 2, g.y + g.height / 2, 0, g.x - camX + g.width / 2, g.y + g.height / 2, 50);
    roomGlow.addColorStop(0, 'rgba(125, 211, 252, 0.3)');
    roomGlow.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = roomGlow;
    ctx.fillRect(g.x - camX - 20, g.y - 30, g.width + 40, g.height + 60);

    // Tower windows (Glowing)
    ctx.fillStyle = '#fef08a';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fef08a';
    ctx.fillRect(g.x - camX - 10, g.y + 100, 20, 30);
    ctx.fillRect(g.x - camX + 50, g.y + 100, 20, 30);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Whale animation
    const whaleFloat = Math.sin(Date.now() * 0.003) * 5;
    const whaleDance = win ? Math.sin(Date.now() * 0.01) * 20 : 0;
    const whaleScale = win ? 1.5 + Math.sin(Date.now() * 0.01) * 0.2 : 1;
    
    ctx.save();
    ctx.translate(g.x - camX + g.width / 2, g.y + g.height / 2 + whaleFloat + whaleDance);
    ctx.scale(whaleScale, whaleScale);
    ctx.font = '48px serif';
    ctx.fillText(g.emoji || '', 0, 0);
    ctx.restore();

    // Draw player
    ctx.font = '32px serif';
    const player = playerRef.current;
    const playerBob = Math.sin(Date.now() * 0.01) * 2;
    const playerStretch = player.vy !== 0 ? 0.8 : 1;
    
    ctx.save();
    ctx.translate(player.x - camX + player.width / 2, player.y + player.height / 2 + playerBob);
    if (player.vx < 0) ctx.scale(-playerStretch, 1 / playerStretch);
    else ctx.scale(playerStretch, 1 / playerStretch);
    ctx.fillText(player.emoji || '', 0, 0);
    ctx.restore();

    // Draw winning particles
    if (win) {
      if (particlesRef.current.length < 100) {
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          });
        }
      }
      
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 6, 6);
        if (p.y > CANVAS_HEIGHT || p.x < 0 || p.x > CANVAS_WIDTH) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Victory Text
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      const textScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.scale(textScale, textScale);
      ctx.strokeText('VICTORY!', 0, 0);
      ctx.fillText('VICTORY!', 0, 0);
      ctx.restore();
    }
  }, [win]);

  const update = useCallback(() => {
    if (isPaused) return;

    if (!gameOver && !win) {
      const player = playerRef.current;
      
      // Horizontal movement
      if (keysRef.current['ArrowLeft']) player.vx = -PLAYER_SPEED;
      else if (keysRef.current['ArrowRight']) player.vx = PLAYER_SPEED;
      else player.vx = 0;

      player.x += player.vx;
      player.vy += GRAVITY;
      player.y += player.vy;

      // Collision with platforms
      let onGround = false;
      platformsRef.current.forEach(p => {
        if (
          player.x < p.x + p.width &&
          player.x + player.width > p.x &&
          player.y < p.y + p.height &&
          player.y + player.height > p.y
        ) {
          // Simple collision resolution
          const prevY = player.y - player.vy;
          const prevX = player.x - player.vx;

          if (player.vy >= 0 && prevY + player.height <= p.y + 1) { 
            // Top collision
            player.y = p.y - player.height;
            player.vy = 0;
            onGround = true;
          } else if (player.vy < 0 && prevY >= p.y + p.height - 1) {
            // Bottom collision (Mystery box bump)
            player.y = p.y + p.height;
            player.vy = 0;
            
            if (p.isSpecial && !p.isUsed) {
              p.isUsed = true;
              setScore(s => s + 50);
              eggsRef.current.push({
                x: p.x + p.width / 2 - 10,
                y: p.y - 20,
                width: 20,
                height: 20,
                type: 'egg',
                emoji: '🥚',
                vy: -10,
                vx: 2 // Give it some horizontal push so it falls off the box
              });
            }
          } else if (player.vx > 0 && prevX + player.width <= p.x + 1) {
            player.x = p.x - player.width;
          } else if (player.vx < 0 && prevX >= p.x + p.width - 1) {
            player.x = p.x + p.width;
          }
        }
      });

      if (onGround && keysRef.current['ArrowUp']) {
        player.vy = JUMP_FORCE;
      }

      // Update eggs
      for (let i = eggsRef.current.length - 1; i >= 0; i--) {
        const egg = eggsRef.current[i];
        egg.vy! += GRAVITY;
        egg.y += egg.vy!;
        egg.x += (egg.vx || 0);
        
        // Check if egg hits ground/platform
        let eggHit = false;
        platformsRef.current.forEach(p => {
          if (
            egg.x < p.x + p.width &&
            egg.x + egg.width > p.x &&
            egg.y + egg.height > p.y &&
            egg.y + egg.height < p.y + p.height + 10 &&
            egg.vy! > 0 &&
            !p.isSpecial // Don't hatch on the mystery box itself
          ) {
            eggHit = true;
            // Spawn chicken
            chickensRef.current.push({
              x: egg.x - 10,
              y: p.y - 16,
              width: 16,
              height: 16,
              type: 'player', // Using player type for drawing convenience
              emoji: '🐤'
            });
          }
        });

        if (eggHit || egg.y > CANVAS_HEIGHT) {
          eggsRef.current.splice(i, 1);
        }
      }

      // Move and check enemies
      const currentEnemies = enemiesRef.current;
      for (let i = currentEnemies.length - 1; i >= 0; i--) {
        const e = currentEnemies[i];
        
        // Apply gravity to enemies
        e.vy = (e.vy || 0) + GRAVITY;
        e.y += e.vy;
        e.x += (e.vx || 0);
        
        // Enemy platform collision
        let enemyOnGround = false;
        platformsRef.current.forEach(p => {
          if (
            e.x < p.x + p.width &&
            e.x + e.width > p.x &&
            e.y < p.y + p.height &&
            e.y + e.height > p.y
          ) {
            if (e.vy! > 0 && e.y + e.height - e.vy! <= p.y + 5) {
              e.y = p.y - e.height;
              e.vy = 0;
              enemyOnGround = true;
            }
          }
        });

        // Patrol logic: reverse if hitting wall or about to fall off platform
        if (enemyOnGround) {
          const nextX = e.x + (e.vx || 0);
          const checkY = e.y + e.height + 5;
          const checkX = e.vx! > 0 ? e.x + e.width : e.x;
          
          let willBeOnPlatform = false;
          platformsRef.current.forEach(p => {
            if (checkX >= p.x && checkX <= p.x + p.width && checkY >= p.y && checkY <= p.y + p.height) {
              willBeOnPlatform = true;
            }
          });

          if (!willBeOnPlatform || nextX < 0 || nextX > 3500) {
            e.vx = -(e.vx || 0);
          }
        }

        // Collision with player (with small hit-box reduction for fairness)
        const buffer = 4;
        if (
          player.x + buffer < e.x + e.width - buffer &&
          player.x + player.width - buffer > e.x + buffer &&
          player.y + buffer < e.y + e.height - buffer &&
          player.y + player.height - buffer > e.y + buffer
        ) {
          // Stomp mechanic: if falling and above enemy center
          if (player.vy > 0 && player.y + player.height < e.y + e.height / 2 + 10) {
            player.vy = JUMP_FORCE / 1.5; // Bounce
            currentEnemies.splice(i, 1); // Remove enemy
            setScore(s => s + 100);
          } else {
            setGameOver(true);
          }
        }
      }

      // Camera follow
      cameraXRef.current = Math.max(0, player.x - CANVAS_WIDTH / 2);

      // Goal check
      const g = goal.current;
      if (
        player.x < g.x + g.width &&
        player.x + player.width > g.x &&
        player.y < g.y + g.height &&
        player.y + player.height > g.y
      ) {
        setWin(true);
      }

      // Fall off
      if (player.y > CANVAS_HEIGHT) {
        setGameOver(true);
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [isPaused, gameOver, win, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  useEffect(() => {
    if (win) {
      const timer = setTimeout(() => setShowWinModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [win]);

  const resetGame = () => {
    playerRef.current = { x: 50, y: 300, width: 32, height: 32, type: 'player', vx: 0, vy: 0, emoji: '🐥' };
    enemiesRef.current = INITIAL_ENEMIES.map(e => ({ ...e }));
    platformsRef.current = INITIAL_PLATFORMS.map(p => ({ ...p }));
    eggsRef.current = [];
    chickensRef.current = [];
    cameraXRef.current = 0;
    setGameOver(false);
    setWin(false);
    setShowWinModal(false);
    setIsPaused(true);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-300 to-blue-500 p-4 font-sans relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border-4 border-white/20 max-w-fit relative z-10"
      >
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-white font-bold text-xl flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400 fill-current" />
            <span>Rescue Mission</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">CHICK HERO</h2>
          <div className="text-sky-100 font-bold">LVL 3</div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl bg-sky-200">
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className="block cursor-none"
          />

          <AnimatePresence>
            {(isPaused || gameOver || showWinModal) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-sky-900/60 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-[300px]">
                  {showWinModal ? (
                    <>
                      <h3 className="text-2xl font-bold text-emerald-500 mb-2">Whale Saved!</h3>
                      <p className="text-sky-600 mb-6 text-sm">You are a true hero, little chick!</p>
                      <button 
                        onClick={onComplete}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-all"
                      >
                        Finish Journey
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  ) : gameOver ? (
                    <>
                      <h3 className="text-2xl font-bold text-red-500 mb-4">Try Again!</h3>
                      <button 
                        onClick={resetGame}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Restart
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-sky-900 mb-4 italic uppercase tracking-tighter">Save the Whale!</h3>
                      <button 
                        onClick={() => setIsPaused(false)}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors text-lg shadow-lg"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        Rescue!
                      </button>
                      <p className="mt-6 text-sky-400 text-xs leading-relaxed">
                        Use Arrows to move and jump.<br/>
                        Avoid snakes and spiders!<br/>
                        Reach the tower to save the whale.
                      </p>
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
