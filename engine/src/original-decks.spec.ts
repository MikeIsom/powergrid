import { expect } from 'chai';
import 'mocha';
import seedrandom from 'seedrandom';
import { availableMoves } from './available-moves';
import { SHUFFLED_EXCLUDED_MAPS } from './deck-notes';
import { move, reconstructState, setup } from './engine';
import { CardDeck, GameState, hasPlug, MapName, Phase, PlantDeck, PowerPlant, PowerPlantType } from './gamestate';
import { mapsRecharged } from './maps';
import { Move, MoveName } from './move';
import { alternatePowerPlants, powerPlants, set1PowerPlants } from './powerPlants';

// The new decks under Original rules (engine-update-scope.md, Part 7, rulings O1–O8).
const players = [2, 3, 4, 5, 6];
const original = (map: MapName, n: number, plantDeck: PlantDeck, seed = `${plantDeck}-${map}-${n}`) =>
    setup(n, { map, variant: 'original', plantDeck }, seed);
const numbers = (plants: PowerPlant[]) => plants.map((p) => p.number);
const marketOf = (G: GameState) => numbers([...G.actualMarket, ...G.futureMarket]);
const inGame = (G: GameState) =>
    [...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck].filter((p) => p.type != PowerPlantType.Step3);
const removed = [8, 8, 4, 0, 0];

