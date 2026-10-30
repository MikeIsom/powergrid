// 2F-Spiele's notes for playing The New Power Plants on each map under Recharged
// rules, as data. Set 1: plants-new-power-plants-set1-map-notes.pdf. Set 2:
// plants-new-power-plants-set2-map-notes.md (Mike Isom's transcription). Plant
// numbers are the printed numbers. A deck/map pair without a note cannot be set up.

export type NewDeck = 'set1' | 'set2';

export interface DeckNote {
    // Boxed before the market and stack are prepared.
    box?: number[];
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

export function deckNote(deck: NewDeck, mapName: string): DeckNote {
    const note = deckNotes[deck][mapName];
    if (!note) {
        throw new Error(`There are no ${deck == 'set1' ? 'Set 1' : 'Set 2'} map notes for ${mapName}.`);
    }
    return note;
}
