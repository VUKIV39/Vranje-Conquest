


















import React, { useState, useEffect } from 'react';
import { INITIAL_COUNTRIES, INITIAL_TERRITORIES, NATIONAL_FOCUSES, VUKAN_LEADER } from './constants';
import { 
  GameState, Country, Territory, UnitType, BuildingType, Animation,
  COSTS, BUILDING_COSTS, BUILDING_INCOME, RelationStatus, ChatMessage 
} from './types';
import MapCanvas from './components/MapCanvas';
import DiplomacyChat from './components/DiplomacyChat';
import { audio } from './services/audioService';
import { 
  Play, Save, FolderOpen, LogOut, 
  Coins, Sword, Shield, 
  Target, MessageCircle, Hammer, Move, Zap, AlertTriangle, Trophy,
  Activity, TrendingUp, MapPin, Info, ArrowLeft, BookOpen, Check, Lock, Clock, Crown,
  Volume2, VolumeX
} from 'lucide-react';

const SAVE_KEY = 'vranje_conquest_save_v2_1';
const ANIMATION_DURATION = 1000;

export default function App() {
  const [inMenu, setInMenu] = useState(true);
  const [showNationSelect, setShowNationSelect] = useState(false);
  const [showFocusTree, setShowFocusTree] = useState(false);
  const [showGovernment, setShowGovernment] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [victory, setVictory] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // -- Game Actions --

  const toggleMute = () => {
      const muted = !audio.toggleMute();
      setIsMuted(muted);
  };

  const startGame = () => {
    audio.playClick();
    setShowNationSelect(true);
  };

  const initializeGame = (selectedCountryId: string) => {
    audio.playClick();
    audio.init(); // Ensure audio context is ready
    
    // Deep Copy Configs
    const startCountries = JSON.parse(JSON.stringify(INITIAL_COUNTRIES)).map((c: Country) => {
        if (c.id === selectedCountryId) {
            return { ...c, isPlayer: true, relation: RelationStatus.PEACE };
        }
        return { ...c, isPlayer: false, relation: RelationStatus.PEACE }; // Reset all relations to peace initially
    });

    const startTerritories = JSON.parse(JSON.stringify(INITIAL_TERRITORIES));

    setGameState({
      turn: 1,
      countries: startCountries,
      territories: startTerritories,
      selectedCountryId: null,
      selectedTerritoryId: null,
      movingFromTerritoryId: null,
      logs: ["Game Started. Good luck, Commander!"],
      animations: [],
    });
    setInMenu(false);
    setShowNationSelect(false);
    setVictory(false);
  };

  const loadGame = () => {
    audio.playClick();
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure animations array exists for legacy saves
      if (!parsed.animations) parsed.animations = [];
      setGameState(parsed);
      setInMenu(false);
      setVictory(false);
    } else {
      audio.playError();
      alert("No saved game found!");
    }
  };

  const exitGame = () => {
    audio.playClick();
    setInMenu(true);
    setGameState(null);
  };

  // Check Victory Condition
  useEffect(() => {
    if (gameState && !inMenu) {
        const player = gameState.countries.find(c => c.isPlayer);
        if (player) {
            const allPlayerOwned = gameState.territories.every(t => t.ownerId === player.id);
            if (allPlayerOwned && !victory) {
                setVictory(true);
                audio.playVictory();
            }
        }
    }
  }, [gameState, inMenu, victory]);

  // -- Turn Logic --

  const handleEndTurn = () => {
    audio.playClick();
    if (!gameState) return;

    setGameState(prev => {
        if (!prev) return null;
        let nextState = { ...prev };
        nextState.turn += 1;

        // 0. Calculate Global Stability for Player
        // Stability = 100 - (Active Wars * 15).
        const playerWars = prev.countries.filter(c => c.relation === RelationStatus.WAR).length;
        const playerStability = Math.max(0, 100 - (playerWars * 15));

        // 1. Process Economy, Units, and Prosperity for each Country/Territory
        nextState.countries = nextState.countries.map(country => {
            if (country.isDead) return country;

            // Update Country Stability
            // AI stability is simplified (random flux or high base)
            let currentStability = country.isPlayer ? playerStability : (country.stability + (Math.random() > 0.5 ? 2 : -2));
            currentStability = Math.min(100, Math.max(0, currentStability));

            // NATIONAL FOCUS PROGRESS
            if (country.activeFocus) {
                country.activeFocus.progress += 1;
                const focusDef = NATIONAL_FOCUSES.find(f => f.id === country.activeFocus!.focusId);
                
                if (focusDef && country.activeFocus.progress >= focusDef.turnsRequired) {
                    // Focus Completed
                    country.completedFocusIds.push(focusDef.id);
                    country.activeFocus = null;
                    
                    if (country.isPlayer) {
                        nextState.logs.unshift(`FOCUS COMPLETED: ${focusDef.name}`);
                        audio.playEvent();
                    }

                    // Apply Rewards
                    country.money += focusDef.rewardMoney;
                    if (focusDef.rewardIncome) {
                        country.income += focusDef.rewardIncome;
                    }
                    if (focusDef.rewardModifier) {
                        country.modifiers.push({
                            ...focusDef.rewardModifier,
                            id: `${focusDef.id}_${Date.now()}` // Unique ID
                        });
                    }
                }
            }


            const ownedTerritories = nextState.territories.filter(t => t.ownerId === country.id);
            let totalIncome = country.income; // Base
            let totalUpkeep = 0;

            ownedTerritories.forEach(t => {
                // Update Prosperity
                // Growth factors: Road (+2), Market (+1), Stability Bonus
                let growth = 0;
                if (t.buildings[BuildingType.ROAD] > 0) growth += 2;
                if (t.buildings[BuildingType.MARKET] > 0) growth += 1;
                
                if (currentStability > 80) growth += 2;
                else if (currentStability < 40) growth -= 2;

                // Apply growth
                t.prosperity = Math.min(100, Math.max(0, t.prosperity + growth));

                // Calculate Building Income (Modified by Prosperity)
                const prosperityMult = t.prosperity / 50; // 50 is baseline (1x). 100 is 2x.

                let landIncome = 0;
                landIncome += (t.buildings[BuildingType.MARKET] || 0) * BUILDING_INCOME[BuildingType.MARKET];
                landIncome += (t.buildings[BuildingType.MINE] || 0) * BUILDING_INCOME[BuildingType.MINE];
                landIncome += (t.buildings[BuildingType.FARM] || 0) * BUILDING_INCOME[BuildingType.FARM];
                
                totalIncome += (landIncome * prosperityMult);
                
                // Unit Upkeep
                totalUpkeep += (t.units[UnitType.INFANTRY] || 0) * COSTS[UnitType.INFANTRY].upkeep;
                totalUpkeep += (t.units[UnitType.ARTILLERY] || 0) * COSTS[UnitType.ARTILLERY].upkeep;
                totalUpkeep += (t.units[UnitType.TANK] || 0) * COSTS[UnitType.TANK].upkeep;
                totalUpkeep += (t.units[UnitType.BOMBER] || 0) * COSTS[UnitType.BOMBER].upkeep;
            });

            // Modifiers
            country.modifiers.forEach(mod => {
                if (mod.type === 'INCOME') totalIncome += mod.value;
            });
            // Decrement modifiers
            country.modifiers = country.modifiers
                .map(m => ({...m, duration: m.duration - 1}))
                .filter(m => m.duration > 0);
            
            // Stability Income Multiplier
            // High stability (100) = 1.0x efficiency. Low stability (0) = 0.5x efficiency.
            const stabilityIncomeMult = 0.5 + (currentStability / 200);
            totalIncome = totalIncome * stabilityIncomeMult;

            let newMoney = country.money + totalIncome - totalUpkeep;

            // AI Logic: Recruit if rich
            if (!country.isPlayer && newMoney > 1000) {
               if (ownedTerritories.length > 0) {
                   const randomTerritory = ownedTerritories[Math.floor(Math.random() * ownedTerritories.length)];
                   randomTerritory.units[UnitType.INFANTRY] += 1;
                   newMoney -= COSTS[UnitType.INFANTRY].cost;
               }
            }

            return { ...country, money: Math.max(0, newMoney), stability: currentStability };
        });

        // 2. AI AGGRESSION (AI vs AI and AI vs Player)
        const activeAiCountries = nextState.countries.filter(c => !c.isPlayer && !c.isDead && c.aggression > 0.1);
        
        // Shuffle to random order
        activeAiCountries.sort(() => Math.random() - 0.5);

        activeAiCountries.forEach(ai => {
            // Chance to attack based on aggression
            if (Math.random() > ai.aggression) return; 

            // Find all border territories
            const myTerritories = nextState.territories.filter(t => t.ownerId === ai.id);
            if (myTerritories.length === 0) return;

            // Get random source
            const source = myTerritories[Math.floor(Math.random() * myTerritories.length)];
            
            // Find hostile neighbors
            const validTargets = source.neighbors
                .map(nid => nextState.territories.find(t => t.id === nid))
                .filter(t => t && t.ownerId !== ai.id) as Territory[];

            if (validTargets.length > 0) {
                const target = validTargets[Math.floor(Math.random() * validTargets.length)];
                
                // Check strength
                const myStr = (source.units.INFANTRY * 1) + (source.units.TANK * 5);
                const targetStr = (target.units.INFANTRY * 1) + (target.units.TANK * 5) + (target.buildings.BUNKER * 20);

                // AI only attacks if it thinks it can win (or is crazy aggressive)
                if (myStr > targetStr * 0.8) {
                    // RESOLVE COMBAT (Simplified version of player combat)
                    const ownerC = nextState.countries.find(c => c.id === target.ownerId);
                    
                    if (myStr > targetStr * (0.9 + Math.random() * 0.2)) {
                        // AI Wins
                        target.ownerId = ai.id;
                        target.units = { ...target.units, INFANTRY: Math.max(0, Math.floor(source.units.INFANTRY * 0.5)), TANK: source.units.TANK };
                        source.units = { ...source.units, INFANTRY: 0, TANK: 0 };
                        target.buildings[BuildingType.BUNKER] = 0;
                        
                        // Log only if player is involved or nearby (simplified: always log for liveliness)
                        if (ownerC?.isPlayer) {
                             nextState.logs.unshift(`WARNING: ${ai.name} conquered your territory ${target.name}!`);
                             // Force war status
                             ai.relation = RelationStatus.WAR; 
                             audio.playCombat(); // Sound when player loses land
                        } else {
                             nextState.logs.unshift(`NEWS: ${ai.name} conquered ${target.name} from ${ownerC?.name}`);
                        }
                    } else {
                        // AI Loses
                        source.units = { ...source.units, INFANTRY: Math.floor(source.units.INFANTRY * 0.2), TANK: 0 };
                         if (ownerC?.isPlayer) {
                             nextState.logs.unshift(`DEFENSE: We repelled an attack from ${ai.name} on ${target.name}!`);
                             ai.relation = RelationStatus.WAR;
                             audio.playCombat(); // Sound when player defends
                         }
                    }
                }
            }
        });


        // 3. Random Events (Expanded probability to 20%)
        if (Math.random() < 0.20) { 
            const eventType = Math.random();
            const player = nextState.countries.find(c => c.isPlayer)!;
            
            // VUKAN EVENT (Unique, Vranje Only, Once Only)
            if (eventType < 0.30 && player.id === 'c_vranje' && !player.hasVukanEventFired) {
                 nextState.logs.unshift("EVENT: 👑 Vukan Takes Over! Vranje is now under the Supreme Commander!");
                 audio.playEvent();
                 const playerRef = nextState.countries.find(c => c.id === 'c_vranje')!;
                 playerRef.leader = VUKAN_LEADER;
                 playerRef.hasVukanEventFired = true;
                 playerRef.modifiers.push({
                    id: Date.now().toString(),
                    name: "Vukan's Efficiency",
                    description: "Administrative efficiency boosts income",
                    type: 'INCOME',
                    value: 200,
                    duration: 10
                });
            } else if (eventType < 0.45) {
                nextState.logs.unshift("EVENT: ⚠️ Mine Collapse! Income reduced temporarily.");
                audio.playError();
                player.modifiers.push({
                    id: Date.now().toString(),
                    name: "Mine Collapse",
                    description: "Safety inspections needed",
                    type: 'INCOME',
                    value: -100,
                    duration: 3
                });
            } else if (eventType < 0.60) {
                    nextState.logs.unshift("EVENT: 🤝 International Aid! (+500 Gold)");
                    audio.playCash();
                    player.money += 500;
            } else if (eventType < 0.75) {
                    nextState.logs.unshift("EVENT: 🌾 Bumper Harvest! Food exports surge. (+300 Gold)");
                    audio.playCash();
                    player.money += 300;
            } else if (eventType < 0.90) { 
                    nextState.logs.unshift("EVENT: 🎖️ Grand Military Parade! Stability increases.");
                    audio.playEvent();
                    player.stability = Math.min(100, player.stability + 15);
            } else { 
                    nextState.logs.unshift("EVENT: 📉 Corruption Scandal! Money lost and stability shaken.");
                    audio.playError();
                    player.money = Math.max(0, player.money - 300);
                    player.stability = Math.max(0, player.stability - 10);
            }
        }
        
        // Auto-save
        localStorage.setItem(SAVE_KEY, JSON.stringify(nextState));

        return nextState;
    });
  };

  // -- Interactions --

  const handleMapClick = (territoryId: string) => {
    if (!gameState) return;
    
    // Select sound
    audio.playClick();

    if (gameState.movingFromTerritoryId) {
        const fromT = gameState.territories.find(t => t.id === gameState.movingFromTerritoryId);
        const toT = gameState.territories.find(t => t.id === territoryId);

        if (fromT && toT) {
            const isNeighbor = fromT.neighbors.includes(toT.id);
            if (isNeighbor) {
                triggerMove(fromT.id, toT.id, toT.ownerId === fromT.ownerId ? 'MOVE' : 'ATTACK');
                setGameState(prev => prev ? { ...prev, movingFromTerritoryId: null } : null);
                return;
            }
        }
        setGameState(prev => prev ? { ...prev, movingFromTerritoryId: null } : null);
        return;
    }

    setGameState(prev => prev ? { ...prev, selectedTerritoryId: territoryId } : null);
  };

  const triggerMove = (fromId: string, toId: string, type: 'MOVE' | 'ATTACK') => {
      audio.playMove(); // Play move sound immediately
      // 1. Set Animation
      setGameState(prev => {
          if (!prev) return null;
          const anim: Animation = {
              id: Date.now(),
              fromId,
              toId,
              type,
              startTime: Date.now(),
              duration: ANIMATION_DURATION
          };
          return { ...prev, animations: [...prev.animations, anim] };
      });

      // 2. Schedule Logic Execution
      setTimeout(() => {
          setGameState(prev => {
              if (!prev) return null;
              // Remove animation
              const remainingAnims = prev.animations.filter(a => a.fromId !== fromId);
              
              // Execute Logic
              let newState = { ...prev, animations: remainingAnims };
              if (type === 'MOVE') {
                  newState = moveUnits(newState, fromId, toId);
              } else {
                  newState = attackTerritory(newState, fromId, toId);
              }
              return newState;
          });
      }, ANIMATION_DURATION);
  };

  const moveUnits = (state: GameState, fromId: string, toId: string): GameState => {
      const newTerritories = state.territories.map(t => {
         if (t.id === fromId) return { 
             ...t, 
             units: { [UnitType.INFANTRY]: 0, [UnitType.ARTILLERY]: 0, [UnitType.TANK]: 0, [UnitType.BOMBER]: 0 } 
         };
         if (t.id === toId) {
             const source = state.territories.find(x => x.id === fromId)!;
             return {
                 ...t,
                 units: {
                     [UnitType.INFANTRY]: t.units[UnitType.INFANTRY] + source.units[UnitType.INFANTRY],
                     [UnitType.ARTILLERY]: t.units[UnitType.ARTILLERY] + source.units[UnitType.ARTILLERY],
                     [UnitType.TANK]: t.units[UnitType.TANK] + source.units[UnitType.TANK],
                     [UnitType.BOMBER]: t.units[UnitType.BOMBER] + source.units[UnitType.BOMBER],
                 }
             };
         }
         return t;
      });
      return { ...state, territories: newTerritories, logs: [`Army moved from ${fromId} to ${toId}`, ...state.logs] };
  };

  const attackTerritory = (state: GameState, fromId: string, toId: string): GameState => {
      audio.playCombat(); // Play explosion/combat sound on logic resolution

      const attackerT = state.territories.find(t => t.id === fromId)!;
      const defenderT = state.territories.find(t => t.id === toId)!;
      const attackerC = state.countries.find(c => c.id === attackerT.ownerId)!;
      const defenderC = state.countries.find(c => c.id === defenderT.ownerId)!;
      
      // Calculate tank bonus for Vukan
      const tankBonus = attackerC.leader.name === 'Vukan' ? 1.15 : 1.0;

      const attScore = (attackerT.units.INFANTRY * 1) + (attackerT.units.ARTILLERY * 3) + (attackerT.units.TANK * 5 * tankBonus) + (attackerT.units.BOMBER * 10);
      const defScore = (defenderT.units.INFANTRY * 1) + (defenderT.units.ARTILLERY * 2) + (defenderT.units.TANK * 5) + (defenderT.units.BOMBER * 3)
                       + (defenderT.buildings.BUNKER * 20) + (defenderT.buildings.BARRACKS * 5) + (defenderT.buildings.ROAD * 5); // Roads add defense

      // Stability acts as Morale Modifier
      // 100 Stability = 1.0 (Full Strength). 0 Stability = 0.5 (Half Strength).
      const attMorale = 0.5 + (attackerC.stability / 200);
      const defMorale = 0.5 + (defenderC.stability / 200);

      // Random Factor (0.8 to 1.2)
      const rollAtt = attScore * attMorale * (0.8 + Math.random() * 0.4);
      const rollDef = defScore * defMorale * (0.8 + Math.random() * 0.4);

      if (rollAtt > rollDef) {
         // Conquer
         const newTerritories = state.territories.map(t => {
             if (t.id === fromId) return { 
                 ...t, 
                 units: { [UnitType.INFANTRY]: 0, [UnitType.ARTILLERY]: 0, [UnitType.TANK]: 0, [UnitType.BOMBER]: 0 } 
             };
             if (t.id === toId) return { 
                 ...t, 
                 ownerId: attackerT.ownerId,
                 // Prosperity takes a hit on conquest
                 prosperity: Math.max(0, t.prosperity - 20),
                 units: { 
                     [UnitType.INFANTRY]: Math.max(0, Math.floor(attackerT.units.INFANTRY * 0.6)),
                     [UnitType.ARTILLERY]: Math.max(0, Math.floor(attackerT.units.ARTILLERY * 0.8)),
                     [UnitType.TANK]: attackerT.units.TANK,
                     [UnitType.BOMBER]: Math.max(0, Math.floor(attackerT.units.BOMBER * 0.9)), // Bombers survive easier
                 },
                 buildings: { ...t.buildings, [BuildingType.BUNKER]: 0 } 
             };
             return t;
         });
         return { ...state, territories: newTerritories, logs: [`VICTORY! Conquered ${defenderT.name}!`, ...state.logs] };
      } else {
         // Defeat - Attacker army destroyed
         const newTerritories = state.territories.map(t => {
             if (t.id === fromId) return { 
                 ...t, 
                 units: { [UnitType.INFANTRY]: 0, [UnitType.ARTILLERY]: 0, [UnitType.TANK]: 0, [UnitType.BOMBER]: 0 } 
             };
             return t;
         });
         return { ...state, territories: newTerritories, logs: [`DEFEAT! Attack on ${defenderT.name} failed!`, ...state.logs] };
      }
  };

  const sendUltimatum = (targetCountryId: string) => {
    audio.playClick();
    setGameState(prev => {
        if (!prev) return null;
        
        const player = prev.countries.find(c => c.isPlayer)!;
        const target = prev.countries.find(c => c.id === targetCountryId)!;
        
        // Calculate total strengths
        const playerStr = prev.territories.filter(t => t.ownerId === player.id).reduce((sum, t) => sum + t.units.INFANTRY + t.units.TANK*5 + t.units.BOMBER*10, 0);
        const targetStr = prev.territories.filter(t => t.ownerId === target.id).reduce((sum, t) => sum + t.units.INFANTRY + t.units.TANK*5 + t.units.BOMBER*10, 0);
        
        const ratio = playerStr / (targetStr || 1);
        const chance = ratio > 5 ? 0.1 : 0.01; // Very low chance even if powerful

        if (Math.random() < chance) {
            // Success - Annex ALL their territories
            audio.playVictory();
            const newTerritories = prev.territories.map(t => t.ownerId === target.id ? { ...t, ownerId: player.id } : t);
            return {
                ...prev,
                territories: newTerritories,
                logs: [`ULTIMATUM ACCEPTED! ${target.name} has surrendered all lands!`, ...prev.logs]
            };
        } else {
            // Fail - War
            audio.playError();
            const newCountries = prev.countries.map(c => c.id === target.id ? { ...c, relation: RelationStatus.WAR, aggression: 1 } : c);
            return {
                ...prev,
                countries: newCountries,
                logs: [`ULTIMATUM REJECTED! ${target.name} declares WAR!`, ...prev.logs]
            };
        }
    });
  };

  const recruitUnit = (type: UnitType) => {
    if (!gameState || !gameState.selectedTerritoryId) return;
    const player = gameState.countries.find(c => c.isPlayer);
    const territory = gameState.territories.find(t => t.id === gameState.selectedTerritoryId);
    
    if (!player || !territory || territory.ownerId !== player.id) return;

    const cost = COSTS[type].cost;
    if (player.money >= cost) {
      audio.playCash(); // Ching!
      setGameState(prev => {
        if (!prev) return null;
        const newCountries = prev.countries.map(c => c.id === player.id ? { ...c, money: c.money - cost } : c);
        const newTerritories = prev.territories.map(t => 
            t.id === territory.id 
            ? { ...t, units: { ...t.units, [type]: t.units[type] + 1 } }
            : t
        );
        return { ...prev, countries: newCountries, territories: newTerritories, logs: [`Recruited ${type} in ${territory.name}`, ...prev.logs.slice(0, 9)] };
      });
    } else {
        audio.playError();
    }
  };

  const constructBuilding = (type: BuildingType) => {
    if (!gameState || !gameState.selectedTerritoryId) return;
    const player = gameState.countries.find(c => c.isPlayer);
    const territory = gameState.territories.find(t => t.id === gameState.selectedTerritoryId);
    
    if (!player || !territory || territory.ownerId !== player.id) return;

    const cost = BUILDING_COSTS[type];
    if (player.money >= cost) {
      audio.playBuild(); // Thud!
      setGameState(prev => {
         if (!prev) return null;
         const newCountries = prev.countries.map(c => c.id === player.id ? { ...c, money: c.money - cost } : c);
         const newTerritories = prev.territories.map(t => 
             t.id === territory.id 
             ? { ...t, buildings: { ...t.buildings, [type]: t.buildings[type] + 1 } }
             : t
         );
         return { ...prev, countries: newCountries, territories: newTerritories, logs: [`Built ${type} in ${territory.name}`, ...prev.logs.slice(0, 9)] };
      });
    } else {
        audio.playError();
    }
  };

  // Focus Tree Actions
  const startFocus = (focusId: string) => {
      audio.playClick();
      setGameState(prev => {
          if (!prev) return null;
          const focus = NATIONAL_FOCUSES.find(f => f.id === focusId);
          if (!focus) return prev;

          const player = prev.countries.find(c => c.isPlayer)!;
          if (player.money < focus.cost) {
              audio.playError();
              alert("Not enough funds to start this focus!");
              return prev;
          }
          
          audio.playCash(); // Pay for focus

          const newCountries = prev.countries.map(c => {
              if (c.isPlayer) {
                  return {
                      ...c,
                      money: c.money - focus.cost,
                      activeFocus: { focusId: focus.id, progress: 0 }
                  };
              }
              return c;
          });

          return { ...prev, countries: newCountries };
      });
  };

  // -- Render Helpers --
  if (inMenu) {
    if (showNationSelect) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] bg-cover bg-center relative">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                <div className="z-10 w-full max-w-6xl p-8">
                    <button 
                        onClick={() => { audio.playClick(); setShowNationSelect(false); }}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} /> Back to Menu
                    </button>
                    <h1 className="text-4xl font-bold text-white mb-8 text-center text-vranje-gold uppercase tracking-widest">Select Your Nation</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {INITIAL_COUNTRIES.map(country => {
                            const territoryCount = INITIAL_TERRITORIES.filter(t => t.ownerId === country.id).length;
                            return (
                                <button 
                                    key={country.id}
                                    onClick={() => initializeGame(country.id)}
                                    className="bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-vranje-gold transition-all rounded-xl p-6 flex flex-col items-center gap-4 group"
                                >
                                    <span className="text-6xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{country.flag}</span>
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold text-white">{country.name}</h2>
                                        <div className="flex gap-4 justify-center mt-3 text-sm text-gray-400">
                                            <div className="flex items-center gap-1"><Coins size={14} className="text-yellow-500"/> ${country.money}</div>
                                            <div className="flex items-center gap-1"><TrendingUp size={14} className="text-green-500"/> +{country.income}</div>
                                            <div className="flex items-center gap-1"><MapPin size={14} className="text-blue-500"/> {territoryCount} Areas</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-vranje-gold opacity-0 group-hover:opacity-100 transition-opacity w-full"></div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] bg-cover bg-center relative">
        
        {/* Credits Button */}
        <button 
            onClick={() => { audio.playClick(); setShowCredits(true); }}
            className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-black/80 rounded-full text-gray-300 hover:text-white transition-colors backdrop-blur-sm border border-gray-600"
            title="Image Sources"
        >
            <Info size={24} />
        </button>

        {/* Credits Modal */}
        {showCredits && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-600 max-w-md text-center shadow-2xl">
                    <h3 className="text-2xl font-bold text-white mb-4">Asset Credits</h3>
                    <p className="text-gray-300 mb-6 leading-relaxed">
                        The background images used in this application are dynamically sourced from <a href="https://picsum.photos" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Picsum Photos</a>.
                    </p>
                    <div className="text-xs text-gray-500 mb-6 font-mono">
                        Source: https://picsum.photos/
                    </div>
                    <button 
                        onClick={() => { audio.playClick(); setShowCredits(false); }}
                        className="bg-vranje-gold hover:bg-yellow-600 text-black font-bold py-2 px-8 rounded-full transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}

        <div className="bg-black/80 backdrop-blur-md p-12 rounded-2xl border border-vranje-gold shadow-2xl flex flex-col gap-6 w-96">
          <h1 className="text-4xl font-bold text-vranje-gold text-center mb-4 tracking-widest uppercase" style={{textShadow: '0 0 10px rgba(212, 175, 55, 0.5)'}}>Vranje Conquest</h1>
          <button onClick={startGame} className="bg-vranje-red hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105">
            <Play size={24} /> NEW GAME
          </button>
          <button onClick={loadGame} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105">
            <FolderOpen size={24} /> LOAD GAME
          </button>
          <div className="text-xs text-center text-gray-500 mt-4">v1.6 - Audio Update</div>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const player = gameState.countries.find(c => c.isPlayer)!;
  const selectedTerritory = gameState.territories.find(t => t.id === gameState.selectedTerritoryId);
  const selectedCountry = selectedTerritory ? gameState.countries.find(c => c.id === selectedTerritory.ownerId) : null;
  
  const playerTerritories = gameState.territories.filter(t => t.ownerId === player.id);
  const playerPower = playerTerritories.reduce((acc, t) => 
     acc + t.units.INFANTRY * 10 + t.units.ARTILLERY * 30 + t.units.TANK * 60 + (t.units.BOMBER || 0) * 100, 0
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-game-dark overflow-hidden font-sans">
      {/* Victory Modal */}
      {victory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
              <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-10 rounded-2xl border-4 border-white shadow-2xl text-center flex flex-col items-center gap-6 animate-bounce-in">
                  <Trophy size={80} className="text-white drop-shadow-md" />
                  <h1 className="text-5xl font-extrabold text-white tracking-widest uppercase">Victory!</h1>
                  <p className="text-xl text-yellow-100 max-w-md">You have reunited Vranje under one flag! The region is finally at peace.</p>
                  <button onClick={exitGame} className="mt-4 bg-white text-yellow-900 font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-colors">
                      Return to Menu
                  </button>
              </div>
          </div>
      )}

      {/* Government Modal */}
      {showGovernment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
              <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-600 flex flex-col shadow-2xl animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-vranje-red/50 to-transparent pointer-events-none"></div>
                  
                  <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl relative z-10">
                      <div className="flex items-center gap-3">
                          <Crown size={24} className="text-vranje-gold"/>
                          <h2 className="text-2xl font-bold text-white tracking-wide">Government</h2>
                      </div>
                      <button onClick={() => { audio.playClick(); setShowGovernment(false); }} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                  </div>
                  
                  <div className="p-8 flex flex-col items-center text-center relative z-10">
                       <div className="w-32 h-32 bg-gray-800 rounded-full border-4 border-vranje-gold flex items-center justify-center text-6xl shadow-xl mb-4">
                           {player.leader.image}
                       </div>
                       <h3 className="text-3xl font-bold text-white mb-1">{player.leader.name}</h3>
                       <p className="text-vranje-gold uppercase tracking-widest font-bold text-xs mb-6">{player.leader.title}</p>
                       
                       <div className="w-full bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                           <h4 className="text-sm text-gray-400 uppercase font-bold mb-3 border-b border-gray-700 pb-2">Leader Bonuses</h4>
                           <div className="space-y-2">
                               {player.leader.bonuses.length > 0 ? player.leader.bonuses.map((bonus, i) => (
                                   <div key={i} className="text-green-400 font-mono text-sm flex items-center justify-center gap-2">
                                       <Zap size={12} /> {bonus}
                                   </div>
                               )) : (
                                   <div className="text-gray-500 text-sm italic">No active bonuses</div>
                               )}
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Focus Tree Modal */}
      {showFocusTree && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
              <div className="bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-gray-600 flex flex-col shadow-2xl">
                  <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                          <BookOpen size={24} className="text-vranje-gold"/>
                          <h2 className="text-2xl font-bold text-white tracking-wide">National Focus Tree</h2>
                      </div>
                      <button onClick={() => { audio.playClick(); setShowFocusTree(false); }} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/50">
                      {NATIONAL_FOCUSES.map(focus => {
                          const isCompleted = player.completedFocusIds.includes(focus.id);
                          const isActive = player.activeFocus?.focusId === focus.id;
                          const isLocked = player.activeFocus !== null && !isActive && !isCompleted;
                          
                          return (
                              <div key={focus.id} className={`relative p-6 rounded-xl border-2 transition-all ${
                                  isCompleted ? 'bg-green-900/20 border-green-600 opacity-70' :
                                  isActive ? 'bg-blue-900/30 border-blue-500 scale-105 shadow-xl shadow-blue-900/20' :
                                  isLocked ? 'bg-gray-800/50 border-gray-700 opacity-50 grayscale' :
                                  'bg-gray-800 border-gray-600 hover:border-vranje-gold hover:bg-gray-750'
                              }`}>
                                  <div className="flex justify-between items-start mb-4">
                                      <h3 className="text-xl font-bold text-white">{focus.name}</h3>
                                      {isCompleted && <Check className="text-green-500" />}
                                      {isActive && <Clock className="text-blue-400 animate-pulse" />}
                                      {isLocked && <Lock className="text-gray-500" />}
                                  </div>
                                  <p className="text-gray-400 text-sm mb-4 h-10">{focus.description}</p>
                                  
                                  <div className="flex flex-col gap-2 text-sm">
                                      <div className="flex justify-between text-gray-300">
                                          <span>Time:</span>
                                          <span className="font-mono text-white">{focus.turnsRequired} Turns</span>
                                      </div>
                                      <div className="flex justify-between text-gray-300">
                                          <span>Cost:</span>
                                          <span className="font-mono text-yellow-500">${focus.cost}</span>
                                      </div>
                                      <div className="flex justify-between text-gray-300 border-t border-gray-700 pt-2 mt-2">
                                          <span>Reward:</span>
                                          <span className="text-green-400 font-bold">
                                              {focus.rewardMoney > 0 && `+${focus.rewardMoney} Gold `}
                                              {focus.rewardIncome && `+${focus.rewardIncome} Income `}
                                              {focus.rewardModifier && `+${focus.rewardModifier.name} `}
                                          </span>
                                      </div>
                                  </div>

                                  {isActive && (
                                      <div className="mt-4 w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                          <div 
                                            className="bg-blue-500 h-full transition-all duration-500" 
                                            style={{width: `${(player.activeFocus!.progress / focus.turnsRequired) * 100}%`}}
                                          ></div>
                                      </div>
                                  )}

                                  {!isCompleted && !isActive && !isLocked && (
                                      <button 
                                          onClick={() => startFocus(focus.id)}
                                          disabled={player.money < focus.cost}
                                          className="mt-6 w-full py-2 bg-vranje-gold hover:bg-yellow-600 text-black font-bold rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      >
                                          Start Focus
                                      </button>
                                  )}
                                  
                                  {isLocked && !isCompleted && (
                                      <div className="mt-6 w-full py-2 text-center text-gray-500 font-mono text-sm border border-gray-700 rounded bg-black/20">
                                          Another focus active
                                      </div>
                                  )}
                                  
                                  {isCompleted && (
                                      <div className="mt-6 w-full py-2 text-center text-green-500 font-bold text-sm bg-green-900/30 rounded border border-green-800">
                                          COMPLETED
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="h-20 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6 z-10 shadow-lg relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <span className="text-4xl filter drop-shadow-md">{player.flag}</span>
             <div>
                 <div className="font-bold text-xl text-white tracking-wide">{player.name}</div>
                 {player.modifiers.length > 0 && (
                     <div className="flex gap-1 mt-1">
                         {player.modifiers.map(m => (
                             <span key={m.id} className="text-[10px] bg-blue-900 text-blue-200 px-1 rounded border border-blue-500" title={m.description}>
                                 {m.name}
                             </span>
                         ))}
                     </div>
                 )}
             </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono bg-black/40 px-6 py-3 rounded-xl border border-gray-700 shadow-inner">
             <div className="flex items-center gap-2 text-yellow-400">
                <Coins size={18} />
                <span className="text-lg font-bold">${Math.floor(player.money).toLocaleString()}</span>
             </div>
             <div className="w-px h-6 bg-gray-600"></div>
             <div className="flex items-center gap-2 text-blue-400">
                <Sword size={18} />
                <span className="text-lg font-bold">{playerPower}</span>
             </div>
             <div className="w-px h-6 bg-gray-600"></div>
             <div className="flex items-center gap-2 text-green-400" title="Stability affects income and army morale">
                <Activity size={18} />
                <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${player.stability > 70 ? 'bg-green-500' : player.stability > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{width: `${player.stability}%`}}
                    ></div>
                </div>
                <span className="text-xs">{Math.floor(player.stability)}%</span>
             </div>
             
             {/* Active Focus Indicator */}
             <div className="w-px h-6 bg-gray-600"></div>
             <button 
                onClick={() => { audio.playClick(); setShowFocusTree(true); }}
                className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                title="Open Focus Tree"
             >
                <BookOpen size={18} className={player.activeFocus ? "text-blue-400 animate-pulse" : "text-gray-400"} />
                {player.activeFocus ? (
                     <div className="flex flex-col items-start leading-none">
                         <span className="text-[10px] text-gray-400">Focusing...</span>
                         <span className="text-xs font-bold text-blue-300">
                            {Math.round((player.activeFocus.progress / (NATIONAL_FOCUSES.find(f => f.id === player.activeFocus?.focusId)?.turnsRequired || 1)) * 100)}%
                         </span>
                     </div>
                ) : (
                    <span className="text-xs text-gray-400">No Focus</span>
                )}
             </button>

             {/* Government Button */}
             <div className="w-px h-6 bg-gray-600"></div>
             <button
                onClick={() => { audio.playClick(); setShowGovernment(true); }}
                className="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors group"
                title="Government"
             >
                 <Crown size={18} className="text-yellow-500 group-hover:scale-110 transition-transform" />
             </button>

             {/* Mute Button */}
             <div className="w-px h-6 bg-gray-600"></div>
             <button
                onClick={toggleMute}
                className={`flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors ${isMuted ? 'text-red-400' : 'text-gray-400'}`}
                title={isMuted ? "Unmute" : "Mute"}
             >
                 {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
             </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {gameState.movingFromTerritoryId && (
               <div className="animate-pulse text-green-400 font-bold mr-4 border border-green-500 px-3 py-1 rounded">
                   SELECT DESTINATION
               </div>
           )}
          <div className="text-gray-400 font-mono text-sm bg-gray-800 px-3 py-1 rounded">Turn: {gameState.turn}</div>
          
          <button 
             onClick={handleEndTurn}
             className="bg-vranje-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow-lg border border-red-900 flex items-center gap-2 active:translate-y-1 transition-all"
          >
             END TURN <Play size={16} fill="white" />
          </button>

          <div className="w-px h-8 bg-gray-700 mx-2"></div>

          <button onClick={() => { audio.playClick(); localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); alert("Game Saved!"); }} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors">
            <Save size={20} />
          </button>
          <button onClick={exitGame} className="p-2 bg-red-900/50 hover:bg-red-900 rounded-full text-red-200 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Map Area */}
        <div className="flex-1 relative p-4 bg-[#050510]">
            <MapCanvas 
                territories={gameState.territories} 
                countries={gameState.countries} 
                selectedTerritoryId={gameState.selectedTerritoryId}
                movingFromTerritoryId={gameState.movingFromTerritoryId}
                animations={gameState.animations}
                onSelectTerritory={handleMapClick}
            />

            {/* Logs Overlay */}
            <div className="absolute bottom-6 left-6 w-96 pointer-events-none">
                <div className="flex flex-col gap-2">
                    {gameState.logs.slice(0, 5).map((log, i) => (
                        <div key={i} className={`text-sm px-4 py-2 rounded shadow-lg border-l-4 animate-fade-in backdrop-blur-md ${log.includes("EVENT") ? 'bg-purple-900/80 border-purple-500 text-white' : 'bg-black/60 border-vranje-gold text-gray-200'}`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Sidebar - Context Sensitive */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-20">
          {!selectedTerritory && (
             <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-full gap-4">
                <Target size={64} className="opacity-10" />
                <p>Select a territory to manage units or diplomacy.</p>
             </div>
          )}

          {selectedTerritory && selectedCountry && (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 bg-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedCountry.flag} {selectedCountry.name}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                        <Move size={12} /> {selectedTerritory.name}
                    </p>
                    <div className="mt-4 flex gap-2">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${selectedCountry.isPlayer ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'}`}>
                             {selectedCountry.isPlayer ? 'YOUR TERRITORY' : 'ENEMY TERRITORY'}
                         </span>
                         {!selectedCountry.isPlayer && (
                             <span className={`px-2 py-1 rounded text-xs font-bold bg-gray-700`}>
                                 {selectedCountry.relation.toUpperCase()}
                             </span>
                         )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Prosperity Bar */}
                    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
                         <div className="flex justify-between items-center mb-1 text-xs text-gray-400 uppercase font-bold">
                             <span className="flex items-center gap-1"><TrendingUp size={12}/> Prosperity</span>
                             <span>{Math.floor(selectedTerritory.prosperity)}/100</span>
                         </div>
                         <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400"
                                style={{width: `${selectedTerritory.prosperity}%`}}
                            ></div>
                         </div>
                         <div className="text-[10px] text-gray-500 mt-1 text-right">Boosts local income</div>
                    </div>

                    {/* Local Units */}
                    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Sword size={12} /> Stationed Forces</h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                             <div className="bg-gray-800 p-2 rounded">
                                <div className="font-bold text-blue-300 text-lg">{selectedTerritory.units.INFANTRY}</div>
                                <div className="opacity-50">Infantry</div>
                             </div>
                             <div className="bg-gray-800 p-2 rounded">
                                <div className="font-bold text-orange-300 text-lg">{selectedTerritory.units.ARTILLERY}</div>
                                <div className="opacity-50">Arty</div>
                             </div>
                             <div className="bg-gray-800 p-2 rounded">
                                <div className="font-bold text-green-300 text-lg">{selectedTerritory.units.TANK}</div>
                                <div className="opacity-50">Tanks</div>
                             </div>
                             <div className="bg-gray-800 p-2 rounded border border-red-900/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-red-900/10"></div>
                                <div className="font-bold text-red-300 text-lg relative z-10">{selectedTerritory.units.BOMBER || 0}</div>
                                <div className="opacity-50 relative z-10">Bombers</div>
                             </div>
                        </div>
                    </div>

                    {/* Actions if Player */}
                    {selectedCountry.isPlayer && (
                        <div className="space-y-4">
                            <button 
                                onClick={() => { audio.playClick(); setGameState(prev => prev ? {...prev, movingFromTerritoryId: selectedTerritory.id} : null); }}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                            >
                                <Move size={18} /> MOVE ARMY
                            </button>

                            <div className="h-px bg-gray-700 my-4"></div>

                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recruitment</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.values(UnitType).map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => recruitUnit(type)}
                                        disabled={player.money < COSTS[type].cost}
                                        className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-600 transition-all group"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-sm">{type}</span>
                                            <span className="text-[10px] text-gray-400">Atk: {COSTS[type].attack} | Def: {COSTS[type].defense}</span>
                                        </div>
                                        <div className="text-yellow-500 font-mono text-xs group-hover:scale-110 transition-transform">
                                            ${COSTS[type].cost}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-6">Construction</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.values(BuildingType).map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => constructBuilding(type)}
                                        disabled={player.money < BUILDING_COSTS[type]}
                                        className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-600 transition-all group"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-sm flex items-center gap-2">
                                                {type === BuildingType.MINE && <Hammer size={12} />}
                                                {type === BuildingType.FARM && <Zap size={12} />}
                                                {type === BuildingType.ROAD && <MapPin size={12} />}
                                                {type}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {type === BuildingType.FARM && "+25 Income (Cheap)"}
                                                {type === BuildingType.MARKET && "+50 Income +Growth"}
                                                {type === BuildingType.MINE && "+150 Income"}
                                                {type === BuildingType.BUNKER && "High Defense"}
                                                {type === BuildingType.BARRACKS && "Recruit Bonus"}
                                                {type === BuildingType.ROAD && "+Defense +Prosperity"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-yellow-500 font-mono text-xs group-hover:scale-110 transition-transform">
                                                ${BUILDING_COSTS[type]}
                                            </div>
                                            <div className="text-[10px] text-gray-400">Owned: {selectedTerritory.buildings[type]}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions if Enemy */}
                    {!selectedCountry.isPlayer && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Diplomacy</h3>
                            
                            <button 
                                onClick={() => { audio.playClick(); setChatTargetId(selectedCountry.id); }}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                            >
                                <MessageCircle size={18} /> OPEN COMMS
                            </button>

                            <button 
                                onClick={() => sendUltimatum(selectedCountry.id)}
                                className="w-full py-3 bg-red-900/50 border border-red-600 hover:bg-red-800 text-red-200 rounded font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <AlertTriangle size={18} /> SEND ULTIMATUM
                            </button>
                            
                            <div className="text-xs text-gray-500 text-center mt-2">
                                Sending an ultimatum is risky. They may surrender their lands or declare war.
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Diplomacy Chat Modal */}
      {chatTargetId && gameState && (
        <DiplomacyChat 
            player={player}
            target={gameState.countries.find(c => c.id === chatTargetId)!}
            gameState={gameState}
            onClose={() => { audio.playClick(); setChatTargetId(null); }}
            onUpdateHistory={(id, history) => {
                setGameState(prev => {
                    if(!prev) return null;
                    const nc = prev.countries.map(c => c.id === id ? {...c, chatHistory: history} : c);
                    return {...prev, countries: nc};
                });
            }}
        />
      )}
    </div>
  );
}