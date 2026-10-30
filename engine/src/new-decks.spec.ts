import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { deckNote } from './deck-notes';
import { move, setup, updatePlayerCapacity } from './engine';
import { GameState, hasPlug, MapName, Phase, PowerPlant, PowerPlantType, ResourceType } from './gamestate';
import { MoveName } from './move';
import { alternatePowerPlants, powerPlants, set1PowerPlants } from './powerPlants';

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

    it('rejects decks that are not available yet', () => {
        expect(() => setup(3, { map: 'USA', variant: 'recharged', plantDeck: 'shuffled' })).to.throw(
            'not available yet'
        );
        expect(() => setup(3, { map: 'USA', variant: 'recharged', plantDeck: 'random' })).to.throw('not available yet');
        expect(() => setup(3, { map: 'USA', variant: 'original', plantDeck: 'set1' })).to.throw('Recharged');
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
});
