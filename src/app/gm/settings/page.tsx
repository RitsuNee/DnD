"use client";

import { motion } from "framer-motion";
import { Settings, Palette, Users, Database, Shield } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Campaign",
    description: "Campaign name, session tracking, and general preferences",
    icon: Settings,
    color: "text-primary",
  },
  {
    title: "Appearance",
    description: "Theme colors, font sizes, and display options",
    icon: Palette,
    color: "text-secondary",
  },
  {
    title: "Players",
    description: "Manage player access, invite links, and permissions",
    icon: Users,
    color: "text-tertiary",
  },
  {
    title: "Data",
    description: "Export campaign data, backup, and reset options",
    icon: Database,
    color: "text-primary-container",
  },
  {
    title: "Security",
    description: "Authentication, login settings, and role management",
    icon: Shield,
    color: "text-error",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-2xl font-bold text-on-surface flex items-center gap-3">
          <Settings className="w-6 h-6 text-on-surface-variant" />
          Settings
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Configure your campaign and application preferences
        </p>
      </motion.div>

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-4 p-4 rounded-xl arcane-glass arcane-glass-hover cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container-high/60 flex items-center justify-center shrink-0 group-hover:bg-surface-container-highest/60 transition-colors">
                <Icon className={`w-5 h-5 ${section.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {section.description}
                </p>
              </div>
              <div className="text-on-surface-variant group-hover:text-primary transition-colors">→</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
