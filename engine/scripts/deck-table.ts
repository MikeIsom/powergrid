// Prints how every map prepares Set 1 and Set 2 under Recharged, from the deck notes,
// the maps' own preparation and real setups, for checking by eye.
//
//   npx ts-node --transpile-only scripts/deck-table.ts [--json]
import { deckBox, deckNote, deckNotes, NewDeck, noGarbageInStepOne, uraniumStopPlant } from '../src/deck-notes';
import { setup } from '../src/engine';
import { hasPlug, MapName, PowerPlant, PowerPlantType } from '../src/gamestate';
import { mapsRecharged } from '../src/maps';
import { mapPreparation } from '../src/new-decks';
import { plantCatalogue } from '../src/powerPlants';

export interface DeckRow {
    deck: NewDeck;
    map: string;
    boxed: string;
    market: string;
    plugPool: string;
    top: string;
    removals: string;
    protected: string;
    stepTwoTop: string;
    stepThree: string;
    uraniumStop: string;
    other: string;
    // Plants in the game (market and stack) with 2–6 players, from a real setup.
    inGame: number[];
}

const list = (numbers: number[]) => (numbers.length ? numbers.join(', ') : '—');
// Northern Europe's regions by their colour on the board.
const regionNames: Record<string, string> = {
    orange: 'Denmark',
    red: 'Norway',
    purple: 'Sweden South',
    yellow: 'Sweden North',
    brown: 'Finland',
    pink: 'Baltic States',
};
const players = [2, 3, 4, 5, 6];

function row(deck: NewDeck, mapName: string): DeckRow {
    const note = deckNote(deck, mapName);
    const prep = mapPreparation(mapName);
    const catalogue = plantCatalogue(mapName, false, deck);
    const boxed = [...deckBox[deck], ...(note.box ?? [])];
    // Player counts that box the same plants are grouped: "2–3P: …".
    const groups: { counts: number[]; text: string }[] = [];
    for (const [n, nums] of Object.entries(note.boxByPlayers ?? {})) {
        const text = list(nums);
        const last = groups[groups.length - 1];
        if (last && last.text == text) last.counts.push(Number(n));
        else groups.push({ counts: [Number(n)], text });
    }
    const byPlayers = groups
        .map(
            (g) =>
                `${g.counts.length > 1 ? `${g.counts[0]}–${g.counts[g.counts.length - 1]}` : g.counts[0]}P: ${g.text}`
        )
        .join('; ');
    const aside = [...(note.market ?? []), ...(note.topOfStack ?? []), ...(note.stepTwoTop ?? [])];
    const plugPool = catalogue
        .filter((p) => hasPlug(p) && !boxed.includes(p.number) && !aside.includes(p.number))
        .map((p) => p.number);
    const marketSize =
        prep.stack == 'china'
            ? 'the lowest plant for each player'
            : prep.stack == 'manhattan'
            ? '8'
            : mapName == 'Europe'
            ? '4 + 5'
            : `${prep.market[0]} + ${prep.market[1]}`;
    const ecological = prep.protect
        ? catalogue.filter((p) => prep.protect!(p) && !boxed.includes(p.number)).map((p) => p.number)
        : [];

    const removals =
        prep.stack == 'china'
            ? 'none (box lists)'
            : prep.stack == 'manhattan'
            ? `none; ${note.boxPlugs} plug cards boxed`
            : prep.plugRemovals.every((n) => n == 0) && prep.socketRemovals.every((n) => n == 0)
            ? 'none'
            : [2, 3, 4].map((n) => `${n}P ${prep.plugRemovals[n - 2]}+${prep.socketRemovals[n - 2]}`).join(', ');

    const other: string[] = [];
    if (deck == 'set2' && ['Europe', 'North America'].includes(mapName)) other.push('alternate deck path');
    if (noGarbageInStepOne({ plantDeck: deck }, mapName)) other.push('no garbage in Step 1');
    if (mapName == 'Middle East') other.push('garbage/nuclear plug plants boxed from the current market in Step 1');
    if (mapName == 'India') other.push('garbage plants burn one more garbage');
    if (mapName == 'Australia') other.push('nuclear plants are uranium mines');
    if (note.regional) {
        other.push(
            Object.entries(note.regional)
                .map(([region, swap]) => `${regionNames[region] ?? region} boxes ${list(swap.box)}`)
                .join('; ') + '; other regions box their own numbers; a duplicate number gets +0.1'
        );
    } else if (mapName == 'Northern Europe') {
        other.push('regions box their own numbers');
    }

    const inGame = players.map((n) => {
        const G = setup(n, { map: mapName as MapName, variant: 'recharged', plantDeck: deck }, `table-${n}`);
        const plants: PowerPlant[] = [...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck];
        return plants.filter((p) => p.type != PowerPlantType.Step3).length;
    });

    return {
        deck,
        map: mapName,
        boxed: [list(boxed), byPlayers].filter((t) => t && t != '—').join('; ') || '—',
        market: `${marketSize}${note.market ? `; ${list(note.market)} placed first` : ''}`,
        plugPool: prep.stack == 'china' ? '—' : list(plugPool),
        top:
            prep.stack == 'china'
                ? 'plants up to 30, ascending'
                : prep.stack == 'manhattan'
                ? 'the plug cards left over'
                : [
                      note.topOfStack ? list(note.topOfStack) : '',
                      { one: 'one plug card', all: 'all undrawn plug cards', none: 'no plug card' }[prep.plugsOnTop],
                  ]
                      .filter((t) => t)
                      .join(', then '),
        removals,
        protected: list([...(note.protect ?? []), ...ecological].sort((a, b) => a - b)),
        stepTwoTop: list(note.stepTwoTop ?? []),
        stepThree:
            prep.stack == 'china'
                ? 'shuffled with 31–35'
                : prep.stack == 'manhattan'
                ? 'boxed'
                : prep.belowStepThree
                ? `${prep.belowStepThree} plants below`
                : 'bottom',
        uraniumStop: String(uraniumStopPlant({ plantDeck: deck }, mapName) ?? '—'),
        other: other.join('; ') || '—',
        inGame,
    };
}

export function deckTable(): DeckRow[] {
    const rows: DeckRow[] = [];
    for (const deck of Object.keys(deckNotes) as NewDeck[]) {
        for (const map of mapsRecharged.map((m) => m.name)) rows.push(row(deck, map));
    }
    return rows;
}

if (require.main === module) {
    const rows = deckTable();
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(rows, null, 2));
    } else {
        const columns: (keyof DeckRow)[] = ['deck', 'map', 'boxed', 'market', 'plugPool', 'top', 'removals'];
        console.log(
            `| ${columns.join(' | ')} | protected | step 2 top | step 3 | uranium stop | in game 2–6P | other |`
        );
        console.log(`|${' --- |'.repeat(columns.length + 6)}`);
        for (const r of rows) {
            const cells = [...columns.map((c) => r[c]), r.protected, r.stepTwoTop, r.stepThree, r.uraniumStop];
            console.log(`| ${cells.join(' | ')} | ${r.inGame.join(' / ')} | ${r.other} |`);
        }
    }
}
