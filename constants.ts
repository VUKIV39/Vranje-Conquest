










import { Country, RelationStatus, Territory, UnitType, BuildingType, NationalFocus, Leader } from './types';

// Initial state helpers
const defaultUnits = () => ({ 
  [UnitType.INFANTRY]: 0, 
  [UnitType.ARTILLERY]: 0, 
  [UnitType.TANK]: 0,
  [UnitType.BOMBER]: 0 
});
const defaultBuildings = () => ({ 
  [BuildingType.FARM]: 0, 
  [BuildingType.MARKET]: 0, 
  [BuildingType.BARRACKS]: 0, 
  [BuildingType.BUNKER]: 0, 
  [BuildingType.MINE]: 0,
  [BuildingType.ROAD]: 0
});

export const NATIONAL_FOCUSES: NationalFocus[] = [
    {
        id: 'nf_industrial_boom',
        name: 'Industrial Boom',
        description: 'Invest heavily in local factories. Increases base income permanently.',
        cost: 500,
        turnsRequired: 3,
        rewardMoney: 0,
        rewardIncome: 100
    },
    {
        id: 'nf_military_reform',
        name: 'Military Reform',
        description: 'Modernize the army doctrine. Units gain attack bonus for 10 turns.',
        cost: 800,
        turnsRequired: 4,
        rewardMoney: 0,
        rewardModifier: {
            id: 'mod_mil_reform',
            name: 'Military Reform',
            description: 'Modern doctrine increases attack efficiency',
            type: 'ATTACK',
            value: 0.25, // 25% boost
            duration: 10
        }
    },
    {
        id: 'nf_foreign_aid',
        name: 'Seek Foreign Aid',
        description: 'Diplomats request funds from superpowers. Takes time but yields cash.',
        cost: 50,
        turnsRequired: 5,
        rewardMoney: 2500,
    },
    {
        id: 'nf_fortress_vranje',
        name: 'Fortress Vranje',
        description: 'Establish a defensive perimeter. Massive defense boost for 8 turns.',
        cost: 600,
        turnsRequired: 3,
        rewardMoney: 0,
        rewardModifier: {
            id: 'mod_fortress',
            name: 'Fortress Doctrine',
            description: 'Defensive preparations in full effect',
            type: 'DEFENSE',
            value: 0.40, 
            duration: 8
        }
    },
    {
        id: 'nf_propaganda',
        name: 'Propaganda Campaign',
        description: 'Boost national stability through media control.',
        cost: 200,
        turnsRequired: 2,
        rewardMoney: 0,
        rewardModifier: {
            id: 'mod_propaganda',
            name: 'National Zeal',
            description: 'High morale improves combat effectiveness',
            type: 'ATTACK',
            value: 0.1, 
            duration: 5
        }
    }
];

export const VUKAN_LEADER: Leader = {
    name: "Vukan",
    title: "Supreme Commander",
    image: "🤴",
    bonuses: ["+15% Tank Attack", "Administrative Efficiency"]
};

