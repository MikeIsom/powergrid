// 2F-Spiele's notes for playing The New Power Plants on each map under Recharged
// rules, as data. Set 1: plants-new-power-plants-set1-map-notes.pdf. Set 2:
// plants-new-power-plants-set2-map-notes.md (Mike Isom's transcription). Plant
// numbers are the printed numbers. A deck/map pair without a note cannot be set up.

import { GameOptions } from './gamestate';

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

// The plant whose purchase stops uranium resupply on Germany and Italy: 39 in the
// standard deck, else the plant the deck's map notes name (if any).
export function uraniumStopPlant(options: GameOptions, mapName: string): number | undefined {
    const deck = options.plantDeck;
    return deck == 'set1' || deck == 'set2' ? deckNotes[deck][mapName]?.uraniumStop : 39;
}

export function noGarbageInStepOne(options: GameOptions, mapName: string): boolean {
    const deck = options.plantDeck;
    return (deck == 'set1' || deck == 'set2') && !!deckNotes[deck][mapName]?.noGarbageInStepOne;
}

export function deckNote(deck: NewDeck, mapName: string): DeckNote {
    const note = deckNotes[deck][mapName];
    if (!note) {
        throw new Error(`There are no ${deck == 'set1' ? 'Set 1' : 'Set 2'} map notes for ${mapName}.`);
    }
    return note;
}
