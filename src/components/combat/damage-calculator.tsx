"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Dices, ArrowRight, ShieldAlert, Crosshair, Skull, User } from "lucide-react";
import { clsx } from "clsx";
import { calculateDegreeOfSuccess } from "@/lib/types";
import { useCombatStore, getEffectiveCombatantStat } from "@/stores/combat-store";

export default function DamageCalculator() {
  const combatStore = useCombatStore();
  const [rollPercent, setRollPercent] = useState<string>("");
  const [baseDamage, setBaseDamage] = useState<string>("");
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [autoNextTurn, setAutoNextTurn] = useState(true);
  const [feedback, setFeedback] = useState<{msg: string, isError: boolean} | null>(null);

  const roll = parseInt(rollPercent);
  const dmg = parseInt(baseDamage);
  
  const isValid = !isNaN(roll) && roll >= 1 && roll <= 100 && !isNaN(dmg) && dmg > 0;
  
  const result = isValid ? calculateDegreeOfSuccess(roll) : null;
  const finalDamage = result && isValid ? Math.floor(dmg * result.multiplier) : 0;

  const showFeedback = (msg: string, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleHit = () => {
    if (!isValid || finalDamage === 0 || targetIds.length === 0) return;

    if (targetIds.includes("enemy_all") || targetIds.includes("player_all")) {
      const isEnemyTarget = targetIds.includes("enemy_all");
      const validTargets = combatStore.combatants.filter(c => c.isEnemy === isEnemyTarget && c.hp > 0);
      
      if (validTargets.length === 0) {
        showFeedback("No valid targets alive", true);
        return;
      }

      validTargets.forEach((t) => {
        const targetAc = getEffectiveCombatantStat(t, 'ac');
        const actualDmg = Math.max(0, finalDamage - targetAc);
        combatStore.updateCombatant(t.id, { hp: Math.max(0, t.hp - actualDmg) });
      });
      
      showFeedback(`AoE: Dealt up to ${finalDamage} dmg to ${validTargets.length} targets`);
    } else {
      const validTargets = combatStore.combatants.filter(c => targetIds.includes(c.id) && c.hp > 0);
      if (validTargets.length === 0) return;

      validTargets.forEach((t) => {
        const targetAc = getEffectiveCombatantStat(t, 'ac');
        const actualDmg = Math.max(0, finalDamage - targetAc);
        combatStore.updateCombatant(t.id, { hp: Math.max(0, t.hp - actualDmg) });
      });

      if (validTargets.length === 1) {
        const target = validTargets[0];
        const targetAc = getEffectiveCombatantStat(target, 'ac');
        const actualDmg = Math.max(0, finalDamage - targetAc);
        showFeedback(`Hit: Dealt ${actualDmg} dmg to ${target.name} (AC reduced ${targetAc} dmg)`);
      } else {
        showFeedback(`Multi-Hit: Dealt up to ${finalDamage} dmg to ${validTargets.length} targets`);
      }
    }

    if (autoNextTurn) {
      combatStore.nextTurn();
    }
  };

  const toggleTarget = (id: string) => {
    setTargetIds(prev => {
      if (id === "enemy_all" || id === "player_all") {
        return [id]; // Exclusive select for "all"
      }
      
      // If we are selecting an individual but currently have an "all" selected, clear it first
      let current = prev;
      if (current.includes("enemy_all") || current.includes("player_all")) {
        current = [];
      }

      if (current.includes(id)) {
        return current.filter(t => t !== id);
      } else {
        return [...current, id];
      }
    });
  };

  return (
    <div className="rounded-xl arcane-glass p-5 border border-outline-variant/20 relative">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-bold text-on-surface text-lg">
          30-50 Damage Calculator
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Roll Input */}
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wider">
            D100 Roll (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="100"
              value={rollPercent}
              onChange={(e) => setRollPercent(e.target.value)}
              placeholder="e.g. 75"
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-container/60 text-on-surface font-mono border border-outline-variant/20 focus:border-primary/50 focus:outline-none transition-colors"
            />
            <Dices className="w-4 h-4 text-on-surface-variant/50 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Base Damage Input */}
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5 uppercase tracking-wider">
            Base Damage
          </label>
          <input
            type="number"
            min="1"
            value={baseDamage}
            onChange={(e) => setBaseDamage(e.target.value)}
            placeholder="e.g. 12"
            className="w-full px-3 py-2 rounded-lg bg-surface-container/60 text-on-surface font-mono border border-outline-variant/20 focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Result Display */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden min-h-[100px] flex items-center justify-center p-4 mb-4">
        <AnimatePresence mode="wait">
          {!isValid ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-on-surface-variant/50 text-sm text-center"
            >
              Enter roll percentage and base damage
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-3">
                {/* Zone Indicator */}
                <div className={clsx(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border",
                  result?.zone === "hit" && "bg-tertiary/10 text-tertiary border-tertiary/20",
                  result?.zone === "miss" && "bg-surface-container-high text-on-surface-variant border-outline-variant/30",
                  result?.zone === "blunder" && "bg-error/10 text-error border-error/20"
                )}>
                  {result?.zone === "hit" && <Crosshair className="w-4 h-4" />}
                  {result?.zone === "miss" && <ShieldAlert className="w-4 h-4" />}
                  {result?.zone === "blunder" && <Skull className="w-4 h-4" />}
                  {result?.zone.toUpperCase()}
                </div>
                
                {/* Multiplier */}
                <div className="text-sm font-mono text-on-surface-variant">
                  {result?.multiplier.toFixed(2)}x Multiplier
                </div>
              </div>

              {/* Final Calculation Flow */}
              <div className="flex items-center justify-between bg-surface-container/40 p-3 rounded-lg border border-outline-variant/10">
                <div className="text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Base</div>
                  <div className="font-mono text-on-surface">{dmg}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-on-surface-variant/40" />
                <div className="text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Final</div>
                  <div className={clsx(
                    "font-mono text-2xl font-bold",
                    result?.zone === "hit" ? "text-tertiary" : result?.zone === "miss" ? "text-on-surface-variant" : "text-error"
                  )}>
                    {finalDamage}
                  </div>
                </div>
              </div>
              
              {result?.zone === "blunder" && (
                <div className="mt-2 text-xs text-error/80 text-center animate-pulse">
                  ⚠️ Applies to self or ally! Select target carefully.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Target & Action */}
      <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
            Apply Damage To ({targetIds.length})
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors" title="Automatically advance to the next turn after hitting">
              <input 
                type="checkbox" 
                checked={autoNextTurn} 
                onChange={(e) => setAutoNextTurn(e.target.checked)} 
                className="w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary focus:ring-offset-0 bg-surface-container" 
              />
              Auto Next Turn
            </label>
            <button
              onClick={() => combatStore.nextTurn()}
              className="px-3 py-2 rounded-lg font-bold flex items-center justify-center transition-all bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest text-xs border border-outline-variant/20"
              title="Skip to next turn without attacking"
            >
              Skip Turn
            </button>
            <button
              onClick={handleHit}
              disabled={!isValid || targetIds.length === 0 || finalDamage === 0}
              className={clsx(
                "px-6 py-2 rounded-lg font-bold flex items-center justify-center transition-all",
                isValid && targetIds.length > 0 && finalDamage > 0
                  ? "bg-error text-on-error shadow-[0_0_15px_rgba(255,180,171,0.25)] hover:brightness-110"
                  : "bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-50"
              )}
            >
              {(targetIds.includes("enemy_all") || targetIds.includes("player_all")) ? "HIT ALL" : "HIT"}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 pb-1 custom-scrollbar">
          <button
            onClick={() => toggleTarget("enemy_all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1",
              targetIds.includes("enemy_all") ? "bg-error/20 text-error border-error/50" : "bg-surface-container/60 text-on-surface-variant border-outline-variant/20 hover:border-error/30 hover:text-error"
            )}
          >
            💥 All Enemies
          </button>
          <button
            onClick={() => toggleTarget("player_all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1",
              targetIds.includes("player_all") ? "bg-primary/20 text-primary border-primary/50" : "bg-surface-container/60 text-on-surface-variant border-outline-variant/20 hover:border-primary/30 hover:text-primary"
            )}
          >
            💥 All Players
          </button>
          <div className="w-px h-6 bg-outline-variant/20 mx-1 self-center" />
          
          {combatStore.combatants.filter(c => c.hp > 0).map(c => {
            const isSelected = targetIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleTarget(c.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5",
                  isSelected 
                    ? (c.isEnemy ? "bg-error/15 text-error border-error/40" : "bg-primary/15 text-primary border-primary/40")
                    : "bg-surface-container/40 text-on-surface border-outline-variant/20 hover:bg-surface-container/80"
                )}
              >
                {c.isEnemy ? <Skull className="w-3 h-3 opacity-70" /> : <User className="w-3 h-3 opacity-70" />}
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={clsx(
              "absolute bottom-full left-0 right-0 mb-2 p-2 rounded-lg text-sm text-center font-medium shadow-lg backdrop-blur-md",
              feedback.isError ? "bg-error/90 text-on-error" : "bg-primary/90 text-on-primary"
            )}
          >
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
