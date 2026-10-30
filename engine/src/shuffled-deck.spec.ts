import { expect } from 'chai';
import 'mocha';
import seedrandom from 'seedrandom';
import { availableMoves } from './available-moves';
import { SHUFFLED_EXCLUDED_MAPS } from './deck-notes';
import { move, reconstructState, setup, updatePlayerCapacity } from './engine';
import { CardDeck, GameState, hasPlug, MapName, Phase, PowerPlant, PowerPlantType, ResourceType } from './gamestate';
import { mapsRecharged } from './maps';
import { Move, MoveName } from './move';
import { alternatePowerPlants, powerPlants, set1PowerPlants } from './powerPlants';

const players = [2, 3, 4, 5, 6];
const allowedMaps = mapsRecharged.map((m) => m.name as MapName).filter((m) => !SHUFFLED_EXCLUDED_MAPS.includes(m));
const shuffled = (map: MapName, n: number, seed: string) =>
    setup(n, { map, variant: 'recharged', plantDeck: 'shuffled' }, seed);
const inGame = (G: GameState) =>
    [...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck].filter((p) => p.type != PowerPlantType.Step3);
const numbers = (plants: PowerPlant[]) => plants.map((p) => p.number);
const decks: Record<CardDeck, PowerPlant[]> = {
    standard: powerPlants,
    set1: set1PowerPlants,
    set2: alternatePowerPlants,
};
// A 5-player game (no player-count removal) on this map whose cards meet the condition.
const findGame = (map: MapName, condition: (G: GameState) => boolean) => {
    for (let i = 0; i < 300; i++) {
        const G = shuffled(map, 5, `find-${i}`);
        if (condition(G)) return G;
    }
    throw new Error('no seed found');
};

describe('Shuffled power plant deck', () => {
    it('picks one card for each number, from a deck that prints it', () => {
        const origins = new Set<string>();
        for (let i = 0; i < 30; i++) {
            const G = shuffled('USA', 5, `one-${i}`);
            const picks = G.shuffledDeck!;
            const expected = [...Array(40).keys()].map((n) => n + 1).concat([42, 44, 46, 50]);
            expect(Object.keys(picks).map(Number)).to.deep.equal(expected);
            expect([picks[1], picks[2]]).to.deep.equal(['set1', 'set1']);
            expect(picks[17]).not.to.equal('set1');
            expect(picks[18]).not.to.equal('set1');
            const cards = [...inGame(G), ...G.powerPlantsDeck.filter((p) => p.type == PowerPlantType.Step3)];
            expect(cards.filter((p) => p.type == PowerPlantType.Step3)).to.have.length(1);
            for (const card of inGame(G)) {
                const { origin, ...printed } = card;
                expect(origin).to.equal(picks[card.number]);
                expect(printed, `card ${card.number}`).to.deep.equal(
                    decks[origin!].find((p) => p.number == card.number)
                );
            }
            Object.values(picks).forEach((d) => origins.add(d));
        }
        expect([...origins].sort()).to.deep.equal(['set1', 'set2', 'standard']);
    });

    it('gives the same cards for the same seed and records them in the game', () => {
        const a = shuffled('Germany', 3, 'same');
        expect(JSON.stringify(shuffled('Germany', 3, 'same'))).to.equal(JSON.stringify(a));
        expect(a.options.plantDeck).to.equal('shuffled');
        expect(a.shuffledDeck).to.be.an('object');
    });

    it('is not allowed on the maps whose notes rebuild the whole deck', () => {
        for (const map of ['China', 'Bremen', 'Manhattan', 'Northern Europe'] as MapName[]) {
            expect(() => shuffled(map, 3, 'x'), map).to.throw(`cannot be used on ${map}`);
        }
    });

    it('applies a note only to the card version it names', () => {
        // France: box Set 1's 10 / Set 2's 11 / standard 13; Set 1's 08, standard 11 and
        // Set 2's 13 start in the market.
        const has = (G: GameState, n: number) => numbers(inGame(G)).includes(n);
        const market = (G: GameState) => numbers([...G.actualMarket, ...G.futureMarket]);
        let G = findGame('France', (g) => g.shuffledDeck![10] == 'set1');
        expect(has(G, 10), "Set 1's 10 boxed").to.be.false;
        G = findGame('France', (g) => g.shuffledDeck![10] != 'set1');
        expect(has(G, 10), 'another 10 stays').to.be.true;
        G = findGame('France', (g) => g.shuffledDeck![13] == 'standard' && g.shuffledDeck![8] == 'set1');
        expect(has(G, 13), 'standard 13 boxed').to.be.false;
        expect(market(G), "Set 1's 08 in the market").to.include(8);
        G = findGame('France', (g) => g.shuffledDeck![13] == 'set2' && g.shuffledDeck![11] == 'standard');
        expect(market(G), "Set 2's 13 and standard 11 in the market").to.include.members([11, 13]);
    });

    it('puts the standard 18 and 22 below the plug card on top on Quebec', () => {
        const G = findGame('Quebec', (g) => g.shuffledDeck![18] == 'standard' && g.shuffledDeck![22] == 'standard');
        // Set 2's 17 and 24, if in the game, go above the plug card (their own note).
        const above = [17, 24].filter((n) => G.shuffledDeck![n] == 'set2');
        expect(numbers(G.powerPlantsDeck.slice(0, above.length))).to.deep.equal(above);
        expect(hasPlug(G.powerPlantsDeck[above.length])).to.be.true;
        expect(numbers(G.powerPlantsDeck.slice(above.length + 1, above.length + 3))).to.deep.equal([18, 22]);
    });

    it('sets aside the Spain & Portugal plants of every deck for Step 2, in ascending order', () => {
        const G = findGame(
            'Spain & Portugal',
            (g) => g.shuffledDeck![18] == 'standard' && g.shuffledDeck![15] == 'set1'
        );
        const named: Record<CardDeck, number[]> = { standard: [18, 22, 27], set1: [15, 16, 26], set2: [17, 24, 28] };
        const expected = (Object.keys(named) as CardDeck[])
            .reduce((all, d) => all.concat(named[d].filter((n) => G.shuffledDeck![n] == d)), [] as number[])
            .sort((a, b) => a - b);
        expect(numbers(G.stepTwoTopPlants!)).to.deep.equal(expected);
        expect(expected).to.include.members([15, 18]);
    });

    it('stops Germany uranium on the first named plant bought, standard 39, Set 1 38 or Set 2 37', () => {
        const bought = (number: number, origin: CardDeck) => {
            let G = shuffled('Germany', 3, 'stop');
            G.round = 2;
            G.plantDiscountActive = false;
            const plant = { ...decks[origin].find((p) => p.number == number)!, origin };
            G.actualMarket = [...G.actualMarket.slice(0, 3), plant];
            const p = G.currentPlayers[0];
            G.players[p].money = 200;
            G.players[p].availableMoves = availableMoves(G, G.players[p]);
            G = move(G, { name: MoveName.ChoosePowerPlant, data: number }, p);
            return G.card39Bought;
        };
        expect(bought(39, 'standard')).to.be.true;
        expect(bought(38, 'set1')).to.be.true;
        expect(bought(37, 'set2')).to.be.true;
        expect(bought(39, 'set2')).to.be.false;
        expect(bought(38, 'standard')).to.be.false;
    });

    it("closes Middle East garbage in Step 1 when one of Set 2's garbage/oil hybrids is in the game", () => {
        const garbageOffered = (G: GameState) => {
            G.phase = Phase.Resources;
            const player = G.players[G.currentPlayers[0]];
            player.powerPlants = [{ number: 26, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 4 }];
            updatePlayerCapacity(player);
            G.garbageMarket = 6;
            return !!availableMoves(G, player)[MoveName.BuyResource]?.some((b) => b.resource == ResourceType.Garbage);
        };
        const hybrids = (g: GameState) => [8, 22, 35].filter((n) => g.shuffledDeck![n] == 'set2').length;
        expect(garbageOffered(findGame('Middle East', (g) => hybrids(g) > 0))).to.be.false;
        expect(garbageOffered(findGame('Middle East', (g) => hybrids(g) == 0))).to.be.true;
    });

    it('sets up every allowed map reproducibly and replays a seeded game', () => {
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
        for (const map of allowedMaps) {
            for (const n of players) {
                const label = `${map} ${n}p`;
                const first = shuffled(map, n, label);
                expect(JSON.stringify(shuffled(map, n, label)), `${label}: same seed`).to.equal(JSON.stringify(first));
                const played = randomMoves(first, 120, label);
                expect(summary(reconstructState(played)), `${label}: replay`).to.equal(summary(played));
            }
        }
    }).timeout(60000);
});

