import { expect } from 'chai';
import 'mocha';
import seedrandom from 'seedrandom';
import { availableMoves } from './available-moves';
import { deckNote } from './deck-notes';
import { calculateMaxCitiesPowered, move, reconstructState, setup, updatePlayerCapacity } from './engine';
import { GameState, hasPlug, MapName, Phase, plantLabel, PowerPlant, PowerPlantType, ResourceType } from './gamestate';
import { mapsRecharged } from './maps';
import { Move, MoveName } from './move';
import { alternatePowerPlants, plantCatalogue, powerPlants, set1PowerPlants } from './powerPlants';

const { Coal, Oil, Garbage, Uranium, Hybrid, Wind, Nuclear, GarbageOilHybrid } = PowerPlantType;

// "number type cost→cities" from Appendix A of engine-update-scope.md.
function card(number: number, type: PowerPlantType, cost: number, citiesPowered: number) {
    return { number, type, cost, citiesPowered };
}
const shape = (plants: PowerPlant[]) =>
    plants.filter((p) => p.type != PowerPlantType.Step3).map((p) => card(p.number, p.type, p.cost, p.citiesPowered));

// Every current player passes until the phase changes.
function passPhase(G: GameState): GameState {
    const phase = G.phase;
    while (G.phase == phase && G.currentPlayers.length > 0) {
        const p = G.currentPlayers[0];
        G.players[p].availableMoves = availableMoves(G, G.players[p]);
        G = move(G, { name: MoveName.Pass, data: true }, p);
    }
    return G;
}

const set1Appendix = [
    card(1, Coal, 3, 1), card(2, Oil, 2, 1), card(3, Coal, 1, 1), card(4, Hybrid, 1, 1), card(5, Hybrid, 3, 2),
    card(6, Garbage, 1, 2), card(7, Oil, 2, 2), card(8, Uranium, 1, 2), card(9, Coal, 3, 3), card(10, Wind, 0, 1),
    card(11, Wind, 0, 1), card(12, Oil, 1, 2), card(13, Hybrid, 1, 2), card(14, Coal, 3, 4), card(15, Wind, 0, 2),
    card(16, Wind, 0, 2), card(19, Uranium, 1, 3), card(20, Oil, 1, 3), card(21, Garbage, 3, 5), card(22, Oil, 2, 4),
    card(23, Coal, 2, 4), card(24, Uranium, 1, 4), card(25, Oil, 3, 5), card(26, Wind, 0, 3), card(27, Garbage, 1, 4),
    card(28, Coal, 3, 5), card(29, Hybrid, 3, 5), card(30, Coal, 1, 4), card(31, Uranium, 1, 5), card(32, Wind, 0, 4),
    card(33, Garbage, 2, 5), card(34, Coal, 3, 6), card(35, Coal, 1, 5), card(36, Hybrid, 2, 6), card(37, Oil, 3, 7),
    card(38, Uranium, 1, 6), card(39, Wind, 0, 5), card(40, Oil, 1, 6), card(42, Garbage, 2, 7), card(44, Nuclear, 0, 6),
    card(46, Coal, 2, 7), card(50, Uranium, 2, 8), card(52, Garbage, 3, 8), card(54, Oil, 2, 8), card(57, Oil, 3, 9),
    card(60, Nuclear, 0, 8),
]; // prettier-ignore

