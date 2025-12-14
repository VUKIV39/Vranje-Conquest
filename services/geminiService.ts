
import { GoogleGenAI } from "@google/genai";
import { Country, RelationStatus, GameState, UnitType } from '../types';

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

const calculateStrength = (countryId: string, gameState: GameState): number => {
  const territories = gameState.territories.filter(t => t.ownerId === countryId);
  let power = 0;
  territories.forEach(t => {
    power += t.units[UnitType.INFANTRY] * 5;
    power += t.units[UnitType.ARTILLERY] * 20;
    power += t.units[UnitType.TANK] * 50;
  });
  return power;
};

export const sendDiplomacyMessage = async (
  playerCountry: Country,
  targetCountry: Country,
  gameState: GameState,
  message: string
): Promise<string> => {
  try {
    const ai = getAI();
    const myStrength = calculateStrength(targetCountry.id, gameState);
    const playerStrength = calculateStrength(playerCountry.id, gameState);

    const context = `
      You are playing a strategy game called "Vranje Conquest".
      You are the leader of ${targetCountry.name} (${targetCountry.flag}).
      The player is the leader of ${playerCountry.name} (${playerCountry.flag}).
      
      Game Status:
      - Your Money: ${Math.floor(targetCountry.money)}
      - Your Military Strength: ${myStrength}
      - Player's Strength: ${playerStrength}
      - Current Relation: ${targetCountry.relation}
      - Aggression Level (0-1): ${targetCountry.aggression}
      
      The player says: "${message}"
      
      Respond in character as the leader of ${targetCountry.name}. 
      Be concise (under 2 sentences).
      If the player asks for an alliance/peace/war, consider your aggression and strength comparison.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: {
        systemInstruction: context,
        maxOutputTokens: 150,
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The communication lines are down. (Check API Key)";
  }
};
