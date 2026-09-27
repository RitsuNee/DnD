"use client";

import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";

export default function LootPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-2xl font-bold text-on-surface flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary-container" />
            Loot
            <span className="text-primary-container"> Tables</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Build encounter tables and generate random loot
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" />
          New Table
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-12 rounded-xl arcane-glass flex flex-col items-center justify-center text-center"
      >
        <Sparkles className="w-16 h-16 text-primary-container/30 mb-4" />
        <h3 className="font-serif text-lg font-semibold text-on-surface">No Loot Tables Yet</h3>
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm">
          Create your first loot table to generate encounters and treasure drops for your campaign
        </p>
        <button className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" />
          Create First Table
        </button>
      </motion.div>
    </div>
  );
}
