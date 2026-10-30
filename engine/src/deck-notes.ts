// 2F-Spiele's notes for playing The New Power Plants on each map under Recharged
// rules, as data. Set 1: plants-new-power-plants-set1-map-notes.pdf. Set 2:
// plants-new-power-plants-set2-map-notes.md (Mike Isom's transcription). Plant
// numbers are the printed numbers. A deck/map pair without a note cannot be set up.

import { CardDeck, faceValue, GameOptions, GameState, PowerPlant, PowerPlantType } from './gamestate';
import { alternatePowerPlants } from './powerPlants';

export type NewDeck = 'set1' | 'set2';

export interface DeckNote {
    // Boxed before the market and stack are prepared.
    box?: number[];
    // Placed in the opening market first; the rest of the market is drawn from the plug cards.
    market?: number[];
    // Kept out of the player-count removal, then shuffled back in.
    protect?: number[];
    // Set aside, then put on top of the stack once it is prepared, top first.
    topOfStack?: number[];
    // Set aside, then put directly below the plug card on top of the stack, top first.
    belowTopPlug?: number[];
    // Set aside, then put on top of the stack at the start of Step 2, top first.
    stepTwoTop?: number[];
    // Uranium resupply stops once a player buys this plant (Germany, Italy).
    uraniumStop?: number;
    // No garbage can be bought during Step 1 (Middle East with Set 2).
    noGarbageInStepOne?: boolean;
    // Boxed before preparation, by player count (China, Bremen, Manhattan).
    boxByPlayers?: Record<number, number[]>;
    // Manhattan: plug cards boxed at random before the rest go on top of the stack.
    boxPlugs?: number;
    // Northern Europe: for a region in play, the deck's plants boxed when it adds its two
    // plants (by default the plants with the same numbers).
    regional?: Record<string, { box: number[] }>;
}

// Boxed for every map. Set 1: 52, 54, 57 and 60 (plants-new-power-plants-set1.pdf p.2).
export const deckBox: Record<NewDeck, number[]> = {
    set1: [52, 54, 57, 60],
    set2: [],
};

// "No changes are required" (Set 1) / "None" (Set 2).
const noChanges: DeckNote = {};

