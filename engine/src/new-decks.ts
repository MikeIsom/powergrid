import seedrandom from 'seedrandom';
import { deckBox, deckNote, NewDeck, shuffledNote } from './deck-notes';
import { faceValue, hasPlug, PowerPlant, PowerPlantType } from './gamestate';
import { GameMap } from './maps';
import { shuffle } from './utils';

// How a map prepares its market and stack under Recharged, apart from the deck notes.
interface MapPreparation {
    // Plants in the opening current and future markets.
    market: [number, number];
    // Plug cards put on top of the stack: one set aside (the standard rule), all the
    // undrawn ones, or none.
    plugsOnTop: 'one' | 'all' | 'none';
    // Plug and socket cards removed at random, indexed by player count - 2.
    plugRemovals: number[];
    socketRemovals: number[];
    // Plants kept out of the player-count removal and shuffled back in.
    protect?: (plant: PowerPlant) => boolean;
    // Plants placed under the Step 3 card.
    belowStepThree: number;
    // A map that builds its own stack instead of the standard preparation.
    stack?: 'china' | 'manhattan';
}

// base-recharged.pdf p.3: 8 plug cards to the market, one more set aside for the top of
// the stack, then remove 1/2/1 plug and 5/6/3 socket cards with 2/3/4 players.
const standard: MapPreparation = {
    market: [4, 4],
    plugsOnTop: 'one',
    plugRemovals: [1, 2, 1, 0, 0],
    socketRemovals: [5, 6, 3, 0, 0],
    belowStepThree: 0,
};

const mapPreparations: Record<string, Partial<MapPreparation>> = {
    // Bremen: the market and stack are prepared without removing further plants
    // (maps-bremen-manhattan.pdf p.2).
    Bremen: { plugRemovals: [0, 0, 0, 0, 0], socketRemovals: [0, 0, 0, 0, 0] },
    // China: plants up to 30 in ascending order on top, then 31–35 shuffled with the
    // Step 3 card, then the rest shuffled; the round 1 market is the lowest plant for
    // each player, with no future market (maps-china-korea.pdf p.2).
    China: { stack: 'china' },
    // France: no further plug removal with 2 and 4 players, one with 3 (maps-france-italy.pdf p.2).
    France: { plugRemovals: [0, 1, 0, 0, 0] },
    // Québec: ecological plants are never removed at random (maps-quebec-baden-wurttemberg.pdf p.2).
    // Only the green (wind) plants count: base-original-2013.pdf p.4 keeps "Ecological and
    // Fusion Power Plants" apart (owner's ruling).
    Quebec: { protect: (p) => p.type == PowerPlantType.Wind },
    // Manhattan: the Step 3 card is boxed; some plug cards are boxed, 8 of the others
    // go to the market and any left go on top of the shuffled socket cards
    // (maps-bremen-manhattan.pdf p.2).
    Manhattan: { stack: 'manhattan' },
    // Russia: a market of 3 + 3, the undrawn plug cards on top of the stack, and only
    // socket cards removed: 6, 8 and 4 with 2, 3 and 4 players (maps-russia-japan.pdf p.2).
    Russia: { market: [3, 3], plugsOnTop: 'all', plugRemovals: [0, 0, 0, 0, 0], socketRemovals: [6, 8, 4, 0, 0] },
    // UK & Ireland: two plants below the Step 3 card (maps-northern-europe-uk-ireland.pdf p.2).
    'UK & Ireland': { belowStepThree: 2 },
};

export function mapPreparation(mapName: string): MapPreparation {
    return { ...standard, ...mapPreparations[mapName] };
}

export interface PreparedDeck {
    actualMarket: PowerPlant[];
    futureMarket: PowerPlant[];
    powerPlantsDeck: PowerPlant[];
    // Put on top of the stack at the start of Step 2, top first.
    stepTwoTopPlants?: PowerPlant[];
}