const set2Appendix = [
    card(3, Coal, 2, 1), card(4, Coal, 2, 1), card(5, Garbage, 2, 1), card(6, Oil, 1, 1), card(7, Coal, 1, 1),
    card(8, GarbageOilHybrid, 3, 2), card(9, Coal, 3, 2), card(10, Oil, 2, 2), card(11, Wind, 0, 1), card(12, Coal, 2, 2),
    card(13, Uranium, 1, 2), card(14, Garbage, 1, 2), card(15, Coal, 1, 2), card(16, Garbage, 2, 3), card(17, Wind, 0, 2),
    card(18, Oil, 2, 3), card(19, Garbage, 1, 3), card(20, Coal, 3, 4), card(21, Uranium, 1, 3), card(22, GarbageOilHybrid, 3, 5),
    card(23, Oil, 2, 4), card(24, Wind, 0, 3), card(25, Coal, 2, 5), card(26, Garbage, 1, 4), card(27, Coal, 1, 4),
    card(28, Wind, 0, 3), card(29, Coal, 2, 5), card(30, Oil, 2, 5), card(31, Wind, 0, 4), card(32, Uranium, 2, 5),
    card(33, Coal, 3, 6), card(34, Garbage, 3, 6), card(35, GarbageOilHybrid, 2, 5), card(36, Wind, 0, 5), card(37, Uranium, 2, 6),
    card(38, Oil, 3, 6), card(39, Garbage, 2, 6), card(40, Coal, 2, 6), card(42, Oil, 2, 6), card(44, Wind, 0, 6),
    card(46, Garbage, 2, 7), card(50, Uranium, 2, 7),
]; // prettier-ignore

