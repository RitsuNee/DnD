"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Info, Play, Square, Shield, Heart, Skull, User, Plus, Trash2, Dices, Flame, Sparkles, Save, BookOpen, Dumbbell } from "lucide-react";
import { clsx } from "clsx";
import DamageCalculator from "@/components/combat/damage-calculator";
import { useCombatStore, type Combatant } from "@/stores/combat-store";
import { useCharacterStore } from "@/stores/character-store";
import { getCharacterAC, getCharacterMaxHp, getCharacterInitiative } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

function CombatantCard({ c }: { c: Combatant }) {
  const combatStore = useCombatStore();
  const { user } = useAuthStore();
  const role = user?.displayName?.split("|")[0] || "Player";
  const isActiveTurn = combatStore.isActive && combatStore.activeTurnId === c.id;
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusDuration, setNewStatusDuration] = useState("1");
  const [newStatusType, setNewStatusType] = useState<'none' | 'damage' | 'stat_mod'>("none");
  const [newStatusDamage, setNewStatusDamage] = useState("0");
  const [newStatusModifiers, setNewStatusModifiers] = useState<{stat: 'hp'|'maxHp'|'ac'|'atk'|'initiative', value: string}[]>([{ stat: 'hp', value: "0" }]);
  const [showStatusForm, setShowStatusForm] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        "p-4 rounded-xl border transition-all flex flex-col gap-3 group relative",
        showStatusForm ? "z-50" : "z-10",
        isActiveTurn
          ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          : c.isEnemy
            ? "bg-error/5 border-error/10 hover:border-error/30"
            : "bg-surface-container/40 border-outline-variant/10 hover:border-outline-variant/30",
        c.hp <= 0 && "opacity-50 grayscale"
      )}
    >
      {isActiveTurn && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"
        />
      )}

      {/* Top Row: Identity & Init */}
      <div className="flex gap-4">
        {/* Init Box */}
        <div className="shrink-0 w-14 text-center" title="Initiative (Urutan giliran)">
          <div className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Init</div>
          <input
            type="number"
            value={c.initiative}
            onChange={(e) => combatStore.updateInitiative(c.id, parseInt(e.target.value) || 0)}
            disabled={role === "Player"}
            className="w-full bg-surface-container/50 py-1 rounded text-center font-mono font-bold text-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Name & Vitals */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              "font-serif text-lg font-bold truncate",
              c.hp <= 0 ? "line-through text-on-surface-variant" : "text-on-surface",
              c.isEnemy && "text-error"
            )}>
              {c.name}
            </span>
            {c.isEnemy ? (
              <span title="Monster/Enemy"><Skull className="w-4 h-4 text-error/80" /></span>
            ) : (
              <span title="Player Character"><User className="w-4 h-4 text-primary/80" /></span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm font-mono mt-1">
            <div className="flex items-center gap-1.5 bg-surface-container/50 px-2 py-1 rounded border border-outline-variant/10" title="Health Points">
              <Heart className={clsx("w-4 h-4", c.hp > 0 ? "text-error/80" : "text-on-surface-variant/50")} />
              <input 
                type="number" 
                value={c.hp}
                onChange={(e) => combatStore.updateCombatant(c.id, { hp: parseInt(e.target.value) || 0 })}
                disabled={role === "Player"}
                className={clsx(
                  "w-10 bg-transparent focus:outline-none focus:bg-surface-container-highest rounded text-right font-bold text-base disabled:opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  c.hp > 0 ? "text-on-surface" : "text-error"
                )}
              />
              <span className="text-on-surface-variant/60">/ {c.maxHp}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container/50 px-2 py-1 rounded border border-outline-variant/10" title="Armor Class (Damage Reduction)">
              <Shield className="w-4 h-4 text-secondary/80" />
              <input 
                type="number" 
                value={c.ac}
                onChange={(e) => combatStore.updateCombatant(c.id, { ac: parseInt(e.target.value) || 0 })}
                disabled={role === "Player"}
                className="w-6 bg-transparent focus:outline-none text-secondary font-bold text-center disabled:opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container/50 px-2 py-1 rounded border border-outline-variant/10" title="Attack (Base Damage stat)">
              <Dumbbell className="w-4 h-4 text-tertiary/80" />
              <input 
                type="number" 
                value={c.atk}
                onChange={(e) => combatStore.updateCombatant(c.id, { atk: parseInt(e.target.value) || 0 })}
                disabled={role === "Player"}
                className="w-6 bg-transparent focus:outline-none text-tertiary font-bold text-center disabled:opacity-80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Remove Button */}
        {role === "GM" && (
          <button
            onClick={() => combatStore.removeCombatant(c.id)}
            className="opacity-0 group-hover:opacity-100 p-2 h-fit rounded hover:bg-error/20 text-error/40 hover:text-error transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Middle Row: Status Effects */}
      <div className="pt-2 border-t border-outline-variant/10">
        <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Status Effects
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {c.statusEffects?.map(se => {
            let tooltip = '';
            if (se.effectType === 'damage') tooltip = `Takes ${se.value} dmg/turn`;
            else if (se.effectType === 'stat_mod') tooltip = `Modifies ${se.stat?.toUpperCase()}: ${se.value! > 0 ? '+' : ''}${se.value}`;

            return (
              <div key={se.id} className="flex items-center gap-1 bg-tertiary/10 border border-tertiary/20 text-tertiary px-2 py-0.5 rounded text-xs font-medium" title={tooltip}>
                <span>{se.name} {se.duration > 0 ? `(${se.duration}T)` : '(∞)'}</span>
                {role === "GM" && (
                  <button onClick={() => combatStore.removeStatusEffect(c.id, se.id)} className="text-tertiary/50 hover:text-error ml-1"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            );
          })}
          {role === "GM" && (
            <div className="relative">
              <button 
                onClick={() => setShowStatusForm(!showStatusForm)}
                className="bg-transparent border border-dashed border-outline-variant/30 hover:border-primary rounded px-2 py-0.5 text-[10px] text-on-surface-variant focus:outline-none transition-colors"
              >
                + Add Effect
              </button>
              
              <AnimatePresence>
                {showStatusForm && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 mt-1 z-10 bg-surface-container-high border border-outline-variant/20 p-3 rounded-lg shadow-xl w-64 text-xs flex flex-col gap-3"
                  >
                    <div>
                      <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Effect Name</label>
                      <input type="text" placeholder="e.g. Poison, Stun" value={newStatusName} onChange={e=>setNewStatusName(e.target.value)} className="bg-surface-container-lowest px-2 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary" />
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Type</label>
                        <select value={newStatusType} onChange={e=>setNewStatusType(e.target.value as any)} className="bg-surface-container-lowest px-1 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary">
                          <option value="none">Label Only</option>
                          <option value="damage">HP Dmg / Turn</option>
                          <option value="stat_mod">Stat Modifier</option>
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Duration</label>
                        <input type="number" placeholder="Turns" value={newStatusDuration} onChange={e=>setNewStatusDuration(e.target.value)} className="bg-surface-container-lowest px-2 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary" title="Turns (-1 for infinite)" />
                      </div>
                    </div>

                    {newStatusType !== 'none' && (
                       <div className="flex flex-col gap-2">
                         {newStatusType === 'damage' ? (
                           <div className="flex-1">
                             <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Damage/turn</label>
                             <input type="number" placeholder="e.g. 5" value={newStatusDamage} onChange={e=>setNewStatusDamage(e.target.value)} className="bg-surface-container-lowest px-2 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary" />
                           </div>
                         ) : (
                           <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                             {newStatusModifiers.map((mod, idx) => (
                               <div key={idx} className="flex gap-2 items-end">
                                 <div className="flex-1">
                                   {idx === 0 && <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Stat</label>}
                                   <select value={mod.stat} onChange={e=>{
                                     const newMods = [...newStatusModifiers];
                                     newMods[idx].stat = e.target.value as any;
                                     setNewStatusModifiers(newMods);
                                   }} className="bg-surface-container-lowest px-1 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary">
                                     <option value="hp">Current HP</option>
                                     <option value="maxHp">Max HP</option>
                                     <option value="ac">Armor (AC)</option>
                                     <option value="atk">Attack (ATK)</option>
                                     <option value="initiative">Initiative</option>
                                   </select>
                                 </div>
                                 <div className="w-16">
                                   {idx === 0 && <label className="text-[10px] uppercase tracking-wider mb-1 block text-on-surface-variant">Bonus</label>}
                                   <input type="number" placeholder="+/-" value={mod.value} onChange={e=>{
                                     const newMods = [...newStatusModifiers];
                                     newMods[idx].value = e.target.value;
                                     setNewStatusModifiers(newMods);
                                   }} className="bg-surface-container-lowest px-2 py-1.5 rounded w-full border border-outline-variant/20 focus:outline-none focus:border-primary" />
                                 </div>
                                 <button onClick={() => setNewStatusModifiers(newStatusModifiers.filter((_, i) => i !== idx))} disabled={newStatusModifiers.length === 1} className="p-1.5 mb-0.5 rounded text-on-surface-variant hover:bg-error/10 hover:text-error disabled:opacity-50">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             ))}
                             <button onClick={() => setNewStatusModifiers([...newStatusModifiers, {stat: 'hp', value: '0'}])} className="w-full text-center py-1 text-[10px] font-bold text-primary hover:bg-primary/10 rounded border border-dashed border-primary/30">
                               + Add Stat
                             </button>
                           </div>
                         )}
                       </div>
                    )}
                    
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => {
                        if (newStatusName.trim()) {
                          combatStore.addStatusEffect(c.id, {
                            name: newStatusName.trim(),
                            duration: parseInt(newStatusDuration) || -1,
                            effectType: newStatusType,
                            value: newStatusType === 'damage' ? parseInt(newStatusDamage) || 0 : undefined,
                            modifiers: newStatusType === 'stat_mod' ? newStatusModifiers.map(m => ({ stat: m.stat, value: parseInt(m.value) || 0 })) : undefined
                          });
                          setShowStatusForm(false);
                          setNewStatusName("");
                        }
                      }} className="bg-primary/20 text-primary font-bold px-2 py-1.5 rounded flex-1 hover:bg-primary/30">Add</button>
                      <button onClick={() => setShowStatusForm(false)} className="bg-outline-variant/20 px-2 py-1.5 rounded hover:bg-outline-variant/30">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Skills */}
      {c.skills && c.skills.length > 0 && (
        <div className="pt-2 border-t border-outline-variant/10">
          <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Skills & Abilities
          </div>
          <div className="space-y-1.5">
            {c.skills.map(sk => (
              <div key={sk.id} className="bg-surface-container-lowest border border-outline-variant/10 rounded p-1.5">
                <div className="text-xs font-bold text-on-surface">{sk.name}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{sk.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function CombatArenaPage() {
  const combatStore = useCombatStore();
  const charStore = useCharacterStore();
  const { user } = useAuthStore();
  const role = user?.displayName?.split("|")[0] || "Player";
  const [showAddModal, setShowAddModal] = useState(false);

  // New monster state
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom");
  const [newName, setNewName] = useState("");
  const [newInit, setNewInit] = useState("");
  const [newHp, setNewHp] = useState("");
  const [newAc, setNewAc] = useState("");
  const [newAtk, setNewAtk] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");

  const handleStartCombat = () => {
    // Import all characters from party as combatants if they aren't already in
    const existingIds = new Set(combatStore.combatants.map(c => c.characterId));
    const toAdd = charStore.characters.filter(c => !existingIds.has(c.id));
    
    const newCombatants = toAdd.map((c) => {
      const atkStat = c.stats.find(s => s.id === "atk" || s.name.toLowerCase() === "atk" || s.id === "str" || s.name.toLowerCase() === "str");
      const atkValue = atkStat ? atkStat.baseValue + atkStat.bonusValue : 10;
      
      const effectiveMaxHp = getCharacterMaxHp(c);
      const effectiveAc = getCharacterAC(c);
      const effectiveInit = getCharacterInitiative(c);

      return {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        characterId: c.id,
        name: c.name,
        initiative: effectiveInit,
        baseInitiative: effectiveInit,
        hp: c.hp, // Current HP
        maxHp: effectiveMaxHp,
        ac: effectiveAc,
        atk: atkValue,
        isEnemy: false,
        hasActed: false,
        statusEffects: c.statusEffects.map(se => ({ 
          id: se.id, 
          name: se.name, 
          duration: se.remainingTurns || -1,
          effectType: 'none' as 'none'
        })),
        skills: c.specialSkills.map(sk => ({ id: sk.id, name: sk.name, description: sk.description }))
      };
    });

    combatStore.startCombat([...combatStore.combatants, ...newCombatants]);
  };

  const loadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === "custom") {
      setNewName(""); setNewHp(""); setNewAc(""); setNewAtk(""); setNewInit("");
      setNewSkillName(""); setNewSkillDesc("");
    } else {
      const p = combatStore.monsterPresets.find(x => x.id === presetId);
      if (p) {
        setNewName(p.name);
        setNewHp(p.hp.toString());
        setNewAc(p.ac.toString());
        setNewAtk(p.atk.toString());
        setNewInit(p.initiative.toString());
        if (p.skills && p.skills.length > 0) {
          setNewSkillName(p.skills[0].name);
          setNewSkillDesc(p.skills[0].description);
        } else {
          setNewSkillName(""); setNewSkillDesc("");
        }
      }
    }
  };

  const handleAddMonster = () => {
    if (!newName) return;
    
    const skills = [];
    if (newSkillName.trim()) {
      skills.push({ id: `sk-${Date.now()}`, name: newSkillName.trim(), description: newSkillDesc.trim() });
    }

    combatStore.addCombatant({
      characterId: null,
      name: newName,
      initiative: parseInt(newInit) || 0,
      baseInitiative: parseInt(newInit) || 0,
      hp: parseInt(newHp) || 10,
      maxHp: parseInt(newHp) || 10,
      ac: parseInt(newAc) || 0,
      atk: parseInt(newAtk) || 10,
      isEnemy: true,
      hasActed: false,
      statusEffects: [],
      skills: skills
    });

    // Reset
    loadPreset("custom");
    setShowAddModal(false);
  };

  const handleSavePreset = () => {
    if (!newName) return;
    const skills = [];
    if (newSkillName.trim()) {
      skills.push({ id: `sk-${Date.now()}`, name: newSkillName.trim(), description: newSkillDesc.trim() });
    }
    
    combatStore.saveMonsterPreset({
      name: newName,
      hp: parseInt(newHp) || 10,
      ac: parseInt(newAc) || 0,
      atk: parseInt(newAtk) || 10,
      initiative: parseInt(newInit) || 0,
      skills: skills
    });
  };

  const enemies = combatStore.combatants.filter(c => c.isEnemy);
  const players = combatStore.isActive || combatStore.combatants.some(c => !c.isEnemy)
    ? combatStore.combatants.filter(c => !c.isEnemy)
    : charStore.characters.map(c => {
        const atkStat = c.stats.find(s => s.id === "atk" || s.name.toLowerCase() === "atk" || s.id === "str" || s.name.toLowerCase() === "str");
        const atkValue = atkStat ? atkStat.baseValue + atkStat.bonusValue : 10;
        return {
          id: `preview-${c.id}`,
          characterId: c.id,
          name: c.name,
          initiative: getCharacterInitiative(c),
          baseInitiative: getCharacterInitiative(c),
          hp: c.hp,
          maxHp: getCharacterMaxHp(c),
          ac: getCharacterAC(c),
          atk: atkValue,
          isEnemy: false,
          hasActed: false,
          statusEffects: [],
          skills: []
        } as Combatant;
      });

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      {/* Header & Controls */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="font-serif text-3xl font-bold text-on-surface flex items-center gap-3">
            <Swords className="w-8 h-8 text-error" />
            Turn
            <span className="text-error arcane-text-glow"> Manager</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {combatStore.isActive 
              ? <span className="text-tertiary font-bold animate-pulse">Round {combatStore.round} is active</span>
              : "Combat is waiting to start..."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role === "GM" && (
            <>
              <button
                onClick={() => setShowAddModal(!showAddModal)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface hover:bg-outline-variant/30 text-sm font-bold transition-colors"
              >
                {showAddModal ? <Square className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {showAddModal ? "Cancel" : "Add Enemy"}
              </button>
              
              <button
                onClick={combatStore.rollInitiativeAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary hover:bg-secondary/20 text-sm font-bold transition-colors"
              >
                <Dices className="w-4 h-4" /> Roll All Init
              </button>

              {!combatStore.isActive ? (
                <button
                  onClick={handleStartCombat}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 shadow-lg text-sm font-bold transition-all"
                >
                  <Play className="w-4 h-4 fill-current" /> Start Combat
                </button>
              ) : (
                <>
                  <button
                    onClick={combatStore.endCombat}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-error hover:bg-error/10 text-sm font-bold transition-colors"
                  >
                    <Square className="w-4 h-4 fill-current" /> End Combat
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Add Monster Modal (Inline) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-surface-container/30 border border-outline-variant/20 rounded-xl p-5 arcane-glass">
              
              <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-outline-variant/10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Add Custom Enemy</h3>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-on-surface-variant" />
                  <select
                    value={selectedPresetId}
                    onChange={(e) => loadPreset(e.target.value)}
                    className="bg-surface-container-highest border border-outline-variant/20 rounded px-2 py-1 text-sm focus:outline-none"
                  >
                    <option value="custom">-- Create Custom --</option>
                    {combatStore.monsterPresets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-on-surface-variant block mb-1">Name</label>
                  <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">HP</label>
                  <input type="number" value={newHp} onChange={e=>setNewHp(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono" />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">AC</label>
                  <input type="number" value={newAc} onChange={e=>setNewAc(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono" />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">ATK (Dmg)</label>
                  <input type="number" value={newAtk} onChange={e=>setNewAtk(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Base Init</label>
                  <input type="number" value={newInit} onChange={e=>setNewInit(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary font-mono" />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Skill Name</label>
                  <input type="text" value={newSkillName} onChange={e=>setNewSkillName(e.target.value)} placeholder="e.g. Cleave" className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-on-surface-variant block mb-1">Skill Description</label>
                  <input type="text" value={newSkillDesc} onChange={e=>setNewSkillDesc(e.target.value)} placeholder="Deals damage to 2 targets..." className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <button onClick={handleAddMonster} disabled={!newName} className="px-6 py-2 bg-error/20 text-error hover:bg-error/30 rounded font-bold transition-colors disabled:opacity-50">
                  Add to Combat
                </button>
                {selectedPresetId === "custom" && newName && (
                  <button onClick={handleSavePreset} className="px-4 py-2 bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded font-bold flex items-center gap-2 transition-colors">
                    <Save className="w-4 h-4" /> Save as Preset
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Enemies vs Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Enemies Box */}
        <div className="bg-surface-container/20 rounded-2xl border border-error/20 p-5 arcane-glass">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-error/20">
            <Skull className="w-6 h-6 text-error" />
            <h2 className="font-serif text-2xl font-bold text-error">Enemies</h2>
            <div className="ml-auto bg-error/10 text-error text-xs font-bold px-2 py-1 rounded-full">{enemies.length} Units</div>
          </div>
          
          <div className="space-y-4">
            {enemies.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant/40 italic">No enemies added. Click "Add Enemy" above.</div>
            )}
            <AnimatePresence>
              {enemies.map(c => <CombatantCard key={c.id} c={c} />)}
            </AnimatePresence>
          </div>
        </div>

        {/* Players Box */}
        <div className="bg-surface-container/20 rounded-2xl border border-primary/20 p-5 arcane-glass">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-primary/20">
            <User className="w-6 h-6 text-primary" />
            <h2 className="font-serif text-2xl font-bold text-primary">Players</h2>
            <div className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{players.length} Heroes</div>
          </div>
          
          <div className="space-y-4">
             {players.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant/40 italic">No players in combat. Start combat to load party.</div>
            )}
            <AnimatePresence>
              {players.map(c => <CombatantCard key={c.id} c={c} />)}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Section: Damage Calculator & Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
           {role === "GM" ? (
             <DamageCalculator />
           ) : (
             <div className="rounded-xl bg-surface-container/30 border border-outline-variant/10 p-5 h-full arcane-glass flex items-center justify-center">
               <p className="text-on-surface-variant italic">Waiting for GM actions...</p>
             </div>
           )}
        </div>

        <div className="lg:col-span-5 xl:col-span-4 rounded-xl bg-surface-container/30 border border-outline-variant/10 p-5 arcane-glass">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-tertiary" />
            <h3 className="font-serif font-bold text-on-surface">Degrees of Success</h3>
          </div>
          <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
            <p>d100 roll to determine degree of success. Armor Class (AC) acts as <strong>Damage Reduction</strong>.</p>
            <div className="space-y-2">
              <div className="bg-error/5 border border-error/10 rounded-lg p-2.5">
                <div className="text-error font-bold text-xs">0 - 29 (Blunder)</div>
                <p className="text-[10px]">Miss & backfire. You or an ally take damage.</p>
              </div>
              <div className="bg-surface-container-high border border-outline-variant/10 rounded-lg p-2.5">
                <div className="text-on-surface font-bold text-xs">30 - 50 (Miss)</div>
                <p className="text-[10px]">Standard miss. No damage dealt.</p>
              </div>
              <div className="bg-tertiary/5 border border-tertiary/10 rounded-lg p-2.5">
                <div className="text-tertiary font-bold text-xs">51 - 100 (Hit)</div>
                <p className="text-[10px]">Multiplier 1x up to 2x (at 100). Final damage is reduced by target's AC.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
