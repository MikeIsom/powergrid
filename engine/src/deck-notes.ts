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
