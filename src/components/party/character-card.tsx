"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Shield,
  Zap,
  Skull,
  Clock,
  ChevronRight,
  Swords,
  Coins,
  User,
  Backpack
} from "lucide-react";
import { clsx } from "clsx";
import {
  type Character,
  computeStatTotal,
  getCharacterAC,
  getCharacterInitiative,
  getCharacterMaxHp
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

interface CharacterCardProps {
  character: Character;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function getHpRatio(hp: number, maxHp: number) {
  return maxHp > 0 ? hp / maxHp : 0;
}

function getHpColor(ratio: number) {
  if (ratio > 0.6) return { text: "text-tertiary", bg: "bg-tertiary", glow: "shadow-tertiary/20" };
  if (ratio > 0.3) return { text: "text-primary", bg: "bg-primary-container", glow: "shadow-primary/20" };
  return { text: "text-error", bg: "bg-error", glow: "shadow-error/20" };
}

export default function CharacterCard({
  character,
  index,
  isSelected,
  onSelect,
}: CharacterCardProps) {
  const { user } = useAuthStore();
  const customId = user?.displayName?.split("|")[1] || "";
  
  const isMyCharacter = Boolean(
    (character.ownerId && character.ownerId === user?.uid) ||
    (character.ownerName && character.ownerName.toLowerCase() === customId.toLowerCase())
  );

  const maxHp = getCharacterMaxHp(character);
  const hpRatio = getHpRatio(character.hp, maxHp);
  const hpStyle = getHpColor(hpRatio);
  const isDying = hpRatio <= 0.15 && character.hp > 0;
  const isDead = character.hp === 0;

  const ac = getCharacterAC(character);
  const init = getCharacterInitiative(character);

  const equippedCount = (character.equipment || []).filter((e) => e.isEquipped).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={clsx(
        "relative cursor-pointer rounded-xl overflow-hidden transition-all border",
        isSelected
          ? "arcane-glass-active ring-2 ring-primary/40 border-primary/30"
          : isMyCharacter
          ? "arcane-glass border-primary/20 hover:border-primary/40 shadow-sm shadow-primary/5"
          : "arcane-glass arcane-glass-hover border-outline-variant/15"
      )}
    >
      {/* Danger pulse overlay for low HP */}
      {isDying && (
        <motion.div
          className="absolute inset-0 bg-error/5 rounded-xl pointer-events-none"
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="p-5">
        {/* Header: Avatar + Name + Identity + Owner Badge */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden",
              "bg-gradient-to-br",
              isDead
                ? "from-error/20 to-error/5 border-error/30"
                : isMyCharacter
                ? "from-primary/25 to-secondary/25 border-primary/30"
                : "from-primary/15 to-secondary/15 border-outline-variant/20"
            )}
          >
            {isDead ? (
              <Skull className="w-5 h-5 text-error" />
            ) : character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-serif font-bold text-primary">
                {character.name[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={clsx(
                  "font-serif font-semibold text-base leading-tight truncate",
                  isDead ? "text-error/70 line-through" : "text-on-surface"
                )}
              >
                {character.name}
              </h3>
              {isMyCharacter ? (
                <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold flex items-center gap-0.5">
                  <User className="w-2.5 h-2.5" /> You
                </span>
              ) : character.ownerName ? (
                <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center gap-0.5">
                  <User className="w-2.5 h-2.5" /> {character.ownerName}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 truncate">
              Lv.{character.identity.level} · {character.identity.race} · {character.identity.class}
            </p>
          </div>
          <ChevronRight
            className={clsx(
              "w-4 h-4 mt-1 shrink-0 transition-colors",
              isSelected ? "text-primary" : "text-outline"
            )}
          />
        </div>

        {/* HP Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Heart className={clsx("w-3.5 h-3.5", hpStyle.text)} />
              <span className="text-xs font-medium text-on-surface-variant">HP</span>
            </div>
            <span className={clsx("text-sm font-mono font-bold tabular-nums", hpStyle.text)}>
              {character.hp}
              <span className="text-on-surface-variant font-normal">/{maxHp}</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest/60 overflow-hidden">
            <motion.div
              className={clsx("h-full rounded-full", hpStyle.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, hpRatio * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                boxShadow: hpRatio > 0 ? `0 0 8px var(--tw-shadow-color)` : undefined,
              }}
            />
          </div>
        </div>

        {/* Stat Row: AC + Initiative + Gold */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg py-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-secondary/70" />
              <span className="text-xs font-mono font-bold tabular-nums text-secondary">
                {ac}
              </span>
            </div>
            <div className="text-[9px] text-on-surface-variant uppercase font-medium">AC</div>
          </div>
          <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg py-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-primary/70" />
              <span className="text-xs font-mono font-bold tabular-nums text-primary">
                {init >= 0 ? `+${init}` : init}
              </span>
            </div>
            <div className="text-[9px] text-on-surface-variant uppercase font-medium">Init</div>
          </div>
          <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg py-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Coins className="w-3 h-3 text-tertiary/70" />
              <span className="text-xs font-mono font-bold tabular-nums text-tertiary">
                {character.gold || 0}
              </span>
            </div>
            <div className="text-[9px] text-on-surface-variant uppercase font-medium">Gold</div>
          </div>
        </div>

        {/* Custom Stats List (ATK, INT, CHA, etc.) */}
        {character.stats && character.stats.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {character.stats.map((stat) => {
              const total = computeStatTotal(stat, character.useCompositeStats);
              const bonus = stat.bonusValue || 0;
              return (
                <div
                  key={stat.id}
                  className="flex-1 min-w-[50px] bg-surface-container/40 border border-outline-variant/10 rounded px-1.5 py-1 text-center"
                >
                  <div className="text-[9px] uppercase font-bold text-on-surface-variant truncate">
                    {stat.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-on-surface">
                    {total}
                    {bonus !== 0 && (
                      <span className={clsx("text-[9px] ml-0.5 font-bold", bonus > 0 ? "text-primary" : "text-error")}>
                        ({bonus > 0 ? `+${bonus}` : bonus})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status Effects + Equipment Count */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-outline-variant/10">
          {character.statusEffects.map((se) => (
            <span
              key={se.id}
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                "bg-error/10 text-error border border-error/20"
              )}
            >
              <Clock className="w-2.5 h-2.5" />
              {se.name}
              {se.remainingTurns > 0 && (
                <span className="text-error/60 font-mono">{se.remainingTurns}t</span>
              )}
            </span>
          ))}

          {character.specialSkills.filter((s) => s.isActive).length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary/10 text-secondary border border-secondary/20">
              <Swords className="w-2.5 h-2.5" />
              {character.specialSkills.filter((s) => s.isActive).length} Skill
            </span>
          )}

          {equippedCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Backpack className="w-2.5 h-2.5" />
              {equippedCount} Gear
            </span>
          ) : (
            <span className="text-[10px] text-on-surface-variant/40 flex items-center gap-1">
              <Backpack className="w-2.5 h-2.5" /> No gear
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
