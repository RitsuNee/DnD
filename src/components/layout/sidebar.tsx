"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Dices,
  Backpack,
  Swords,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/auth-store";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    id: "party",
    label: "Party Hub",
    icon: Users,
    href: "/gm/party",
    description: "Manage your characters",
  },
  {
    id: "dice",
    label: "Dice & Slots",
    icon: Dices,
    href: "/gm/probability",
    description: "Probability Engine",
  },
  {
    id: "inventory",
    label: "Bag of Holding",
    icon: Backpack,
    href: "/gm/inventory",
    description: "Shared party inventory",
  },
  {
    id: "combat",
    label: "Combat",
    icon: Swords,
    href: "/gm/combat",
    description: "Battle mechanics",
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/gm/settings",
    description: "Campaign settings",
  },
];

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  const role = user?.displayName?.split("|")[0] || "Player";
  
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (role === "Player") {
      return ["party", "inventory", "combat"].includes(item.id);
    }
    return true;
  });

  const bottomNav = BOTTOM_NAV.filter(item => {
    if (role === "Player") return false;
    return true;
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 72 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col arcane-glass"
      style={{
        borderRight: "1px solid var(--glass-border)",
        borderTop: "none",
        borderBottom: "none",
        borderLeft: "none",
        borderRadius: 0,
      }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-14 px-4 border-b border-outline-variant/20">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Dices className="w-5 h-5 text-primary arcane-icon-glow" />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden ml-3"
            >
              <span className="font-serif text-sm font-semibold text-primary whitespace-nowrap arcane-text-glow">
                Arcane Table
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive}
              isExpanded={isExpanded}
              Icon={Icon}
            />
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 px-3 pb-3 border-t border-outline-variant/20 pt-3">
        {bottomNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive}
              isExpanded={isExpanded}
              Icon={Icon}
            />
          );
        })}

        {/* User Profile */}
        {user && (
          <div className={clsx(
            "mt-2 mb-2 pt-2 border-t border-outline-variant/20 flex flex-col gap-2 overflow-hidden"
          )}>
            <div className={clsx("flex items-center gap-3", isExpanded ? "px-3" : "justify-center")}>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                <span className="text-primary font-bold text-xs">
                  {user.displayName ? user.displayName.split('|')[1]?.[0]?.toUpperCase() : "G"}
                </span>
              </div>
              
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-on-surface truncate">
                    {user.displayName ? user.displayName.split('|')[1] : "Guest Account"}
                  </span>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-wider w-fit px-1.5 py-0.5 rounded",
                    user.displayName?.startsWith("GM|") 
                      ? "bg-secondary/20 text-secondary"
                      : "bg-primary/20 text-primary"
                  )}>
                    {user.displayName ? user.displayName.split('|')[0] : "Player"}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className={clsx(
                "flex items-center h-10 rounded-lg transition-all cursor-pointer",
                "text-error/70 hover:text-error hover:bg-error/10",
                isExpanded ? "px-3 justify-start gap-3" : "justify-center"
              )}
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            "flex items-center h-10 rounded-lg transition-all cursor-pointer",
            "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60",
            isExpanded ? "px-3 justify-start gap-3" : "justify-center"
          )}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="w-5 h-5 shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 shrink-0" />
          )}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

/* ─── Individual Nav Button ─── */
function NavButton({
  item,
  isActive,
  isExpanded,
  Icon,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "group relative flex items-center h-11 rounded-lg transition-all",
        isExpanded ? "px-3 justify-start gap-3" : "justify-center",
        isActive
          ? "arcane-glass-active text-primary"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
      )}
    >
      <Icon
        className={clsx(
          "w-5 h-5 shrink-0 transition-all",
          isActive && "arcane-icon-glow"
        )}
      />
      <AnimatePresence>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip (collapsed state) */}
      {!isExpanded && (
        <div
          className={clsx(
            "absolute left-full ml-3 px-3 py-1.5 rounded-lg",
            "bg-surface-container-highest text-on-surface text-xs font-medium whitespace-nowrap",
            "opacity-0 pointer-events-none group-hover:opacity-100",
            "transition-opacity shadow-lg",
            "border border-outline-variant/30"
          )}
        >
          {item.label}
          <span className="block text-[10px] text-on-surface-variant font-normal">
            {item.description}
          </span>
        </div>
      )}
    </Link>
  );
}