// Prepares the opening market and stack for Set 1, Set 2 or a shuffled deck under
// Recharged: the deck's map notes first, then the map's own preparation with the cards
// of the deck.
export function prepareNewDeck(
    map: GameMap,
    numPlayers: number,
    deck: NewDeck | 'shuffled',
    rng: seedrandom.prng,
    catalogue: PowerPlant[]
): PreparedDeck {
    const note = deck == 'shuffled' ? shuffledNote(map.name, catalogue) : deckNote(deck, map.name);
    const prep = mapPreparation(map.name);
    const deckWide = deck == 'shuffled' ? [] : deckBox[deck];
    const boxed = new Set([...deckWide, ...(note.box ?? []), ...(note.boxByPlayers?.[numPlayers] ?? [])]);
    let cards = catalogue.filter((p) => !boxed.has(p.number)).map((p) => ({ ...p }));

    // Europe prepares its own market and stack from the plug cards of any deck.
    if (map.name == 'Europe' && map.setupDeck) {
        return map.setupDeck(numPlayers, 'recharged', rng, cards);
    }

    const take = (numbers: number[] = []) => {
        const taken = numbers.map((n) => cards.find((p) => p.number == n)).filter((p): p is PowerPlant => !!p);
        cards = cards.filter((p) => !taken.includes(p));
        return taken;
    };
    const stepTwoTop = take(note.stepTwoTop);
    const topOfStack = take(note.topOfStack);
    const belowTopPlug = take(note.belowTopPlug);
    const fixedMarket = take(note.market);
    const step3 = cards.find((p) => p.type == PowerPlantType.Step3)!;
    cards = cards.filter((p) => p != step3);

    if (prep.stack == 'china') {
        const low = cards.filter((p) => faceValue(p) <= 30).sort((a, b) => a.number - b.number);
        const middle = shuffle([...cards.filter((p) => faceValue(p) > 30 && faceValue(p) <= 35), step3], rng() + '');
        const high = shuffle(
            cards.filter((p) => faceValue(p) > 35),
            rng() + ''
        );
        return {
            actualMarket: low.splice(0, numPlayers),
            futureMarket: [],
            powerPlantsDeck: [...low, ...middle, ...high],
        };
    }
    if (prep.stack == 'manhattan') {
        const plugCards = shuffle(cards.filter(hasPlug), rng() + '').slice(note.boxPlugs ?? 0);
        const socketCards = shuffle(
            cards.filter((p) => !hasPlug(p)),
            rng() + ''
        );
        const opening = plugCards.splice(0, 8).sort((a, b) => a.number - b.number);
        return {
            actualMarket: opening.slice(0, 4),
            futureMarket: opening.slice(4),
            powerPlantsDeck: [...plugCards, ...socketCards],
        };
    }

    let plugs = shuffle(
        cards.filter((p) => hasPlug(p)),
        rng() + ''
    );
    let sockets = shuffle(
        cards.filter((p) => !hasPlug(p)),
        rng() + ''
    );

    const market = [...fixedMarket, ...plugs.splice(0, prep.market[0] + prep.market[1] - fixedMarket.length)].sort(
        (a, b) => a.number - b.number
    );
    const onTop = prep.plugsOnTop == 'one' ? plugs.splice(0, 1) : prep.plugsOnTop == 'all' ? plugs.splice(0) : [];

    const isProtected = (p: PowerPlant) => !!prep.protect?.(p) || !!note.protect?.includes(p.number);
    const protectedPlants = [...plugs, ...sockets].filter(isProtected);
    plugs = plugs.filter((p) => !isProtected(p)).slice(prep.plugRemovals[numPlayers - 2]);
    sockets = sockets.filter((p) => !isProtected(p)).slice(prep.socketRemovals[numPlayers - 2]);

    const stack = [
        ...topOfStack,
        ...onTop,
        ...belowTopPlug,
        ...shuffle([...plugs, ...sockets, ...protectedPlants], rng() + ''),
    ];
    stack.splice(stack.length - prep.belowStepThree, 0, step3);

    return {
        actualMarket: market.slice(0, prep.market[0]),
        futureMarket: market.slice(prep.market[0]),
        powerPlantsDeck: stack,
        ...(stepTwoTop.length ? { stepTwoTopPlants: stepTwoTop } : {}),
    };
}
