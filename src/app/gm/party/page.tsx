"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Search, Backpack, User, Sparkles, Filter, X } from "lucide-react";
import { useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import CharacterCard from "@/components/party/character-card";
import CharacterSheet from "@/components/party/character-sheet";
import BagOfHolding from "@/components/party/bag-of-holding";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/auth-store";

export default function PartyHubPage() {
  const store = useCharacterStore();
  const { characters, selectedCharacterId, selectCharacter, addCharacter } = store;
  const { user } = useAuthStore();
  const role = user?.displayName?.split("|")[0] || "Player";
  const customId = user?.displayName?.split("|")[1] || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [showMobileBag, setShowMobileBag] = useState(false);

  // Preset Data
  const PRESET_RACES: Record<string, any> = {
    "Human": { atk: 1, int: 1, cha: 1, hp: 2, ac: 0, init: 0 },
    "Elf": { atk: 0, int: 2, cha: 0, hp: 0, ac: 0, init: 1 },
    "Dwarf": { atk: 1, int: 0, cha: 0, hp: 4, ac: 1, init: -1 },
    "Orc": { atk: 2, int: -1, cha: 0, hp: 3, ac: 0, init: 0 },
    "Custom": { atk: 0, int: 0, cha: 0, hp: 0, ac: 0, init: 0 }
  };

  const PRESET_CLASSES: Record<string, any> = {
    "Fighter": { atk: 2, int: 0, cha: 0, hp: 5, ac: 2, init: 0 },
    "Rogue": { atk: 1, int: 1, cha: 1, hp: 2, ac: 1, init: 2 },
    "Wizard": { atk: 0, int: 2, cha: 0, hp: 0, ac: 0, init: 0 },
    "Cleric": { atk: 0, int: 1, cha: 1, hp: 3, ac: 1, init: 0 },
    "Custom": { atk: 0, int: 0, cha: 0, hp: 0, ac: 0, init: 0 }
  };

  // Form State
  const [newName, setNewName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [selectedOwnerUid, setSelectedOwnerUid] = useState("");
  
  const [racePreset, setRacePreset] = useState("Human");
  const [customRaceName, setCustomRaceName] = useState("");
  const [raceBonus, setRaceBonus] = useState(PRESET_RACES["Human"]);

  const [classPreset, setClassPreset] = useState("Fighter");
  const [customClassName, setCustomClassName] = useState("");
  const [classBonus, setClassBonus] = useState(PRESET_CLASSES["Fighter"]);

  // Base Stats State
  const [baseStats, setBaseStats] = useState({
    atk: 10, int: 10, cha: 10,
    hp: 10, ac: 10, init: 0
  });

  const handleAddCharacter = () => {
    if (!newName) return;
    
    const finalRaceName = racePreset === "Custom" ? (customRaceName || "Unknown Race") : racePreset;
    const finalClassName = classPreset === "Custom" ? (customClassName || "Unknown Class") : classPreset;

    const finalAtk = baseStats.atk + raceBonus.atk + classBonus.atk;
    const finalInt = baseStats.int + raceBonus.int + classBonus.int;
    const finalCha = baseStats.cha + raceBonus.cha + classBonus.cha;
    const finalHp = baseStats.hp + raceBonus.hp + classBonus.hp;
    const finalAc = baseStats.ac + raceBonus.ac + classBonus.ac;
    const finalInit = baseStats.init + raceBonus.init + classBonus.init;

    const chosenUser = store.registeredUsers.find(u => u.uid === selectedOwnerUid);

    const defaultChar = {
      name: newName,
      avatarUrl: newAvatarUrl.trim() || undefined,
      ownerId: chosenUser ? chosenUser.uid : undefined,
      ownerName: chosenUser ? chosenUser.customId : undefined,
      identity: { race: finalRaceName, class: finalClassName, alignment: "Neutral", level: 1, background: "" },
      gold: 0,
      hp: finalHp,
      maxHp: finalHp,
      ac: finalAc,
      initiative: finalInit,
      useCompositeStats: true,
      notes: "",
      stats: [
        { id: "atk", name: "ATK", baseValue: finalAtk, bonusValue: 0 },
        { id: "int", name: "INT", baseValue: finalInt, bonusValue: 0 },
        { id: "cha", name: "CHA", baseValue: finalCha, bonusValue: 0 },
      ],
      specialSkills: [],
      equipment: [],
      statusEffects: []
    };
    
    addCharacter(defaultChar);
    setNewName("");
    setNewAvatarUrl("");
    setSelectedOwnerUid("");
    setRacePreset("Human");
    setCustomRaceName("");
    setRaceBonus(PRESET_RACES["Human"]);
    setClassPreset("Fighter");
    setCustomClassName("");
    setClassBonus(PRESET_CLASSES["Fighter"]);
    setBaseStats({ atk: 10, int: 10, cha: 10, hp: 10, ac: 10, init: 0 });
    setShowAddModal(false);
  };

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  const myCharacters = characters.filter(c => 
    (c.ownerId && c.ownerId === user?.uid) ||
    (c.ownerName && c.ownerName.toLowerCase() === customId.toLowerCase())
  );

  let filteredCharacters = characters;

  if (activeTab === "mine" && role === "Player") {
    filteredCharacters = myCharacters;
  }

  if (searchQuery.trim()) {
    filteredCharacters = filteredCharacters.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.identity.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.identity.race.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="font-serif text-3xl font-bold text-on-surface flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Party
            <span className="text-primary arcane-text-glow"> Hub</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {role === "GM"
              ? "Manage party members, assign player characters, and control shared inventory."
              : `Logged in as ${customId} (${role}). View party members and manage your equipment.`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile Bag of Holding Toggle */}
          <button
            onClick={() => {
              setShowMobileBag(!showMobileBag);
              selectCharacter(null);
            }}
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container/60 text-on-surface hover:text-primary text-sm transition-colors border border-outline-variant/20"
          >
            <Backpack className="w-4 h-4 text-tertiary" />
            <span className="text-xs font-semibold">Bag of Holding</span>
          </button>

          <AnimatePresence>
            {showSearch && (
              <motion.input
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters or players..."
                className="px-3 py-2 rounded-lg bg-surface-container/60 text-on-surface text-sm placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary/40 focus:outline-none transition-colors"
                autoFocus
              />
            )}
          </AnimatePresence>
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container/60 text-on-surface-variant hover:text-on-surface text-sm transition-colors border border-outline-variant/20"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {role === "GM" && (
            <button 
              onClick={() => setShowAddModal(!showAddModal)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{showAddModal ? "Cancel" : "Add Character"}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs Filter for Players */}
      {role === "Player" && (
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab("all")}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
              activeTab === "all"
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-surface-container/40 text-on-surface-variant border-outline-variant/10 hover:text-on-surface"
            )}
          >
            All Party ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={clsx(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5",
              activeTab === "mine"
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-surface-container/40 text-on-surface-variant border-outline-variant/10 hover:text-on-surface"
            )}
          >
            <User className="w-3.5 h-3.5" /> My Character ({myCharacters.length})
          </button>
        </div>
      )}

      {/* Add Character Form (GM) */}
      <AnimatePresence>
        {showAddModal && role === "GM" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-surface-container/30 border border-outline-variant/20 rounded-xl p-6 arcane-glass">
              <h3 className="text-lg font-bold text-on-surface mb-4">Create New Character</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Character Name */}
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1.5 uppercase font-bold tracking-wider">Character Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="e.g. Kael Stormborn"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Linked Player Account */}
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1.5 uppercase font-bold tracking-wider">
                    Linked Player
                  </label>
                  <select
                    value={selectedOwnerUid}
                    onChange={e => setSelectedOwnerUid(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Unassigned (NPC / Party)</option>
                    {store.registeredUsers.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.customId} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Race Selection */}
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1.5 uppercase font-bold tracking-wider">Race</label>
                  <div className="flex gap-2">
                    <select 
                      value={racePreset}
                      onChange={e => {
                        const val = e.target.value;
                        setRacePreset(val);
                        setRaceBonus(PRESET_RACES[val]);
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      {Object.keys(PRESET_RACES).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    {racePreset === "Custom" && (
                      <input 
                        type="text"
                        placeholder="Name"
                        value={customRaceName}
                        onChange={e => setCustomRaceName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    )}
                  </div>
                </div>

                {/* Class Selection */}
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1.5 uppercase font-bold tracking-wider">Class</label>
                  <div className="flex gap-2">
                    <select 
                      value={classPreset}
                      onChange={e => {
                        const val = e.target.value;
                        setClassPreset(val);
                        setClassBonus(PRESET_CLASSES[val]);
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                    >
                      {Object.keys(PRESET_CLASSES).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    {classPreset === "Custom" && (
                      <input 
                        type="text"
                        placeholder="Name"
                        value={customClassName}
                        onChange={e => setCustomClassName(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    )}
                  </div>
                </div>

                {/* Optional Avatar Image */}
                <div className="md:col-span-4 flex items-center gap-3 pt-2 border-t border-outline-variant/10">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {newAvatarUrl ? (
                      <img src={newAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-serif font-bold text-on-surface-variant">Avatar</span>
                    )}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      placeholder="Custom Avatar Image URL (optional, e.g. https://...)"
                      value={newAvatarUrl}
                      onChange={e => setNewAvatarUrl(e.target.value)}
                      className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                    />
                    <label className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-on-surface cursor-pointer transition-colors flex items-center gap-1.5 shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const { resizeImageToDataUrl } = await import("@/lib/image-utils");
                            const dataUrl = await resizeImageToDataUrl(file, 256);
                            setNewAvatarUrl(dataUrl);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Base Stats Configuration */}
              <div className="mb-6">
                <label className="text-xs text-on-surface-variant block mb-3 uppercase font-bold tracking-wider">Base Attributes (Rolled / Initial)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.keys(baseStats).map(statKey => (
                    <div key={statKey} className="bg-surface-container/60 border border-outline-variant/15 rounded-lg p-2.5 text-center">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase block mb-1">{statKey}</span>
                      <input 
                        type="number" 
                        value={(baseStats as any)[statKey]}
                        onChange={e => setBaseStats({ ...baseStats, [statKey]: parseInt(e.target.value) || 0 })}
                        className="w-full text-center bg-surface-container-lowest border border-outline-variant/20 rounded py-1 text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCharacter}
                  disabled={!newName.trim()}
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-on-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Create Character
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Cards + Side Panel */}
      <div className="flex gap-5 items-start">
        {/* Character Cards Grid */}
        <div className="flex-1 grid gap-4 transition-all grid-cols-1 md:grid-cols-2">
          {filteredCharacters.map((char, i) => (
            <CharacterCard
              key={char.id}
              character={char}
              index={i}
              isSelected={char.id === selectedCharacterId}
              onSelect={() =>
                selectCharacter(char.id === selectedCharacterId ? null : char.id)
              }
            />
          ))}

          {filteredCharacters.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12 bg-surface-container/20 rounded-2xl border border-dashed border-outline-variant/20 p-6"
            >
              <Users className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
              <p className="text-on-surface-variant text-sm font-medium">
                {searchQuery
                  ? `No characters matching "${searchQuery}"`
                  : activeTab === "mine"
                  ? "You don't have a linked character yet. Ask the GM to assign one, or claim an unassigned character!"
                  : "No characters yet. Create your first party member!"}
              </p>
            </motion.div>
          )}
        </div>

        {/* Desktop Side Panel (CharacterSheet or BagOfHolding) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCharacter ? "sheet" : "bag"}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 hidden lg:block overflow-hidden"
          >
            {selectedCharacter ? (
              <CharacterSheet
                character={selectedCharacter}
                onClose={() => selectCharacter(null)}
              />
            ) : (
              <BagOfHolding />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Drawer (When character selected on mobile/tablet) */}
      <AnimatePresence>
        {selectedCharacter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex justify-end"
            onClick={() => selectCharacter(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full max-w-md h-full bg-background border-l border-outline-variant/20 shadow-2xl p-3 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <CharacterSheet
                character={selectedCharacter}
                onClose={() => selectCharacter(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bag of Holding Drawer */}
      <AnimatePresence>
        {showMobileBag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex justify-end"
            onClick={() => setShowMobileBag(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full max-w-md h-full bg-background border-l border-outline-variant/20 shadow-2xl p-3 overflow-y-auto relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowMobileBag(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
              <BagOfHolding />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