export const INITIAL_TERRITORIES: Territory[] = [
  {
    id: 't_centar',
    name: 'Vranje Centar',
    ownerId: 'c_vranje',
    neighbors: ['t_donje', 't_gornja', 't_brdo'],
    path: 'M 400 300 L 450 280 L 500 300 L 520 350 L 480 400 L 420 380 Z',
    centerX: 460,
    centerY: 335,
    prosperity: 70,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 10, [UnitType.TANK]: 1 },
    buildings: { ...defaultBuildings(), [BuildingType.MARKET]: 1, [BuildingType.BARRACKS]: 1, [BuildingType.ROAD]: 1 },
  },
  {
    id: 't_donje',
    name: 'Donje Vranje',
    ownerId: 'c_bulgaria',
    neighbors: ['t_centar', 't_neradovac', 't_ribince', 't_east_border'],
    path: 'M 480 400 L 520 350 L 580 360 L 600 450 L 500 480 Z',
    centerX: 536,
    centerY: 408,
    prosperity: 50,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 5 },
    buildings: defaultBuildings(),
  },
  {
    id: 't_gornja',
    name: 'Gornja Čaršija',
    ownerId: 'c_macedonia',
    neighbors: ['t_centar', 't_tulbe', 't_brdo', 't_north_border', 't_east_border'],
    path: 'M 450 280 L 400 300 L 380 250 L 420 200 L 480 220 Z',
    centerX: 426,
    centerY: 250,
    prosperity: 40,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 8 },
    buildings: defaultBuildings(),
  },
  {
    id: 't_tulbe',
    name: 'Tulbe',
    ownerId: 'c_kosovo',
    neighbors: ['t_gornja', 't_brdo', 't_sobina', 't_north_border'],
    path: 'M 380 250 L 400 300 L 350 320 L 300 280 L 320 220 Z',
    centerX: 350,
    centerY: 274,
    prosperity: 30,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 12 },
    buildings: { ...defaultBuildings(), [BuildingType.BUNKER]: 1 },
  },
  {
    id: 't_brdo',
    name: 'Pržar Hills',
    ownerId: 'c_albania',
    neighbors: ['t_centar', 't_gornja', 't_tulbe', 't_sobina'],
    path: 'M 400 300 L 420 380 L 350 320 Z',
    centerX: 390,
    centerY: 333,
    prosperity: 20,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 6 },
    buildings: defaultBuildings(),
  },
  {
    id: 't_sobina',
    name: 'Sobina',
    ownerId: 'c_kosovo',
    neighbors: ['t_tulbe', 't_brdo', 't_neradovac'],
    path: 'M 350 320 L 420 380 L 380 450 L 300 400 L 300 280 Z',
    centerX: 350,
    centerY: 366,
    prosperity: 30,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 5, [UnitType.ARTILLERY]: 1 },
    buildings: defaultBuildings(),
  },
  {
    id: 't_neradovac',
    name: 'Neradovac',
    ownerId: 'c_serbia',
    neighbors: ['t_sobina', 't_donje', 't_ribince'],
    path: 'M 380 450 L 420 380 L 480 400 L 500 480 L 400 550 Z',
    centerX: 436,
    centerY: 452,
    prosperity: 60,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 15, [UnitType.TANK]: 2 },
    buildings: { ...defaultBuildings(), [BuildingType.MINE]: 1 },
  },
  {
    id: 't_ribince',
    name: 'Ribiince',
    ownerId: 'c_bulgaria',
    neighbors: ['t_donje', 't_neradovac'],
    path: 'M 500 480 L 600 450 L 650 550 L 550 600 L 400 550 Z',
    centerX: 520,
    centerY: 526,
    prosperity: 45,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 8 },
    buildings: { ...defaultBuildings(), [BuildingType.MARKET]: 1 },
  },
  {
    id: 't_north_border',
    name: 'North Region',
    ownerId: 'c_serbia',
    neighbors: ['t_gornja', 't_tulbe', 't_east_border'],
    path: 'M 320 220 L 420 200 L 480 220 L 550 150 L 250 150 Z',
    centerX: 404,
    centerY: 188,
    prosperity: 40,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 20, [UnitType.ARTILLERY]: 2 },
    buildings: { ...defaultBuildings(), [BuildingType.BARRACKS]: 1 },
  },
  {
    id: 't_east_border',
    name: 'Eastern Lands',
    ownerId: 'c_bulgaria',
    neighbors: ['t_donje', 't_gornja', 't_north_border'],
    path: 'M 480 220 L 420 200 L 450 280 L 500 300 L 520 350 L 580 360 L 650 250 L 550 150 Z',
    centerX: 525,
    centerY: 272,
    prosperity: 35,
    units: { ...defaultUnits(), [UnitType.INFANTRY]: 10, [UnitType.ARTILLERY]: 2 },
    buildings: { ...defaultBuildings(), [BuildingType.MINE]: 1 },
  }
];

export const INITIAL_COUNTRIES: Country[] = [
  {
    id: 'c_vranje',
    name: 'Vranje Republic',
    color: '#d4af37', // Vranje Gold
    flag: '🏰',
    money: 1000,
    income: 100,
    stability: 80,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "Provisional Council", title: "Interim Govt", image: "🏛️", bonuses: [] },
    relation: RelationStatus.PEACE,
    aggression: 0,
    chatHistory: [],
  },
  {
    id: 'c_bulgaria',
    name: 'Empire of Sofia',
    color: '#2e7d32', // Dark Green
    flag: '🦁',
    money: 2000,
    income: 150,
    stability: 70,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "Tsar Boris", title: "Emperor", image: "🦁", bonuses: ["+10% Income"] },
    relation: RelationStatus.PEACE,
    aggression: 0.6,
    chatHistory: [],
  },
  {
    id: 'c_macedonia',
    name: 'Vardar Union',
    color: '#c62828', // Dark Red
    flag: '☀️',
    money: 1200,
    income: 80,
    stability: 60,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "General Kosta", title: "Marshal", image: "🎖️", bonuses: ["+5% Defense"] },
    relation: RelationStatus.PEACE,
    aggression: 0.3,
    chatHistory: [],
  },
  {
    id: 'c_kosovo',
    name: 'Dukagjin Order',
    color: '#1565c0', // Dark Blue
    flag: '🦅',
    money: 1500,
    income: 100,
    stability: 50,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "Commander Adem", title: "Warlord", image: "⚔️", bonuses: ["+10% Attack"] },
    relation: RelationStatus.WAR,
    aggression: 0.8,
    chatHistory: [],
  },
  {
    id: 'c_albania',
    name: 'Highland Clans',
    color: '#ad1457', // Pink/Purple
    flag: '🏔️',
    money: 1400,
    income: 90,
    stability: 55,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "Chief Leka", title: "High Chief", image: "🏔️", bonuses: ["+20% Defense in Hills"] },
    relation: RelationStatus.PEACE,
    aggression: 0.5,
    chatHistory: [],
  },
  {
    id: 'c_serbia',
    name: 'Imperial Army',
    color: '#283593', // Indigo
    flag: '👑',
    money: 3000,
    income: 200,
    stability: 90,
    modifiers: [],
    completedFocusIds: [],
    activeFocus: null,
    isPlayer: false,
    isDead: false,
    hasVukanEventFired: false,
    leader: { name: "King Peter", title: "Monarch", image: "👑", bonuses: ["+20% Stability"] },
    relation: RelationStatus.ALLIANCE,
    aggression: 0.1,
    chatHistory: [],
  },
];