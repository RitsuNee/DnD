"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dices, Settings2, Plus, Minus, Trash2, Play, RotateCcw, Sparkles, 
  Save, User, SplitSquareHorizontal, Image as ImageIcon, Type
} from "lucide-react";
import { clsx } from "clsx";
import { generateId, type SlotItem, type SlotColumn } from "@/lib/types";
import { playDiceRoll, playReveal, playTick, playSlotStop } from "@/lib/sounds";

/* ═══════════════════════════════════════════════
   COIN FLIPPER (SLOT COIN)
   ═══════════════════════════════════════════════ */
function SlotCoinWidget({ animDuration }: { animDuration: number }) {
  const [minRange, setMinRange] = useState("1");
  const [maxRange, setMaxRange] = useState("2");
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const flipCoin = useCallback(() => {
    if (isFlipping) return;
    const min = parseInt(minRange) || 1;
    const max = parseInt(maxRange) || 2;
    if (min > max) return;

    setIsFlipping(true);
    playTick();
    
    // Simulate coin spinning
    let ticks = 0;
    const interval = setInterval(() => {
      setResult(Math.floor(Math.random() * (max - min + 1)) + min);
      ticks++;
      if (ticks % 2 === 0) playTick();
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setResult(Math.floor(Math.random() * (max - min + 1)) + min);
      setIsFlipping(false);
      playReveal();
    }, animDuration);

  }, [isFlipping, minRange, maxRange, animDuration]);

  return (
    <div className="rounded-xl arcane-glass border border-outline-variant/20 flex flex-col p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40">
          <span className="text-xl">🪙</span>
        </div>
        <div>
          <h3 className="font-serif font-bold text-on-surface text-lg">Slot Coin</h3>
          <p className="text-xs text-on-surface-variant">Flip a coin with a custom number range</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Config */}
        <div className="flex flex-col gap-4 bg-surface-container/30 p-5 rounded-xl border border-outline-variant/10 w-full md:w-auto shrink-0">
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Coin Range</div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant">Min</label>
              <input type="number" value={minRange} onChange={e => setMinRange(e.target.value)} className="w-20 bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-center font-mono focus:border-primary focus:outline-none" />
            </div>
            <span className="text-on-surface-variant mt-4 font-bold">-</span>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant">Max</label>
              <input type="number" value={maxRange} onChange={e => setMaxRange(e.target.value)} className="w-20 bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-center font-mono focus:border-primary focus:outline-none" />
            </div>
          </div>
          <button 
            onClick={flipCoin} 
            disabled={isFlipping || parseInt(minRange) > parseInt(maxRange)}
            className="mt-2 w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isFlipping ? "Flipping..." : "Toss Coin"}
          </button>
        </div>

        {/* Result Area */}
        <div className="flex-1 flex items-center justify-center min-h-[160px] w-full">
          {result === null && !isFlipping ? (
            <div className="text-on-surface-variant/40 italic text-sm">Waiting to toss...</div>
          ) : (
            <motion.div
              animate={{ 
                rotateY: isFlipping ? [0, 180, 360, 540, 720, 900, 1080] : 0,
                scale: isFlipping ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: isFlipping ? animDuration/1000 : 0.3, ease: "easeInOut" }}
              className={clsx(
                "w-32 h-32 rounded-full flex items-center justify-center font-bold text-4xl shadow-2xl relative border-4",
                isFlipping ? "bg-primary/20 border-primary/50 text-primary blur-[1px]" : "bg-primary/10 border-primary text-primary arcane-text-glow"
              )}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-full animate-[shimmer_2s_infinite]" />
              {result}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DICE ROLLER
   ═══════════════════════════════════════════════ */

interface DiceGroup {
  id: string;
  count: number;
  type: "standard" | "custom";
  sides?: number; 
  min?: number;   
  max?: number;   
}

interface RollResult {
  groupId: string;
  value: number;
  label: string; 
  isMax: boolean;
  isMin: boolean;
}

interface SavedDicePreset {
  id: string;
  label: string;
  owner: string;
  groups: DiceGroup[];
}

const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];

function DiceRoller({ animDuration }: { animDuration: number }) {
  const [pool, setPool] = useState<DiceGroup[]>([]);
  const [presets, setPresets] = useState<SavedDicePreset[]>([]);
  
  const [addCount, setAddCount] = useState<string>("1");
  const [addType, setAddType] = useState<"standard" | "custom">("standard");
  const [addSides, setAddSides] = useState<number>(20);
  const [addMin, setAddMin] = useState<string>("6");
  const [addMax, setAddMax] = useState<string>("9");

  const [presetName, setPresetName] = useState("");
  const [presetOwner, setPresetOwner] = useState("");

  const [results, setResults] = useState<RollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToPool = () => {
    const count = parseInt(addCount) || 1;
    if (count <= 0) return;

    if (addType === "standard") {
      setPool([...pool, { id: generateId(), count, type: "standard", sides: addSides }]);
    } else {
      const min = parseInt(addMin) || 1;
      const max = parseInt(addMax) || 1;
      if (min > max) return;
      setPool([...pool, { id: generateId(), count, type: "custom", min, max }]);
    }
  };

  const removeGroup = (id: string) => setPool(pool.filter(g => g.id !== id));

  const savePreset = () => {
    if (!presetName || pool.length === 0) return;
    setPresets([...presets, { id: generateId(), label: presetName, owner: presetOwner || "General", groups: [...pool] }]);
    setPresetName("");
    setPresetOwner("");
  };

  const loadPreset = (p: SavedDicePreset) => {
    if (isRolling) return;
    setPool([...p.groups]);
    setResults([]);
  };

  const deletePreset = (id: string) => setPresets(presets.filter(p => p.id !== id));

  const roll = useCallback(() => {
    if (isRolling || pool.length === 0) return;
    setIsRolling(true);
    playDiceRoll(animDuration);

    const generateOutcome = (): RollResult[] => {
      const outcome: RollResult[] = [];
      pool.forEach(g => {
        for (let i = 0; i < g.count; i++) {
          let val = 0;
          let label = "";
          let isMax = false;
          let isMin = false;

          if (g.type === "standard" && g.sides) {
            val = Math.ceil(Math.random() * g.sides);
            label = `d${g.sides}`;
            isMax = val === g.sides;
            isMin = val === 1;
          } else if (g.type === "custom" && g.min !== undefined && g.max !== undefined) {
            val = Math.floor(Math.random() * (g.max - g.min + 1)) + g.min;
            label = `d(${g.min}-${g.max})`;
            isMax = val === g.max;
            isMin = val === g.min;
          }
          
          outcome.push({ groupId: g.id, value: val, label, isMax, isMin });
        }
      });
      return outcome;
    };

    intervalRef.current = setInterval(() => setResults(generateOutcome()), 60);

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setResults(generateOutcome());
      setIsRolling(false);
      playReveal();
    }, animDuration);
  }, [pool, animDuration, isRolling]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const total = results.reduce((a, b) => a + b.value, 0);

  const presetsByOwner = presets.reduce((acc, p) => {
    if (!acc[p.owner]) acc[p.owner] = [];
    acc[p.owner].push(p);
    return acc;
  }, {} as Record<string, SavedDicePreset[]>);

  return (
    <div className="rounded-xl arcane-glass border border-outline-variant/20 flex flex-col min-h-[500px]">
      <div className="p-4 border-b border-outline-variant/20 shrink-0 flex items-center bg-surface-container/30">
        <Dices className="w-5 h-5 text-secondary mr-2" />
        <h3 className="font-serif font-bold text-on-surface text-lg">Multi-Dice Roller</h3>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left: Presets Sidebar */}
        <div className="w-full lg:w-48 xl:w-56 border-b lg:border-b-0 lg:border-r border-outline-variant/20 bg-surface-container-lowest/50 p-4 shrink-0 flex flex-col gap-4 max-h-[300px] lg:max-h-full overflow-y-auto">
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Presets
          </div>
          
          {Object.keys(presetsByOwner).length === 0 ? (
            <div className="text-xs text-on-surface-variant/50 text-center py-4 italic">No presets saved</div>
          ) : (
            Object.entries(presetsByOwner).map(([owner, ownerPresets]) => (
              <div key={owner} className="space-y-1.5">
                <div className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider mt-2">
                  <User className="w-3 h-3" /> {owner}
                </div>
                {ownerPresets.map(p => (
                  <div key={p.id} className="group flex items-center justify-between bg-surface-container/40 hover:bg-surface-container border border-outline-variant/10 rounded-md p-1.5 transition-colors">
                    <button onClick={() => loadPreset(p)} className="flex-1 text-left text-xs font-medium text-on-surface truncate">
                      {p.label}
                    </button>
                    <button onClick={() => deletePreset(p.id)} className="opacity-0 group-hover:opacity-100 text-error/50 hover:text-error shrink-0 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Right: Roller Main Area */}
        <div className="flex-1 flex flex-col p-5 overflow-y-auto relative min-h-[400px]">
          {/* Builder */}
          <div className="bg-surface-container/30 border border-outline-variant/10 rounded-lg p-3 mb-5 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-surface-container-highest rounded-md p-0.5 shrink-0">
                <button onClick={() => setAddType("standard")} className={clsx("px-3 py-1.5 text-xs font-bold rounded-sm transition-colors", addType === "standard" ? "bg-secondary text-on-secondary" : "text-on-surface-variant")}>Standard</button>
                <button onClick={() => setAddType("custom")} className={clsx("px-3 py-1.5 text-xs font-bold rounded-sm transition-colors", addType === "custom" ? "bg-secondary text-on-secondary" : "text-on-surface-variant")}>Custom Range</button>
              </div>

              <div className="flex items-center gap-2">
                <input type="number" value={addCount} onChange={e => setAddCount(e.target.value)} min="1" className="w-16 px-2 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none" title="Count" />
                <span className="text-on-surface-variant text-sm font-mono font-bold">x</span>
                
                {addType === "standard" ? (
                  <select value={addSides} onChange={e => setAddSides(parseInt(e.target.value))} className="px-3 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none">
                    {STANDARD_DICE.map(d => <option key={d} value={d}>d{d}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-on-surface-variant font-mono text-lg">d(</span>
                    <input type="number" value={addMin} onChange={e => setAddMin(e.target.value)} className="w-14 px-2 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none" title="Min" />
                    <span className="text-on-surface-variant mx-1">-</span>
                    <input type="number" value={addMax} onChange={e => setAddMax(e.target.value)} className="w-14 px-2 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none" title="Max" />
                    <span className="text-on-surface-variant font-mono text-lg">)</span>
                  </div>
                )}
                
                <button onClick={addToPool} className="ml-2 p-2 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-md transition-colors flex items-center gap-1 text-sm font-bold">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Current Pool */}
          <div className="mb-5 shrink-0 border-b border-outline-variant/10 pb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-on-surface-variant uppercase tracking-wider font-bold">Current Pool</span>
              {pool.length > 0 && (
                <button onClick={() => setPool([])} className="text-[10px] text-error hover:underline uppercase font-bold">Clear All</button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
              {pool.length === 0 && <span className="text-sm text-on-surface-variant/40 italic">Pool is empty. Add dice above or load a preset.</span>}
              <AnimatePresence>
                {pool.map((g) => (
                  <motion.div key={g.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-sm font-mono font-bold text-secondary">
                      {g.count}d{g.type === "standard" ? g.sides : `(${g.min}-${g.max})`}
                    </span>
                    <button onClick={() => removeGroup(g.id)} className="text-secondary/50 hover:text-error ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {pool.length > 0 && (
              <div className="flex items-center gap-3">
                <input type="text" placeholder="Preset Name (e.g. Fireball)" value={presetName} onChange={e => setPresetName(e.target.value)} className="w-48 px-3 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none" />
                <input type="text" placeholder="Owner (e.g. Wizard)" value={presetOwner} onChange={e => setPresetOwner(e.target.value)} className="w-32 px-3 py-1.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-md focus:border-secondary focus:outline-none" />
                <button onClick={savePreset} disabled={!presetName} className="px-4 py-1.5 text-sm font-bold bg-surface-container-highest text-on-surface hover:bg-outline-variant/50 rounded-md transition-colors disabled:opacity-50">Save Preset</button>
              </div>
            )}
          </div>

          {/* Results Box */}
          <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex flex-col items-center justify-center relative min-h-[200px] shadow-inner">
            {results.length === 0 ? (
              <div className="text-center">
                <Dices className="w-16 h-16 text-on-surface-variant/10 mx-auto mb-2" />
                <p className="text-sm text-on-surface-variant/40">Ready to roll...</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-4 mb-6 w-full">
                  {results.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                      animate={{
                        scale: isRolling ? [1, 1.1, 0.95, 1] : 1,
                        rotate: isRolling ? [0, 8, -8, 0] : 0,
                        opacity: 1
                      }}
                      transition={{ duration: isRolling ? 0.2 : 0.3, repeat: isRolling ? Infinity : 0 }}
                      className={clsx(
                        "w-14 h-14 rounded-lg flex flex-col items-center justify-center font-mono border-2 relative shadow-lg",
                        isRolling
                          ? "bg-secondary/10 border-secondary/20 text-secondary"
                          : r.isMax
                            ? "bg-primary/15 border-primary text-primary shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                            : r.isMin
                              ? "bg-error/10 border-error text-error shadow-[0_0_20px_rgba(255,180,171,0.2)]"
                              : "bg-surface-container-high border-outline-variant/20 text-on-surface"
                      )}
                    >
                      <span className="text-2xl font-bold leading-none">{r.value}</span>
                      <span className="text-[10px] text-on-surface-variant absolute -bottom-5 truncate max-w-[50px] opacity-70">{r.label}</span>
                    </motion.div>
                  ))}
                </div>
                
                {results.length > 0 && !isRolling && (() => {
                  const totalMax = pool.reduce((sum, g) => {
                    const maxPerDie = g.type === "standard" ? (g.sides || 1) : (g.max || 1);
                    return sum + (maxPerDie * g.count);
                  }, 0);
                  const successRate = totalMax > 0 ? ((total / totalMax) * 100).toFixed(1) : "0.0";

                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center p-4 bg-surface-container/50 rounded-xl border border-outline-variant/10 min-w-[200px]">
                      <span className="text-sm text-on-surface-variant uppercase tracking-widest font-bold mb-1">Total Roll</span>
                      <span className="text-5xl font-serif font-bold text-secondary arcane-text-glow mb-2">{total}</span>
                      <div className="flex items-center gap-2 text-xs font-mono bg-surface-container-highest px-3 py-1.5 rounded-md border border-outline-variant/20">
                        <span className="text-on-surface-variant">Max: {totalMax}</span>
                        <span className="text-on-surface-variant/30">|</span>
                        <span className="text-primary font-bold">Success: {successRate}%</span>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            )}
          </div>

          <button
            onClick={roll}
            disabled={isRolling || pool.length === 0}
            className={clsx(
              "mt-6 w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3",
              isRolling
                ? "bg-secondary/10 text-secondary cursor-wait"
                : "bg-secondary text-on-secondary hover:brightness-110 shadow-[0_0_20px_rgba(201,184,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRolling ? <><RotateCcw className="w-6 h-6 animate-spin" /> Rolling...</> : <><Dices className="w-6 h-6" /> Roll Pool</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MULTI-COLUMN SLOT MACHINE
   ═══════════════════════════════════════════════ */

interface SavedSlotPreset {
  id: string;
  label: string;
  columns: SlotColumn[];
}

const DEFAULT_ITEMS: SlotItem[] = [
  { id: "1", label: "Gold", icon: "💰", weight: 30 },
  { id: "2", label: "Potion", icon: "🧪", weight: 25 },
  { id: "3", label: "Sword", icon: "⚔️", weight: 15 },
  { id: "4", label: "Cursed", icon: "💀", weight: 10 },
  { id: "5", label: "Nothing", icon: "💨", weight: 15 },
  { id: "6", label: "Legendary", icon: "✨", weight: 5 },
];

function weightedRandom(items: SlotItem[]): SlotItem {
  if (items.length === 0) return { id: 'empty', label: 'Empty', icon: '?', weight: 0 };
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// Render icon/image intelligently
function RenderSlotIcon({ icon, isSpinning = false }: { icon: string, isSpinning?: boolean }) {
  const isImage = icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:image");
  
  if (isImage) {
    return (
      <div className="w-16 h-16 rounded-md overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="slot item" className={clsx("w-full h-full object-cover", isSpinning && "blur-[1px]")} />
      </div>
    );
  }
  return <div className="text-6xl drop-shadow-lg">{icon}</div>;
}

function SlotMachineWidget({ animDuration }: { animDuration: number }) {
  const [columns, setColumns] = useState<SlotColumn[]>([{ id: generateId(), items: [...DEFAULT_ITEMS] }]);
  
  // Presets
  const [presets, setPresets] = useState<SavedSlotPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  const [showConfig, setShowConfig] = useState(false);
  const [activeEditCol, setActiveEditCol] = useState<string | null>(null);

  // New item form
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newWeight, setNewWeight] = useState("10");

  const [spinningCols, setSpinningCols] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, SlotItem | null>>({});
  const [displayIdx, setDisplayIdx] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const addColumn = () => {
    if (columns.length >= 5 || isAnySpinning) return;
    setColumns(prev => [...prev, { id: generateId(), items: [...DEFAULT_ITEMS] }]);
  };

  const removeColumn = () => {
    if (columns.length <= 1 || isAnySpinning) return;
    setColumns(prev => prev.slice(0, prev.length - 1));
  };

  const isAnySpinning = Object.values(spinningCols).some(v => v);

  const spin = useCallback(() => {
    if (isAnySpinning) return;
    
    const newSpinning: Record<string, boolean> = {};
    const newResults: Record<string, SlotItem | null> = {};
    
    columns.forEach(col => {
      if (col.items.length < 2) return;
      newSpinning[col.id] = true;
      newResults[col.id] = null;
    });

    if (Object.keys(newSpinning).length === 0) return;

    setSpinningCols(newSpinning);
    setResults(newResults);

    columns.forEach((col, idx) => {
      if (!newSpinning[col.id]) return;
      const tickInterval = 80 + (idx * 5); 
      intervalsRef.current[col.id] = setInterval(() => {
        setDisplayIdx(prev => ({ ...prev, [col.id]: (prev[col.id] || 0) + 1 }));
        playTick();
      }, tickInterval);

      const stopDelay = animDuration + (idx * 500); 
      setTimeout(() => {
        clearInterval(intervalsRef.current[col.id]);
        const winner = weightedRandom(col.items);
        setResults(prev => ({ ...prev, [col.id]: winner }));
        setSpinningCols(prev => ({ ...prev, [col.id]: false }));
        playSlotStop();
        
        if (idx === columns.length - 1) {
          setTimeout(() => playReveal(), 200);
        }
      }, stopDelay);
    });
  }, [columns, isAnySpinning, animDuration]);

  useEffect(() => {
    return () => { Object.values(intervalsRef.current).forEach(clearInterval); };
  }, []);

  const activeColData = columns.find(c => c.id === activeEditCol);
  
  const addItemToActiveCol = () => {
    if (!activeEditCol || !newLabel || !newIcon) return;
    setColumns(prev => prev.map(c => {
      if (c.id === activeEditCol) {
        return { ...c, items: [...c.items, { id: generateId(), label: newLabel, icon: newIcon, weight: parseInt(newWeight) || 10 }] };
      }
      return c;
    }));
    setNewLabel("");
    setNewIcon("");
  };

  const removeItemFromActiveCol = (itemId: string) => {
    if (!activeEditCol) return;
    setColumns(prev => prev.map(c => {
      if (c.id === activeEditCol) {
        return { ...c, items: c.items.filter(i => i.id !== itemId) };
      }
      return c;
    }));
  };

  // Preset Management
  const savePreset = () => {
    if (!presetName) return;
    setPresets([...presets, { id: generateId(), label: presetName, columns: JSON.parse(JSON.stringify(columns)) }]);
    setPresetName("");
  };

  const loadPreset = (p: SavedSlotPreset) => {
    if (isAnySpinning) return;
    setColumns(JSON.parse(JSON.stringify(p.columns)));
    setResults({});
    setActiveEditCol(null);
  };

  return (
    <div className="rounded-xl arcane-glass border border-outline-variant/20 flex flex-col min-h-[600px]">
      <div className="p-4 border-b border-outline-variant/20 shrink-0 flex items-center justify-between bg-surface-container/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-on-surface text-lg">Custom Slot Machine</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-surface-container-highest rounded-lg border border-outline-variant/10 p-1">
            <button 
              onClick={removeColumn} 
              disabled={columns.length <= 1 || isAnySpinning}
              className="p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded disabled:opacity-30 transition-colors"
              title="Remove Reel"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <SplitSquareHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-on-surface">{columns.length} Reels</span>
            </div>
            <button 
              onClick={addColumn} 
              disabled={columns.length >= 5 || isAnySpinning}
              className="p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded disabled:opacity-30 transition-colors"
              title="Add Reel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={clsx("p-2 rounded-lg transition-colors border", showConfig ? "bg-primary/15 text-primary border-primary/30 shadow-inner" : "text-on-surface-variant border-transparent hover:bg-surface-container")}
            title="Edit Machine"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* Left: Editor & Presets Sidebar */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: "320px", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="border-b lg:border-b-0 lg:border-r border-outline-variant/20 bg-surface-container-lowest/50 shrink-0 flex flex-col overflow-hidden h-full max-h-[400px] lg:max-h-full"
            >
              <div className="p-4 w-80 flex flex-col h-full overflow-y-auto">
                
                {/* Save Preset Section */}
                <div className="mb-6 bg-surface-container/30 p-3 rounded-lg border border-outline-variant/10 shrink-0">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1"><Save className="w-3 h-3"/> Save Machine Setup</div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Preset Name..." value={presetName} onChange={e=>setPresetName(e.target.value)} className="flex-1 px-2 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/20 rounded focus:border-primary focus:outline-none" />
                    <button onClick={savePreset} disabled={!presetName} className="px-3 py-1.5 text-xs font-bold bg-primary/20 text-primary hover:bg-primary/30 rounded transition-colors disabled:opacity-50">Save</button>
                  </div>
                </div>

                {/* Load Presets Section */}
                {presets.length > 0 && (
                  <div className="mb-6 shrink-0">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Saved Machines</div>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {presets.map(p => (
                        <div key={p.id} className="group flex items-center justify-between bg-surface-container/40 hover:bg-surface-container border border-outline-variant/10 rounded p-1.5">
                          <button onClick={() => loadPreset(p)} className="flex-1 text-left text-xs text-on-surface truncate">
                            {p.label} <span className="text-on-surface-variant/50 text-[10px]">({p.columns.length} reels)</span>
                          </button>
                          <button onClick={() => setPresets(presets.filter(x=>x.id!==p.id))} className="opacity-0 group-hover:opacity-100 text-error/50 hover:text-error shrink-0"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="border-outline-variant/20 my-2 shrink-0" />

                {/* Column Editor Section */}
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 mt-2 shrink-0">Edit Column Items</div>
                
                <div className="flex flex-wrap gap-1 mb-3 shrink-0">
                  {columns.map((c, i) => (
                    <button
                      key={c.id} onClick={() => setActiveEditCol(c.id)}
                      className={clsx("px-3 py-1.5 text-xs rounded transition-colors font-mono", activeEditCol === c.id ? "bg-primary text-on-primary font-bold shadow-sm" : "bg-surface-container text-on-surface hover:bg-outline-variant/50")}
                    >
                      Col {i + 1}
                    </button>
                  ))}
                </div>

                {activeEditCol && activeColData && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="text-[10px] text-primary mb-2 shrink-0">Editing Col {columns.findIndex(c => c.id === activeEditCol) + 1} ({activeColData.items.length} items)</div>
                    
                    <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 pb-2">
                      {activeColData.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 bg-surface-container/60 rounded px-2 py-1.5 text-sm group border border-outline-variant/10">
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            {item.icon.startsWith("http") || item.icon.startsWith("/") 
                              ? <ImageIcon className="w-3 h-3 text-on-surface-variant" />
                              : <span>{item.icon}</span>
                            }
                          </div>
                          <span className="flex-1 truncate text-xs text-on-surface">{item.label}</span>
                          <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-lowest px-1.5 py-0.5 rounded">{item.weight}w</span>
                          <button onClick={() => removeItemFromActiveCol(item.id)} className="opacity-0 group-hover:opacity-100 text-error/50 hover:text-error transition-opacity"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 shrink-0 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 space-y-2">
                      <div className="text-[10px] uppercase text-on-surface-variant font-bold mb-1">Add New Item</div>
                      <div className="flex gap-2">
                        <div className="w-full relative">
                          <input value={newIcon} onChange={e=>setNewIcon(e.target.value)} placeholder="Emoji or Image URL" className="w-full px-7 py-1.5 text-xs bg-surface-container rounded border border-outline-variant/30 focus:border-primary focus:outline-none" title="Use emoji or full URL (e.g. https://.../image.png or .gif)" />
                          {newIcon.startsWith("http") || newIcon.startsWith("/") 
                            ? <ImageIcon className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary" />
                            : <Type className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Item Name" className="flex-1 px-2 py-1.5 text-xs bg-surface-container rounded border border-outline-variant/30 focus:border-primary focus:outline-none" />
                        <input type="number" value={newWeight} onChange={e=>setNewWeight(e.target.value)} placeholder="Weight" className="w-16 px-2 py-1.5 text-xs font-mono bg-surface-container rounded border border-outline-variant/30 focus:border-primary focus:outline-none" title="Higher weight = more likely" />
                      </div>
                      <button onClick={addItemToActiveCol} disabled={!newIcon || !newLabel} className="w-full mt-1 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded text-xs font-bold transition-colors disabled:opacity-50">Add to Column</button>
                    </div>
                  </div>
                )}
                {!activeEditCol && (
                  <div className="flex-1 flex items-center justify-center text-xs text-on-surface-variant/50 text-center italic p-4 border border-dashed border-outline-variant/20 rounded-lg mt-2">
                    Select a column above to edit its items
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Machine Display */}
        <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center relative overflow-y-auto min-h-[400px]">
          
          <div className="flex flex-wrap justify-center gap-4 bg-surface-container-lowest p-8 rounded-[2rem] border-4 border-surface-container shadow-2xl relative w-full max-w-5xl">
            {/* Glossy overlay effect for the "machine" */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[1.75rem] pointer-events-none" />

            {columns.map((col, idx) => {
              const isSpinning = spinningCols[col.id];
              const result = results[col.id];
              const displayItem = col.items[displayIdx[col.id] % col.items.length] || col.items[0];
              
              return (
                <div key={col.id} className="flex flex-col items-center gap-4">
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high px-3 py-1 rounded-full shadow-inner border border-outline-variant/10">
                    Reel {idx + 1}
                  </div>
                  
                  <div className={clsx(
                    "w-36 h-48 md:w-44 md:h-56 rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden relative",
                    isSpinning 
                      ? "bg-primary/5 border-[3px] border-primary/40 shadow-inner" 
                      : result 
                        ? "bg-primary/10 border-[3px] border-primary shadow-[0_0_30px_rgba(245,158,11,0.25)]" 
                        : "bg-surface-container/60 border-[3px] border-outline-variant/30 shadow-inner"
                  )}>
                    {isSpinning && (
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.3),transparent)] animate-[shimmer_0.15s_infinite]" />
                    )}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isSpinning ? displayIdx[col.id] : result?.id || "empty"}
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        transition={{ duration: isSpinning ? 0.05 : 0.3 }}
                        className="text-center z-10 w-full px-2"
                      >
                        <div className="flex justify-center mb-3">
                          <RenderSlotIcon icon={isSpinning ? displayItem?.icon : result ? result.icon : "🎰"} isSpinning={isSpinning} />
                        </div>
                        {!isSpinning && result && (
                          <div className="text-base md:text-lg font-bold text-primary truncate w-full text-center arcane-text-glow drop-shadow-md">
                            {result.label}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  
                  {/* Probability */}
                  <div className="h-5">
                    {!isSpinning && result && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-on-surface-variant bg-surface-container rounded-md px-2 py-0.5">
                        {((result.weight / col.items.reduce((a,b)=>a+b.weight,0)) * 100).toFixed(1)}%
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={spin}
            disabled={isAnySpinning}
            className={clsx(
              "mt-12 max-w-md w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 border",
              isAnySpinning
                ? "bg-primary/10 text-primary border-primary/20 cursor-wait"
                : "bg-primary text-on-primary hover:brightness-110 border-primary shadow-[0_0_30px_rgba(245,158,11,0.35)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
            )}
          >
            {isAnySpinning ? (
              <><RotateCcw className="w-6 h-6 animate-spin" /> Spinning...</>
            ) : (
              <><Play className="w-6 h-6 fill-current" /> Pull Lever</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════ */

export default function ProbabilityPage() {
  const [animDuration, setAnimDuration] = useState(1500);

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-16">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-serif text-3xl font-bold text-on-surface flex items-center gap-3">
            <Dices className="w-8 h-8 text-secondary" />
            Probability
            <span className="text-secondary arcane-text-glow"> Engine</span>
          </h1>
          <p className="text-base text-on-surface-variant mt-2 max-w-xl">
            Build custom dice pools, save roleplay presets, and configure immersive multi-reel slot machines for loot or encounters.
          </p>
        </div>

        {/* Global anim duration control */}
        <div className="flex items-center gap-3 bg-surface-container/40 px-5 py-3 rounded-xl border border-outline-variant/10 shrink-0">
          <Settings2 className="w-5 h-5 text-on-surface-variant" />
          <label className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Delay</label>
          <input
            type="range" min={300} max={5000} step={100}
            value={animDuration}
            onChange={(e) => setAnimDuration(parseInt(e.target.value))}
            className="w-28 accent-primary"
          />
          <span className="text-sm font-mono text-primary font-bold w-12 text-right">{(animDuration / 1000).toFixed(1)}s</span>
        </div>
      </motion.div>

      {/* Changed to vertical layout */}
      <div className="grid grid-cols-1 gap-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <DiceRoller animDuration={animDuration} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full"
        >
          <SlotMachineWidget animDuration={animDuration} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full"
        >
          <SlotCoinWidget animDuration={animDuration} />
        </motion.div>
      </div>
    </div>
  );
}
