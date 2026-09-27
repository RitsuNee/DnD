"use client";

import { motion } from "framer-motion";
import {
  Users,
  Dices,
  Sparkles,
  Backpack,
  Swords,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const QUICK_LINKS = [
  {
    title: "Party Hub",
    description: "Manage characters, stats, and status effects",
    icon: Users,
    href: "/gm/party",
    accent: "from-primary/20 to-primary-container/10",
    iconColor: "text-primary",
  },
  {
    title: "Dice & Slots",
    description: "Roll dice presets and spin the slot machine",
    icon: Dices,
    href: "/gm/probability",
    accent: "from-secondary/20 to-secondary-container/10",
    iconColor: "text-secondary",
  },
  {
    title: "Loot Tables",
    description: "Generate encounters and treasure drops",
    icon: Sparkles,
    href: "/gm/loot",
    accent: "from-primary-container/20 to-primary/10",
    iconColor: "text-primary-container",
  },
  {
    title: "Bag of Holding",
    description: "Shared party inventory and transfers",
    icon: Backpack,
    href: "/gm/inventory",
    accent: "from-tertiary/20 to-tertiary-container/10",
    iconColor: "text-tertiary",
  },
  {
    title: "Combat",
    description: "Run battles with the 30-50 rule system",
    icon: Swords,
    href: "/gm/combat",
    accent: "from-error/20 to-error-container/10",
    iconColor: "text-error",
  },
];

const MOCK_RECENT = [
  { label: "Kael took 12 damage from Goblin Archer", time: "2 min ago", type: "damage" as const },
  { label: "Lyra healed Dorn for 15 HP", time: "5 min ago", type: "heal" as const },
  { label: "Encounter: Shadow Drake spawned", time: "8 min ago", type: "event" as const },
  { label: "Mira found Potion of Greater Healing", time: "12 min ago", type: "loot" as const },
];

function getEventIcon(type: string) {
  switch (type) {
    case "damage": return <Swords className="w-3.5 h-3.5 text-error" />;
    case "heal": return <TrendingUp className="w-3.5 h-3.5 text-tertiary" />;
    case "event": return <Zap className="w-3.5 h-3.5 text-primary" />;
    case "loot": return <Sparkles className="w-3.5 h-3.5 text-primary-container" />;
    default: return <Clock className="w-3.5 h-3.5 text-on-surface-variant" />;
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function GmDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-on-surface">
          Game Master
          <span className="text-primary arcane-text-glow"> Dashboard</span>
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Welcome back, Dungeon Master. Your party awaits.
        </p>
      </motion.div>

      {/* Quick Access Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <motion.div key={link.title} variants={item}>
              <Link
                href={link.href}
                className={clsx(
                  "group relative flex flex-col gap-3 p-5 rounded-xl",
                  "arcane-glass arcane-glass-hover",
                  "overflow-hidden"
                )}
              >
                {/* Gradient overlay */}
                <div
                  className={clsx(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
                    link.accent
                  )}
                />

                <div className="relative z-10">
                  <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    "bg-surface-container-high/60 group-hover:bg-surface-container-highest/60 transition-colors"
                  )}>
                    <Icon className={clsx("w-5 h-5 transition-all", link.iconColor, "group-hover:scale-110")} />
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {link.description}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-[-4px]">
                  <div className="text-primary text-lg">→</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom Row: Stats + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 p-5 rounded-xl arcane-glass space-y-4"
        >
          <h3 className="font-serif text-sm font-semibold text-on-surface flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Session Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Players", value: "4", color: "text-primary" },
              { label: "NPCs", value: "7", color: "text-secondary" },
              { label: "Rounds", value: "3", color: "text-tertiary" },
              { label: "Encounters", value: "2", color: "text-error" },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container/60 rounded-lg p-3 text-center">
                <div className={clsx("text-xl font-bold font-mono tabular-nums", stat.color)}>
                  {stat.value}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 p-5 rounded-xl arcane-glass"
        >
          <h3 className="font-serif text-sm font-semibold text-on-surface flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {MOCK_RECENT.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-container/60 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface truncate">{event.label}</p>
                </div>
                <span className="text-[11px] text-on-surface-variant whitespace-nowrap">{event.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