export const deckNotes: Record<NewDeck, Record<string, DeckNote>> = {
    set1: {
        USA: noChanges,
        Germany: { uraniumStop: 38 },
        Italy: { uraniumStop: 38 },
        France: { box: [10], market: [8] },
        Brazil: { market: [6], protect: [21, 27, 33, 42] },
        'Spain & Portugal': { stepTwoTop: [15, 16, 26] },
        Russia: { box: [6, 21] },
        Australia: { box: [19] },
        India: { box: [8] },
        'South Africa': { box: [7] },
        Quebec: { market: [11, 15, 16] },
        // Sweden North (yellow) boxes Set 1's 21 and 26, the Baltic States (pink) its 19
        // and 22; every other region the plants with its plants' numbers. Sweden North's
        // 25 joins Set 1's 25 as 25.1.
        'Northern Europe': { regional: { yellow: { box: [21, 26] }, pink: { box: [19, 22] } } },
        China: {
            boxByPlayers: {
                2: [1, 2, 8, 12, 15, 22, 27, 28, 32, 36, 42],
                3: [1, 2, 8, 12, 15, 22, 27, 28, 32, 36, 42],
                4: [1, 2, 8, 15, 27, 32, 36],
                5: [1, 2, 32],
                6: [1, 2, 32],
            },
        },
        Bremen: {
            boxByPlayers: {
                2: [8, 19, 24, 31, 34, 37, 38, 42, 44, 46, 50],
                3: [8, 19, 24, 31, 34, 37, 38, 42, 44, 46, 50],
                4: [8, 19, 24, 31, 34, 37, 38, 42, 44, 46, 50],
                5: [8, 19, 24, 31, 37, 38, 42, 46, 50],
                6: [8, 19, 24, 31, 37, 38, 42, 46, 50],
            },
        },
        // With 2 and 3 players, 16 is boxed and only 15 plug cards are left: boxing 7
        // leaves 8, all of them for the market (owner's ruling, 2026-10-29).
        Manhattan: { boxByPlayers: { 2: [16, 28, 38], 3: [16, 28, 38] }, boxPlugs: 7 },
        // 06 and 08 leave the current market by Middle East's own Step 1 rule: they are
        // its garbage and nuclear plants with a plug on the back.
        'Middle East': noChanges,
        Benelux: noChanges,
        'Central Europe': noChanges,
        Korea: noChanges,
        Japan: noChanges,
        'UK & Ireland': noChanges,
        Europe: noChanges,
        'North America': noChanges,
        'Baden-Württemberg': noChanges,
    },
    set2: {
        USA: noChanges,
        Germany: { uraniumStop: 37 },
        Italy: { uraniumStop: 37 },
        France: { box: [11], market: [13] },
        Brazil: { market: [5, 14], protect: [16, 19, 26, 39] },
        'Spain & Portugal': { stepTwoTop: [17, 24, 28] },
        Russia: { box: [5, 14] },
        Australia: { box: [21] },
        India: { box: [13] },
        'South Africa': { box: [10] },
        Quebec: { market: [11], topOfStack: [17, 24] },
        'Northern Europe': noChanges,
        China: {
            boxByPlayers: {
                2: [3, 6, 10, 13, 17, 18, 25, 26, 31, 34, 35],
                3: [3, 6, 10, 13, 17, 18, 25, 26, 31, 34, 35],
                4: [3, 6, 13, 17, 26, 31, 35],
                5: [3, 6, 31],
                6: [3, 6, 31],
            },
        },
        Bremen: {
            boxByPlayers: {
                2: [13, 21, 22, 32, 33, 34, 37, 38, 44, 46, 50],
                3: [13, 21, 22, 32, 33, 34, 37, 38, 44, 46, 50],
                4: [13, 21, 22, 32, 33, 34, 37, 38, 44, 46, 50],
                5: [13, 21, 32, 33, 34, 37, 38, 46, 50],
                6: [13, 21, 32, 33, 34, 37, 38, 46, 50],
            },
        },
        Manhattan: { boxByPlayers: { 2: [22, 28, 36], 3: [22, 28, 36] }, boxPlugs: 4 },
        // 05, 13 and 14 leave the current market by Middle East's own Step 1 rule.
        'Middle East': { noGarbageInStepOne: true },
        Benelux: noChanges,
        'Central Europe': noChanges,
        Korea: noChanges,
        Japan: noChanges,
        'UK & Ireland': noChanges,
        Europe: noChanges,
        'North America': noChanges,
        'Baden-Württemberg': noChanges,
    },
};

// The standard deck's own map rules as notes, for its cards in a shuffled deck: the map
// booklets' plant numbers, as the engine's standard Recharged setups use them.
export const standardNotes: Record<string, DeckNote> = {
    USA: noChanges,
    Germany: { uraniumStop: 39 }, // base-recharged.pdf p.7
    Italy: { uraniumStop: 39 }, // maps-france-italy.pdf p.2
    France: { box: [13], market: [11] }, // maps-france-italy.pdf p.2
    Brazil: { market: [6, 14], protect: [19, 24, 30, 38] }, // maps-brazil-spain-portugal.pdf p.2
    'Spain & Portugal': { stepTwoTop: [18, 22, 27] }, // maps-brazil-spain-portugal.pdf p.2
    Russia: { box: [6, 14] }, // maps-russia-japan.pdf p.2
    Australia: { box: [17] }, // maps-australia-indian-subcontinent.pdf p.2
    India: { box: [11] }, // maps-australia-indian-subcontinent.pdf p.3
    'South Africa': { box: [7] }, // maps-middle-east-south-africa.pdf p.2
    // The engine's Recharged Québec setup: 13 among the plug cards, 18 and 22 below the
    // plug card on top (maps-quebec-baden-wurttemberg.pdf p.2 sets 13, 18, 22 aside).
    Quebec: { belowTopPlug: [18, 22] },
    'Middle East': noChanges,
    Benelux: noChanges,
    'Central Europe': noChanges,
    Korea: noChanges,
    Japan: noChanges,
    'UK & Ireland': noChanges,
    Europe: noChanges,
    'North America': noChanges,
    'Baden-Württemberg': noChanges,
};

