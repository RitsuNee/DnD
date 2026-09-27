"use client";

import { motion } from "framer-motion";
import { Heart, Shield, Menu, Bell, Search } from "lucide-react";
import { clsx } from "clsx";

import { useCharacterStore } from "@/stores/character-store";
import { useAuthStore } from "@/stores/auth-store";
import { getCharacterAC, getCharacterMaxHp } from "@/lib/types";

function getHpColor(hp: number, maxHp: number) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio > 0.6) return "text-tertiary";
  if (ratio > 0.3) return "text-primary";
  return "text-error";
}

function getHpBg(hp: number, maxHp: number) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio > 0.6) return "bg-tertiary";
  if (ratio > 0.3) return "bg-primary-container";
  return "bg-error-container";
}

export default function Topbar() {
  const characters = useCharacterStore(state => state.characters);
  const { user } = useAuthStore();
  const role = user?.displayName?.split("|")[0] || "Player";
  const name = user?.displayName?.split("|")[1] || (role === "GM" ? "GM" : "P");

  return (
    <header
      className={clsx(
        "fixed top-0 right-0 z-30 h-14 flex items-center justify-between",
        "px-5 arcane-glass",
        "transition-all"
      )}
      style={{
        left: "72px",
        borderBottom: "1px solid var(--glass-border)",
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        borderRadius: 0,
      }}
    >
      {/* Left: Campaign Name */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-surface-container-high/60 text-on-surface-variant transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-base font-semibold text-on-surface leading-tight">
            The Crimson Prophecy
          </h1>
          <p className="text-xs text-on-surface-variant leading-tight">
            Session 14 · Round 3
          </p>
        </div>
      </div>

      {/* Center: Party HP Pips */}
      <div className="hidden md:flex items-center gap-3">
        {characters.map((char) => {
          const maxHp = getCharacterMaxHp(char);
          const ac = getCharacterAC(char);

          return (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-surface-container/80 border border-outline-variant/20",
                "text-xs font-medium"
              )}
            >
              {/* Avatar circle */}
              <div className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] text-on-surface-variant font-bold overflow-hidden border border-outline-variant/30">
                {char.avatarUrl ? (
                  <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  char.name[0]
                )}
              </div>

              {/* HP Bar Mini */}
              <div className="flex items-center gap-1.5">
                <Heart className={clsx("w-3 h-3", getHpColor(char.hp, maxHp))} />
                <div className="w-16 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <motion.div
                    className={clsx("h-full rounded-full", getHpBg(char.hp, maxHp))}
                    initial={{ width: 0 }}
                    animate={{ width: `${maxHp > 0 ? (char.hp / maxHp) * 100 : 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className={clsx("tabular-nums font-mono text-[11px]", getHpColor(char.hp, maxHp))}>
                  {char.hp}
                </span>
              </div>

              {/* AC */}
              <div className="flex items-center gap-0.5 ml-1">
                <Shield className="w-3 h-3 text-secondary/70" />
                <span className="tabular-nums font-mono text-[11px] text-secondary/70">
                  {ac}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Search"
        >
          <Search className="w-4.5 h-4.5" />
        </button>
        <button
          className="relative p-2 rounded-lg hover:bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error animate-pulse" />
        </button>
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center ml-1">
          <span className="text-xs font-bold text-on-primary">{name[0]?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