describe('New power plant decks', () => {
    it('matches the repo alternate deck to the Set 2 list in Appendix A', () => {
        expect(shape(alternatePowerPlants)).to.deep.equal(set2Appendix);
    });

    it('holds the Set 1 list from Appendix A, with the plus flags and a Step 3 card', () => {
        expect(shape(set1PowerPlants)).to.deep.equal(set1Appendix);
        expect(set1PowerPlants.filter((p) => p.plus).map((p) => p.number)).to.deep.equal([46, 50, 52, 54, 57, 60]);
        expect(set1PowerPlants.filter((p) => p.type == PowerPlantType.Step3)).to.have.length(1);
    });

    it('flags plug cards: 01–16 in Set 1', () => {
        expect(set1PowerPlants.filter((p) => p.plug).map((p) => p.number)).to.deep.equal([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        ]);
    });

    it('flags plug cards: 03–15 in the standard deck and Set 2', () => {
        for (const deck of [powerPlants, alternatePowerPlants]) {
            const plugs = deck.filter((p) => p.plug).map((p) => p.number);
            expect(plugs).to.deep.equal([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            expect(deck.every((p) => typeof p.plug == 'boolean')).to.be.true;
        }
    });

    it('treats cards saved without a plug flag as standard cards', () => {
        expect(hasPlug({ number: 15, type: Coal, cost: 2, citiesPowered: 3 })).to.be.true;
        expect(hasPlug({ number: 16, type: Oil, cost: 2, citiesPowered: 3 })).to.be.false;
        expect(hasPlug({ number: 16, type: Wind, cost: 0, citiesPowered: 2, plug: true })).to.be.true;
    });

    it('keeps the new decks to Recharged for now', () => {
        for (const plantDeck of ['set1', 'set2', 'shuffled', 'random'] as const) {
            expect(() => setup(3, { map: 'USA', variant: 'original', plantDeck }), plantDeck).to.throw('Recharged');
        }
    });

    it('throws a clear error for a deck and map without map notes', () => {
        expect(() => deckNote('set1', 'Atlantis')).to.throw('There are no Set 1 map notes for Atlantis.');
        expect(() => deckNote('set2', 'Atlantis')).to.throw('There are no Set 2 map notes for Atlantis.');
    });

    it('stores the deck only when it is not the standard deck', () => {
        expect(setup(3, { map: 'USA', variant: 'recharged' }, 'd').options).not.to.have.property('plantDeck');
        expect(setup(3, { map: 'USA', variant: 'recharged', plantDeck: 'standard' }, 'd').options).not.to.have.property(
            'plantDeck'
        );
        expect(setup(3, { map: 'USA', variant: 'recharged', plantDeck: 'set1' }, 'd').options.plantDeck).to.equal(
            'set1'
        );
    });

    it('plays Set 2 on Europe and North America as the alternate deck', () => {
        for (const map of ['Europe', 'North America'] as MapName[]) {
            const viaDeck = setup(4, { map, variant: 'recharged', plantDeck: 'set2' }, 'alt');
            const viaOption = setup(4, { map, variant: 'recharged', alternatePowerPlants: true }, 'alt');
            expect(viaDeck.options.alternatePowerPlants, map).to.be.true;
            expect(viaDeck.options, map).not.to.have.property('plantDeck');
            expect(JSON.stringify(viaDeck), map).to.equal(JSON.stringify(viaOption));
        }
    });

    const noChangeMaps: MapName[] = [
        'USA',
        'Benelux',
        'Central Europe',
        'Korea',
        'Japan',
        'UK & Ireland',
        'Europe',
        'North America',
        'Baden-Württemberg',
    ];
    const inGame = (G: GameState) =>
        [...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck].filter((p) => p.type != PowerPlantType.Step3);

    it('prepares Set 1 and Set 2 on the maps whose notes need no changes', () => {
        // 46 Set 1 cards less 52, 54, 57 and 60; 42 Set 2 cards. Recharged removals:
        // 1+5, 2+6 and 1+3 plants with 2, 3 and 4 players (base-recharged.pdf p.3).
        const removed = [6, 8, 4, 0, 0];
        for (const [deck, total] of [
            ['set1', 42],
            ['set2', 42],
        ] as const) {
            for (const map of noChangeMaps) {
                for (const n of [2, 3, 4, 5, 6]) {
                    const label = `${deck} ${map} ${n}p`;
                    const G = setup(n, { map, variant: 'recharged', plantDeck: deck }, `nc-${label}`);
                    const market = [...G.actualMarket, ...G.futureMarket];
                    expect(market.length, label).to.equal(map == 'Europe' ? 9 : 8);
                    expect(market.every(hasPlug), label).to.be.true;
                    expect(inGame(G).length, label).to.equal(total - removed[n - 2]);
                    expect(
                        inGame(G).some((p) => [52, 54, 57, 60].includes(p.number)),
                        label
                    ).to.be.false;
                    const step3At = G.powerPlantsDeck.findIndex((p) => p.type == PowerPlantType.Step3);
                    const below = map == 'UK & Ireland' ? 2 : 0;
                    expect(step3At, label).to.equal(G.powerPlantsDeck.length - 1 - below);
                    if (map != 'Europe') expect(hasPlug(G.powerPlantsDeck[0]), `${label}: plug card on top`).to.be.true;
                    expect(G.players[0].garbageOilHybridCapacity !== undefined, label).to.equal(deck == 'set2');
                }
            }
        }
    });

    const game = (deck: 'set1' | 'set2', map: MapName, n: number) =>
        setup(n, { map, variant: 'recharged', plantDeck: deck }, `${deck}-${map}-${n}`);
    const numbers = (plants: PowerPlant[]) => plants.map((p) => p.number);
    const marketOf = (G: GameState) => numbers([...G.actualMarket, ...G.futureMarket]);
    const players = [2, 3, 4, 5, 6];
    const recharged = [6, 8, 4, 0, 0];

    it('boxes the plants named in the map notes', () => {
        const boxed: [MapName, number[], number[]][] = [
            ['France', [10], [11]],
            ['Russia', [6, 21], [5, 14]],
            ['Australia', [19], [21]],
            ['India', [8], [13]],
            ['South Africa', [7], [10]],
        ];
        for (const [map, set1, set2] of boxed) {
            for (const [deck, plants] of [
                ['set1', set1],
                ['set2', set2],
            ] as const) {
                for (const n of players) {
                    const G = game(deck, map, n);
                    expect(numbers(inGame(G)), `${deck} ${map} ${n}p`).not.to.include.members(plants);
                    expect(
                        numbers(inGame(G)).some((p) => plants.includes(p)),
                        `${deck} ${map} ${n}p`
                    ).to.be.false;
                }
            }
        }
    });

    it('prepares France: the note plant in the market and France removals', () => {
        // France removes no further plug card with 2 and 4 players and one with 3; the
        // socket removals stay 5/6/3 (maps-france-italy.pdf p.2).
        const removed = [5, 7, 3, 0, 0];
        for (const [deck, fixed] of [
            ['set1', 8],
            ['set2', 13],
        ] as const) {
            for (const n of players) {
                const G = game(deck, 'France', n);
                expect(marketOf(G), `${deck} ${n}p`).to.include(fixed);
                expect(inGame(G).length, `${deck} ${n}p`).to.equal(42 - 1 - removed[n - 2]);
            }
        }
    });

    it('prepares Brazil: the note plants in the market and the biogas plants protected', () => {
        const brazil: [string, number[], number[]][] = [
            ['set1', [6], [21, 27, 33, 42]],
            ['set2', [5, 14], [16, 19, 26, 39]],
        ];
        for (const [deck, fixed, protectedPlants] of brazil) {
            for (const n of players) {
                const G = game(deck as 'set1' | 'set2', 'Brazil', n);
                expect(marketOf(G), `${deck} ${n}p`).to.include.members(fixed);
                expect(numbers(inGame(G)), `${deck} ${n}p`).to.include.members(protectedPlants);
                expect(inGame(G).length, `${deck} ${n}p`).to.equal(42 - recharged[n - 2]);
            }
        }
    });

    it('prepares Russia: a market of 3 + 3, the plug cards on top and only socket cards removed', () => {
        for (const deck of ['set1', 'set2'] as const) {
            for (const n of players) {
                const G = game(deck, 'Russia', n);
                expect([G.actualMarket.length, G.futureMarket.length], `${deck} ${n}p`).to.deep.equal([3, 3]);
                const plugs = G.powerPlantsDeck.filter(hasPlug).length;
                expect(G.powerPlantsDeck.slice(0, plugs).every(hasPlug), `${deck} ${n}p: plug cards on top`).to.be.true;
                expect(inGame(G).length, `${deck} ${n}p`).to.equal(42 - 2 - [6, 8, 4, 0, 0][n - 2]);
            }
        }
    });

    it('prepares Quebec: the note plants in the market, green (wind) plants never removed', () => {
        for (const n of players) {
            const set1 = game('set1', 'Quebec', n);
            expect(marketOf(set1), `set1 ${n}p`).to.include.members([11, 15, 16]);
            const green = numbers(inGame(set1).filter((p) => p.type == PowerPlantType.Wind));
            expect(green, `set1 ${n}p`).to.have.members([10, 11, 15, 16, 26, 32, 39]);

            const set2 = game('set2', 'Quebec', n);
            expect(marketOf(set2), `set2 ${n}p`).to.include(11);
            expect(numbers(set2.powerPlantsDeck.slice(0, 2)), `set2 ${n}p: 17 and 24 on top`).to.deep.equal([17, 24]);
            expect(hasPlug(set2.powerPlantsDeck[2]), `set2 ${n}p: then the plug card`).to.be.true;
        }
        // Fusion plant 44 is not green, so the random removals can take it.
        const without44 = [...Array(20).keys()].filter((i) => {
            const G = setup(2, { map: 'Quebec', variant: 'recharged', plantDeck: 'set1' }, `quebec-44-${i}`);
            return !inGame(G).some((p) => p.number == 44);
        });
        expect(without44.length).to.be.above(0);
    });

    it('prepares Spain & Portugal: the note plants go on top of the stack at the start of Step 2', () => {
        const spain: ['set1' | 'set2', number[]][] = [
            ['set1', [15, 16, 26]],
            ['set2', [17, 24, 28]],
        ];
        for (const [deck, aside] of spain) {
            let G = game(deck, 'Spain & Portugal', 3);
            expect(
                numbers(inGame(G)).some((p) => aside.includes(p)),
                deck
            ).to.be.false;
            expect(numbers(G.stepTwoTopPlants!), deck).to.deep.equal(aside);

            G.phase = Phase.Building;
            G.currentPlayers = [G.playerOrder[2]];
            G.players[0].cities = G.map.cities.slice(0, 7).map((c) => ({ name: c.name, position: 0 }));
            G = passPhase(G);
            expect(G.step, deck).to.equal(2);
            expect(marketOf(G), `${deck}: the first replaces the smallest plant`).to.include(aside[0]);
            expect(numbers(G.powerPlantsDeck.slice(0, 2)), deck).to.deep.equal(aside.slice(1));
            expect(G.stepTwoTopPlants, deck).to.be.undefined;
        }
    });

    it('gives India garbage plants of the new decks one more garbage to run, but no more storage', () => {
        const G = game('set1', 'India', 4);
        const plant = [...inGame(G), ...(G.stepTwoTopPlants ?? [])].find((p) => p.number == 21)!;
        expect([plant.cost, plant.storage]).to.deep.equal([4, 6]);
    });

    it('stops Germany and Italy uranium after the plant named in the map notes is bought', () => {
        for (const [deck, stop] of [
            ['set1', 38],
            ['set2', 37],
        ] as const) {
            for (const map of ['Germany', 'Italy'] as MapName[]) {
                const bought = (plant: number) => {
                    let G = game(deck, map, 3);
                    G.round = 2;
                    G.plantDiscountActive = false;
                    G.actualMarket = [...G.actualMarket.slice(0, 3), card(plant, PowerPlantType.Uranium, 1, 6)].map(
                        (p) => ({ ...p })
                    ) as PowerPlant[];
                    const p = G.currentPlayers[0];
                    G.players[p].money = 200;
                    G.players[p].availableMoves = availableMoves(G, G.players[p]);
                    G = move(G, { name: MoveName.ChoosePowerPlant, data: plant }, p);
                    return G.card39Bought;
                };
                expect(bought(stop)).to.be.true;
                expect(bought(39)).to.be.false;
            }
        }
    });

    it('removes the Middle East plants the notes name from the opening current market', () => {
        // The notes' plants are exactly the garbage and nuclear plants with a plug.
        const byRule = (plants: PowerPlant[]) =>
            numbers(plants.filter((p) => p.plug && [PowerPlantType.Garbage, PowerPlantType.Uranium].includes(p.type)));
        expect(byRule(set1PowerPlants)).to.deep.equal([6, 8]);
        expect(byRule(alternatePowerPlants)).to.deep.equal([5, 13, 14]);
        for (const [deck, gone] of [
            ['set1', [6, 8]],
            ['set2', [5, 13, 14]],
        ] as const) {
            for (const n of players) {
                for (let seed = 0; seed < 10; seed++) {
                    const G = setup(n, { map: 'Middle East', variant: 'recharged', plantDeck: deck }, `me-${seed}`);
                    const current = numbers(G.actualMarket);
                    expect(
                        current.some((p) => (gone as readonly number[]).includes(p)),
                        `${deck} ${n}p`
                    ).to.be.false;
                }
            }
        }
    });

    it('closes garbage buying in Step 1 on Middle East with Set 2', () => {
        const garbageOffered = (deck: 'set1' | 'set2', step: number) => {
            const G = game(deck, 'Middle East', 3);
            G.phase = Phase.Resources;
            G.step = step;
            const player = G.players[G.currentPlayers[0]];
            player.powerPlants = [{ number: 26, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 4 }];
            updatePlayerCapacity(player);
            G.garbageMarket = 6;
            return !!availableMoves(G, player)[MoveName.BuyResource]?.some((b) => b.resource == ResourceType.Garbage);
        };
        expect(garbageOffered('set2', 1)).to.be.false;
        expect(garbageOffered('set2', 2)).to.be.true;
        expect(garbageOffered('set1', 1)).to.be.true;
    });

    it('prepares China: lowest plants for round 1, then up to 30 ascending, 31–35 with Step 3, the rest', () => {
        const china: ['set1' | 'set2', Record<number, number[]>][] = [
            ['set1', { 2: [1, 2, 8, 12, 15, 22, 27, 28, 32, 36, 42], 4: [1, 2, 8, 15, 27, 32, 36], 5: [1, 2, 32] }],
            ['set2', { 2: [3, 6, 10, 13, 17, 18, 25, 26, 31, 34, 35], 4: [3, 6, 13, 17, 26, 31, 35], 5: [3, 6, 31] }],
        ];
        for (const [deck, boxedBy] of china) {
            for (const n of players) {
                const boxed = boxedBy[n <= 3 ? 2 : n == 4 ? 4 : 5];
                const label = `${deck} ${n}p`;
                const G = game(deck, 'China', n);
                const all = numbers(inGame(G));
                expect(
                    all.some((p) => boxed.includes(p)),
                    label
                ).to.be.false;
                expect(G.futureMarket, label).to.be.empty;
                const low = numbers([...G.actualMarket, ...G.powerPlantsDeck]).filter((p) => p <= 30);
                expect(numbers(G.actualMarket), label).to.deep.equal(low.slice(0, n));
                expect(low, `${label}: ascending`).to.deep.equal([...low].sort((a, b) => a - b));
                const deckNumbers = numbers(G.powerPlantsDeck);
                const lowInDeck = low.length - n;
                const middle = deckNumbers.slice(
                    lowInDeck,
                    lowInDeck + deckNumbers.filter((p) => (p > 30 && p <= 35) || p == 99).length
                );
                expect(middle, label).to.include(99);
                expect(
                    middle.every((p) => (p > 30 && p <= 35) || p == 99),
                    label
                ).to.be.true;
                expect(
                    deckNumbers.slice(lowInDeck + middle.length).every((p) => p > 35),
                    label
                ).to.be.true;
            }
        }
    });

    it('prepares Bremen: the note plants boxed and no further removal', () => {
        for (const deck of ['set1', 'set2'] as const) {
            for (const n of players) {
                const G = game(deck, 'Bremen', n);
                expect(inGame(G).length, `${deck} ${n}p`).to.equal(42 - (n <= 4 ? 11 : 9));
                expect(hasPlug(G.powerPlantsDeck[0]), `${deck} ${n}p`).to.be.true;
            }
        }
    });

    it('prepares Manhattan: plug cards boxed, 8 to the market, any left on top, no Step 3 card', () => {
        // In game: the deck less the 2–3P plants and the boxed plug cards (7 for Set 1, 4 for Set 2).
        const expected = { set1: [32, 32, 35, 35, 35], set2: [35, 35, 38, 38, 38] };
        for (const deck of ['set1', 'set2'] as const) {
            for (const n of players) {
                const label = `${deck} ${n}p`;
                const G = game(deck, 'Manhattan', n);
                expect(
                    G.powerPlantsDeck.some((p) => p.type == PowerPlantType.Step3),
                    label
                ).to.be.false;
                expect(inGame(G).length, label).to.equal(expected[deck][n - 2]);
                expect([...G.actualMarket, ...G.futureMarket].every(hasPlug), label).to.be.true;
                const plugOnTop = !(deck == 'set1' && n <= 3);
                expect(hasPlug(G.powerPlantsDeck[0]), label).to.equal(plugOnTop);
                expect(G.powerPlantsDeck.slice(1).some(hasPlug), label).to.be.false;
            }
        }
    });

    // A Northern Europe game at 5 players (no player-count removal) with these regions in play.
    const northernEurope = (deck: 'set1' | 'set2', regions: string[]) => {
        for (let seed = 0; seed < 500; seed++) {
            const G = setup(5, { map: 'Northern Europe', variant: 'recharged', plantDeck: deck }, `ne-${seed}`);
            const inPlay = new Set(G.map.cities.map((c) => c.region));
            if (regions.every((r) => inPlay.has(r))) return G;
        }
        throw new Error(`no seed with ${regions}`);
    };
    const plant = (G: GameState, n: number) => inGame(G).filter((p) => p.number == n);

    it('swaps Northern Europe regional plants into Set 1 as its notes say', () => {
        // Denmark (orange), Sweden North (yellow) and the Baltic States (pink).
        const G = northernEurope('set1', ['orange', 'yellow', 'pink']);
        // Denmark's oil 19 and 26 replace Set 1's; Sweden North and the Baltic States box
        // Set 1's 26 and 19 again, which leaves Denmark's alone.
        expect(plant(G, 19).map((p) => p.type)).to.deep.equal([PowerPlantType.Oil]);
        expect(plant(G, 26).map((p) => p.type)).to.deep.equal([PowerPlantType.Oil]);
        // Sweden North: wind 21 replaces Set 1's 21; its uranium 25 joins Set 1's oil 25 as 25.1.
        expect(plant(G, 21).map((p) => p.type)).to.deep.equal([PowerPlantType.Wind]);
        expect(plant(G, 25).map((p) => p.type)).to.deep.equal([PowerPlantType.Oil]);
        expect(plant(G, 25.1).map((p) => [p.type, p.cost, p.citiesPowered])).to.deep.equal([
            [PowerPlantType.Uranium, 1, 4],
        ]);
        // Baltic States: oil 18 is new to Set 1, wind 22 replaces Set 1's 22.
        expect(plant(G, 18).map((p) => p.type)).to.deep.equal([PowerPlantType.Oil]);
        expect(plant(G, 22).map((p) => p.type)).to.deep.equal([PowerPlantType.Wind]);
    });

    it('swaps Northern Europe regional plants into Set 2 by number, with no fractional plant', () => {
        const G = northernEurope('set2', ['yellow', 'pink']);
        expect(plant(G, 25).map((p) => p.type)).to.deep.equal([PowerPlantType.Uranium]);
        expect(plant(G, 25.1)).to.be.empty;
        expect(plant(G, 18).map((p) => p.type)).to.deep.equal([PowerPlantType.Oil]);
        expect(inGame(G).every((p) => Number.isInteger(p.number))).to.be.true;
    });

    it("puts Norway's 07 and Sweden South's 10 among the plug cards with both decks", () => {
        for (const deck of ['set1', 'set2'] as const) {
            const G = northernEurope(deck, ['red', 'purple']);
            expect(
                plant(G, 7).map((p) => [p.type, p.plug]),
                deck
            ).to.deep.equal([[PowerPlantType.Wind, true]]);
            expect(
                plant(G, 10).map((p) => [p.type, p.plug]),
                deck
            ).to.deep.equal([[PowerPlantType.Uranium, true]]);
        }
    });

    it('plays a game with both 25s: 25.1 bids from 25, shows as 25 and sorts just above 25', () => {
        let G = northernEurope('set1', ['yellow']);
        const both = inGame(G).filter((p) => Math.floor(p.number) == 25);
        G.round = 2;
        G.plantDiscountActive = false;
        G.actualMarket = [...G.actualMarket.slice(0, 2), ...both];
        G.futureMarket = [...G.futureMarket];
        expect(numbers(G.actualMarket).slice(2)).to.deep.equal([25, 25.1]);
        const p = G.currentPlayers[0];
        G.players[p].money = 100;
        // A city in Sweden, so the nuclear 25.1 may be bought.
        G.players[p].cities = [{ name: G.map.cities.find((c) => c.region == 'yellow')!.name, position: 0 }];
        G.players[p].availableMoves = availableMoves(G, G.players[p]);
        expect(G.players[p].availableMoves!.ChoosePowerPlant).to.include.members([25, 25.1]);
        G = move(G, { name: MoveName.ChoosePowerPlant, data: 25.1 }, p);
        expect(G.chosenPowerPlant!.type).to.equal(PowerPlantType.Uranium);
        expect(G.minimunBid).to.equal(25);
        const chose = G.log.filter((l) => l.type == 'move').pop()!;
        expect(chose.type == 'move' && chose.simple).to.contain('chooses Power Plant 25');
        expect(chose.type == 'move' && chose.simple).not.to.contain('25.1');
    });

    it('runs an India garbage/oil hybrid on its printed oil, or one more token with garbage', () => {
        const G = game('set2', 'India', 3);
        G.phase = Phase.Bureaucracy;
        const player = G.players[0];
        const hybrid = plantCatalogue('India', false, 'set2').find((p) => p.number == 22)!; // G/O 3→5
        player.powerPlants = [hybrid];
        updatePlayerCapacity(player);
        expect(player.garbageOilHybridCapacity, 'storage stays twice the printed 3').to.equal(6);
        player.garbageLeft = 4;
        player.oilLeft = 3;
        player.powerPlantsNotUsed = [22];
        const runs = availableMoves(G, player)[MoveName.UsePowerPlant]!.map((u) => u.resourcesSpent.join(','));
        expect(runs).to.deep.equal([
            'garbage,garbage,garbage,garbage',
            'garbage,garbage,garbage,oil',
            'garbage,garbage,oil,oil',
            'garbage,oil,oil,oil',
            'oil,oil,oil',
        ]);

        player.cities = G.map.cities.slice(0, 5).map((c) => ({ name: c.name, position: 0 }));
        const target = (garbage: number, oil: number) => {
            player.garbageLeft = garbage;
            player.oilLeft = oil;
            return calculateMaxCitiesPowered(G, player);
        };
        expect(target(0, 3), 'oil alone').to.equal(5);
        expect(target(2, 2), 'two garbage and two oil').to.equal(5);
        expect(target(1, 2), 'three tokens with garbage are one short').to.equal(0);
    });

    it('labels plants by their printed number, with the printed plus', () => {
        expect(plantLabel({ number: 25.1, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 4 })).to.equal('25');
        expect(plantLabel(set1PowerPlants.find((p) => p.number == 46))).to.equal('46+');
        expect(plantLabel(powerPlants.find((p) => p.number == 46))).to.equal('46');
    });

    it('sets up every deck, map and player count reproducibly, and replays a seeded game', () => {
        const randomMoves = (G: GameState, count: number, seed: string) => {
            const rng = seedrandom(seed);
            for (let i = 0; i < count && G.phase != Phase.GameEnd; i++) {
                const p = G.currentPlayers.find((c) => Object.keys(G.players[c].availableMoves ?? {}).length > 0);
                if (p === undefined) break;
                const moves = G.players[p].availableMoves!;
                const names = (Object.keys(moves) as MoveName[]).filter(
                    (n) => n != MoveName.ReopenPowering && (moves[n] as unknown[] | undefined)?.length
                );
                const name =
                    names.includes(MoveName.Pass) && rng() < 0.3
                        ? MoveName.Pass
                        : names[Math.floor(rng() * names.length)];
                const options = moves[name] as unknown[];
                G = move(G, { name, data: options[Math.floor(rng() * options.length)] } as Move, p);
            }
            return G;
        };
        const summary = (G: GameState) =>
            JSON.stringify([
                G.round,
                G.phase,
                G.step,
                numbers(G.actualMarket),
                numbers(G.futureMarket),
                G.players.map((p) => [p.money, numbers(p.powerPlants), p.cities.length]),
            ]);
        for (const deck of ['set1', 'set2'] as const) {
            for (const map of mapsRecharged.map((m) => m.name as MapName)) {
                for (const n of players) {
                    const label = `${deck} ${map} ${n}p`;
                    const first = game(deck, map, n);
                    expect(JSON.stringify(game(deck, map, n)), `${label}: same seed, same setup`).to.equal(
                        JSON.stringify(first)
                    );
                    const fixed = deckNote(deck, map).market ?? [];
                    const market = [...first.actualMarket, ...first.futureMarket];
                    // China deals from its ordered stack; Middle East replaces removed
                    // garbage and nuclear plants with draws from the stack.
                    if (map != 'China' && map != 'Middle East') {
                        expect(
                            market.every((p) => hasPlug(p) || fixed.includes(p.number)),
                            `${label}: plug market`
                        ).to.be.true;
                    }
                    const played = randomMoves(first, 120, label);
                    expect(summary(reconstructState(played)), `${label}: replay`).to.equal(summary(played));
                }
            }
        }
    }).timeout(60000);
});