// The maps whose notes rebuild the whole deck cannot take a shuffled deck.
export const SHUFFLED_EXCLUDED_MAPS = ['China', 'Bremen', 'Manhattan', 'Northern Europe'];

function cardDeckNote(deck: CardDeck, mapName: string): DeckNote {
    if (deck != 'standard') return deckNote(deck, mapName);
    const note = standardNotes[mapName];
    if (!note) throw new Error(`There are no standard-deck notes for ${mapName}.`);
    return note;
}

// A shuffled deck's notes: each card follows its own deck's notes, so a note's plant
// applies only when the card with that number comes from the note's deck.
export function shuffledNote(mapName: string, cards: PowerPlant[]): DeckNote {
    if (SHUFFLED_EXCLUDED_MAPS.includes(mapName)) {
        throw new Error(`The shuffled deck cannot be used on ${mapName}, whose map notes rebuild the whole deck.`);
    }
    const fields = ['box', 'market', 'protect', 'topOfStack', 'belowTopPlug', 'stepTwoTop'] as const;
    const merged: DeckNote = {};
    for (const deck of ['standard', 'set1', 'set2'] as CardDeck[]) {
        const note = cardDeckNote(deck, mapName);
        for (const field of fields) {
            const numbers = (note[field] ?? []).filter((n) => cards.find((c) => c.number == n)?.origin == deck);
            if (numbers.length) merged[field] = [...(merged[field] ?? []), ...numbers].sort((a, b) => a - b);
        }
    }
    return merged;
}

// The plant whose purchase stops uranium resupply on Germany and Italy: 39 in the
// standard deck, else the plant the deck's map notes name (if any).
export function uraniumStopPlant(options: GameOptions, mapName: string): number | undefined {
    const deck = options.plantDeck;
    return deck == 'set1' || deck == 'set2' ? deckNotes[deck][mapName]?.uraniumStop : 39;
}

// Whether buying this plant stops uranium resupply. In a shuffled deck any plant named
// by its own deck's notes does, so the first of them bought stops it (owner's ruling).
export function isUraniumStopPlant(G: GameState, plant: PowerPlant): boolean {
    if (G.options.plantDeck == 'shuffled') {
        const stop = plant.origin ? cardDeckNote(plant.origin, G.map.name).uraniumStop : undefined;
        return stop !== undefined && faceValue(plant) === stop;
    }
    return faceValue(plant) === uraniumStopPlant(G.options, G.map.name);
}

// Middle East with Set 2: no garbage in Step 1. In a shuffled deck, whenever one of Set 2's
// garbage/oil hybrids is in the game (owner's ruling).
export function noGarbageInStepOne(
    options: GameOptions,
    mapName: string,
    shuffledDeck?: Record<number, CardDeck>
): boolean {
    const deck = options.plantDeck;
    if (deck == 'shuffled') {
        return (
            !!deckNotes.set2[mapName]?.noGarbageInStepOne &&
            alternatePowerPlants.some(
                (p) => p.type == PowerPlantType.GarbageOilHybrid && shuffledDeck?.[p.number] == 'set2'
            )
        );
    }
    return (deck == 'set1' || deck == 'set2') && !!deckNotes[deck][mapName]?.noGarbageInStepOne;
}

export function deckNote(deck: NewDeck, mapName: string): DeckNote {
    const note = deckNotes[deck][mapName];
    if (!note) {
        throw new Error(`There are no ${deck == 'set1' ? 'Set 1' : 'Set 2'} map notes for ${mapName}.`);
    }
    return note;
}
