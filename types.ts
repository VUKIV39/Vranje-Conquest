





export enum UnitType {
  INFANTRY = 'INFANTRY',
  ARTILLERY = 'ARTILLERY',
  TANK = 'TANK',
  BOMBER = 'BOMBER',
}

export enum BuildingType {
  FARM = 'FARM',       // Low Cost, Low Income
  MARKET = 'MARKET',   // Income ++
  BARRACKS = 'BARRACKS', // Defense + Recruitment
  BUNKER = 'BUNKER',   // Defense ++
  MINE = 'MINE',       // Income ++++
  ROAD = 'ROAD',       // Prosperity ++, Defense +
}

export enum RelationStatus {
  PEACE = 'Peace',
  WAR = 'War',
  ALLIANCE = 'Alliance',
  NON_AGGRESSION = 'Non-Aggression Pact',
}

export interface Unit {
  type: UnitType;
  count: number;
}

export interface ChatMessage {
  sender: 'player' | 'ai';
  text: string;
  timestamp: number;
}

export interface Modifier {
  id: string;
  name: string;
  description: string;
  duration: number; // Turns left
  type: 'INCOME' | 'ATTACK' | 'DEFENSE';
  value: number; // Percentage or flat value
}

export interface NationalFocus {
  id: string;
  name: string;
  description: string;
  cost: number;
  turnsRequired: number;
  rewardMoney: number;
  rewardModifier?: Modifier;
  rewardIncome?: number; // Permanent base income increase
}

export interface ActiveFocus {
  focusId: string;
  progress: number;
}

export interface Leader {
  name: string;
  title: string;
  image: string; // Emoji
  bonuses: string[];
}

export interface Country {
  id: string;
  name: string;
  color: string;
  flag: string; // Emoji
  money: number;
  income: number; // Base income
  stability: number; // 0-100, affects income/morale
  leader: Leader;
  hasVukanEventFired: boolean;
  modifiers: Modifier[];
  completedFocusIds: string[];
  activeFocus: ActiveFocus | null;
  isPlayer: boolean;
  isDead: boolean;
  // Diplomacy relative to the player
  relation: RelationStatus;
  // AI personality
  aggression: number; // 0-1
  chatHistory: ChatMessage[];
}

export interface Territory {
  id: string;
  name: string;
  ownerId: string;
  path: string; // SVG path d
  centerX: number;
  centerY: number;
  neighbors: string[];
  prosperity: number; // 0-100, affects local income
  units: Record<UnitType, number>;
  buildings: Record<BuildingType, number>;
}

export interface Animation {
  id: number;
  fromId: string;
  toId: string;
  type: 'MOVE' | 'ATTACK';
  startTime: number;
  duration: number;
}

export interface GameState {
  turn: number;
  countries: Country[];
  territories: Territory[];
  selectedCountryId: string | null;
  selectedTerritoryId: string | null;
  movingFromTerritoryId: string | null; 
  logs: string[];
  animations: Animation[];
}

export const COSTS = {
  [UnitType.INFANTRY]: { cost: 100, upkeep: 5, attack: 10, defense: 15 },
  [UnitType.ARTILLERY]: { cost: 300, upkeep: 15, attack: 30, defense: 10 },
  [UnitType.TANK]: { cost: 800, upkeep: 40, attack: 60, defense: 50 },
  [UnitType.BOMBER]: { cost: 2000, upkeep: 100, attack: 150, defense: 20 },
};

export const BUILDING_COSTS = {
  [BuildingType.FARM]: 300,    // +25 income
  [BuildingType.MARKET]: 500,  // +50 income
  [BuildingType.BARRACKS]: 800,
  [BuildingType.BUNKER]: 1000,
  [BuildingType.MINE]: 1200,   // +150 income
  [BuildingType.ROAD]: 200,    // +Prosperity, +Defense
};

export const BUILDING_INCOME = {
  [BuildingType.FARM]: 25,
  [BuildingType.MARKET]: 50,
  [BuildingType.MINE]: 150,
  [BuildingType.BARRACKS]: 0,
  [BuildingType.BUNKER]: 0,
  [BuildingType.ROAD]: 0,
};