describe('New power plant decks under Original', () => {
    it('opens with the 8 lowest plants, sets the O2 plant on top and removes 8/8/4 plants (O1–O3)', () => {
        for (const [deck, market, top] of [
            ['set1', [1, 2, 3, 4, 5, 6, 7, 8], 10],
            ['set2', [3, 4, 5, 6, 7, 8, 9, 10], 11],
        ] as const) {
            for (const n of players) {
                const label = `${deck} ${n}p`;
                const G = original('USA', n, deck);
                expect(numbers(G.actualMarket), label).to.deep.equal(market.slice(0, 4));
                expect(numbers(G.futureMarket), label).to.deep.equal(market.slice(4));
                expect(G.powerPlantsDeck[0].number, label).to.equal(top);
                expect(G.powerPlantsDeck[G.powerPlantsDeck.length - 1].type, label).to.equal(PowerPlantType.Step3);
                expect(inGame(G).length, label).to.equal(42 - removed[n - 2]);
            }
        }
    });

    it('opens a shuffled deck with its 8 lowest cards and the lowest of 13, Set 1 10 and Set 2 11 on top', () => {
        const candidates: [number, CardDeck][] = [
            [10, 'set1'],
            [11, 'set2'],
            [13, 'standard'],
        ];
        for (let i = 0; i < 20; i++) {
            const G = original('USA', 5, 'shuffled', `shuffled-${i}`);
            const lowest = numbers(inGame(G)).sort((a, b) => a - b);
            expect(marketOf(G)).to.deep.equal(lowest.slice(0, 8));
            const top = candidates.find(([n, d]) => G.shuffledDeck![n] == d)?.[0];
            if (top !== undefined && !marketOf(G).includes(top)) expect(G.powerPlantsDeck[0].number).to.equal(top);
        }
    });

    it("puts a note's market plants first, then the lowest others (O5)", () => {
        // Brazil Set 2: 05 and 14, then the 6 lowest others; Set 2's 11 on top.
        let G = original('Brazil', 3, 'set2');
        expect(marketOf(G)).to.deep.equal([3, 4, 5, 6, 7, 8, 9, 14]);
        expect(G.powerPlantsDeck[0].number).to.equal(11);
        expect(numbers(inGame(G))).to.include.members([16, 19, 26, 39]);
        // Quebec Set 2: 11 in the market, 17 and 24 on top; 11 is not set on top again.
        G = original('Quebec', 3, 'set2');
        expect(marketOf(G)).to.deep.equal([3, 4, 5, 6, 7, 8, 9, 11]);
        expect(numbers(G.powerPlantsDeck.slice(0, 2))).to.deep.equal([17, 24]);
        // France Set 1: 08 in the market and 10 boxed, so nothing is set on top.
        G = original('France', 3, 'set1');
        expect(marketOf(G)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(numbers(inGame(G))).not.to.include(10);
    });

    it('boxes the highest plug plants on Manhattan (O5)', () => {
        let G = original('Manhattan', 4, 'set2'); // plug 03–15, box 12–15
        expect(marketOf(G)).to.deep.equal([3, 4, 5, 6, 7, 8, 9, 10]);
        expect(G.powerPlantsDeck[0].number).to.equal(11);
        expect(G.powerPlantsDeck.slice(1).some(hasPlug)).to.be.false;
        G = original('Manhattan', 4, 'set1'); // plug 01–16, box 10–16
        expect(marketOf(G)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(G.powerPlantsDeck[0].number).to.equal(9);
        G = original('Manhattan', 3, 'set1'); // 16 boxed first: plug 01–15, box 09–15
        expect(marketOf(G)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(hasPlug(G.powerPlantsDeck[0])).to.be.false;
    });

    it('opens Russia with a 3 + 3 market of the lowest plants (owner’s ruling)', () => {
        for (const n of players) {
            const G = original('Russia', n, 'set1'); // boxes 06 and 21
            expect([numbers(G.actualMarket), numbers(G.futureMarket)], `${n}p`).to.deep.equal([
                [1, 2, 3],
                [4, 5, 7],
            ]);
            expect(G.powerPlantsDeck[0].number, `${n}p`).to.equal(10);
            expect(inGame(G).length, `${n}p`).to.equal(40 - removed[n - 2]);
        }
    });

    it("keeps Europe's own Original preparation with the new decks (owner’s ruling)", () => {
        for (const deck of ['set1', 'set2'] as const) {
            for (const n of players) {
                const G = original('Europe', n, deck);
                const market = [...G.actualMarket, ...G.futureMarket];
                expect(market.length, `${deck} ${n}p`).to.equal(9);
                expect(market.every(hasPlug), `${deck} ${n}p`).to.be.true;
                expect(inGame(G).length, `${deck} ${n}p`).to.equal(42 - removed[n - 2]);
            }
        }
    });

    it('keeps the number-based notes under Original: Bremen and China lists, no Bremen removal (O4)', () => {
        for (const n of players) {
            const bremen = original('Bremen', n, 'set2');
            expect(inGame(bremen).length, `Bremen ${n}p`).to.equal(42 - (n <= 4 ? 11 : 9));
            const china = original('China', n, 'set1');
            expect(numbers(china.actualMarket), `China ${n}p`).to.have.length(n);
            expect(numbers(inGame(china)), `China ${n}p`).not.to.include(32);
        }
    });

    it('stops Germany and Italy uranium under Original on the plants the notes name (O4)', () => {
        const stopped = (map: MapName, deck: PlantDeck, number: number, origin?: CardDeck) => {
            let G = original(map, 3, deck, 'stop');
            G.round = 2;
            const cards = origin == 'set1' ? set1PowerPlants : origin == 'set2' ? alternatePowerPlants : powerPlants;
            const plant = { ...cards.find((p) => p.number == number)!, ...(origin ? { origin } : {}) };
            G.actualMarket = [...G.actualMarket.slice(0, 3), plant];
            const p = G.currentPlayers[0];
            G.players[p].money = 200;
            G.players[p].availableMoves = availableMoves(G, G.players[p]);
            G = move(G, { name: MoveName.ChoosePowerPlant, data: number }, p);
            G.uraniumMarket = 0;
            G.phase = Phase.Bureaucracy;
            G.currentPlayers = [...G.playerOrder];
            while (G.phase == Phase.Bureaucracy) {
                const q = G.currentPlayers[0];
                G.players[q].availableMoves = availableMoves(G, G.players[q]);
                G = move(G, { name: MoveName.Pass, data: true }, q);
            }
            return G.uraniumMarket == 0;
        };
        expect(stopped('Germany', 'set1', 38, 'set1'), 'Germany Set 1 38').to.be.true;
        expect(stopped('Italy', 'set2', 37, 'set2'), 'Italy Set 2 37').to.be.true;
        expect(stopped('Germany', 'standard', 39), 'Germany standard 39').to.be.false;
        expect(stopped('Germany', 'shuffled', 39, 'standard'), 'Germany shuffled, standard 39').to.be.false;
        expect(stopped('Germany', 'shuffled', 38, 'set1'), "Germany shuffled, Set 1's 38").to.be.true;
        expect(stopped('Italy', 'shuffled', 39, 'standard'), 'Italy shuffled, standard 39').to.be.true;
    });

    it('sets up every deck, map and player count reproducibly under Original, and replays a seeded game', () => {
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
                marketOf(G),
                G.players.map((p) => [p.money, numbers(p.powerPlants), p.cities.length]),
            ]);
        for (const deck of ['set1', 'set2', 'shuffled', 'random'] as PlantDeck[]) {
            for (const map of mapsRecharged.map((m) => m.name as MapName)) {
                if (deck == 'shuffled' && SHUFFLED_EXCLUDED_MAPS.includes(map)) continue;
                for (const n of players) {
                    const label = `${deck} ${map} ${n}p`;
                    const first = original(map, n, deck, label);
                    expect(JSON.stringify(original(map, n, deck, label)), `${label}: same seed`).to.equal(
                        JSON.stringify(first)
                    );
                    const played = randomMoves(first, 120, label);
                    expect(summary(reconstructState(played)), `${label}: replay`).to.equal(summary(played));
                }
            }
        }
    }).timeout(120000);
});