describe('Random power plant deck', () => {
    const random = (map: MapName, seed: string) => setup(4, { map, variant: 'recharged', plantDeck: 'random' }, seed);

    it('picks the same deck for the same seed, and every deck across seeds', () => {
        const picks = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const pick = random('USA', `pick-${i}`).options.plantDeck;
            expect(random('USA', `pick-${i}`).options.plantDeck).to.equal(pick);
            picks.add(pick!);
        }
        expect([...picks].sort()).to.deep.equal(['set1', 'set2', 'shuffled', 'standard']);
    });

    it('never picks a shuffled deck on China, Bremen, Manhattan or Northern Europe', () => {
        for (const map of SHUFFLED_EXCLUDED_MAPS as MapName[]) {
            const picks = new Set<string>();
            for (let i = 0; i < 40; i++) picks.add(random(map, `x-${i}`).options.plantDeck!);
            expect([...picks].sort(), map).to.deep.equal(['set1', 'set2', 'standard']);
        }
    });

    it('records the pick in the game state and the log, and replays it', () => {
        for (let i = 0; i < 12; i++) {
            const G = random('Germany', `rec-${i}`);
            const pick = G.options.plantDeck!;
            expect(G.options.randomPlantDeck).to.be.true;
            const direct = setup(4, { map: 'Germany', variant: 'recharged', plantDeck: pick }, `rec-${i}`);
            expect(numbers([...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck]), pick).to.deep.equal(
                numbers([...direct.actualMarket, ...direct.futureMarket, ...direct.powerPlantsDeck])
            );
            const logged = G.log.filter(
                (l) => l.type == 'event' && l.event.startsWith('The power plant deck was picked at random')
            );
            expect(logged, pick).to.have.length(1);
            expect(reconstructState(G).log, pick).to.deep.equal(G.log);
        }
    });
});
