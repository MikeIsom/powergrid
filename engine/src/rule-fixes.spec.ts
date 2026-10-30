import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { getPowerPlant, move, setup } from './engine';
import { GameState, Phase, Variant } from './gamestate';
import { MoveName } from './move';

const variants: Variant[] = ['original', 'recharged'];

function plants(...numbers: number[]) {
    return numbers.map((n) => getPowerPlant(n));
}

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

function buildPrices(G: GameState, playerId: number): Map<string, number> {
    const builds = availableMoves(G, G.players[playerId])[MoveName.Build] ?? [];
    return new Map(builds.map((b) => [b.name, b.price]));
}

describe('Rule fixes', () => {
    it('F1: starts France with 9 garbage on spaces 6–8 under Recharged, 6 under Original', () => {
        const recharged = setup(3, { map: 'France', variant: 'recharged' }, 'f1');
        expect([recharged.garbageMarket, recharged.garbageSupply]).to.deep.equal([9, 15]);
        const original = setup(3, { map: 'France', variant: 'original' }, 'f1');
        expect([original.garbageMarket, original.garbageSupply]).to.deep.equal([6, 18]);
    });

    it('F2: jumps to the other UK & Ireland island into any city with an open slot', () => {
        const G = setup(5, { map: 'UK & Ireland', variant: 'recharged' }, 'f2');
        G.phase = Phase.Building;
        const player = G.players[0];
        player.money = 200;
        const gbCity = G.map.cities.find((c) => c.island === 'gb')!;
        const [occupied, empty] = G.map.cities.filter((c) => c.island === 'ie');
        player.cities = [{ name: gbCity.name, position: 0 }];
        G.players[1].cities = [{ name: occupied.name, position: 0 }];

        G.step = 1;
        let prices = buildPrices(G, 0);
        expect(prices.get(occupied.name), 'Step 1: no open slot').to.be.undefined;
        expect(prices.get(empty.name), 'Step 1: empty city at 20 + 10').to.equal(30);

        G.step = 2;
        prices = buildPrices(G, 0);
        expect(prices.get(occupied.name), 'Step 2: occupied city at 20 + 15').to.equal(35);
        expect(prices.get(empty.name), 'Step 2: empty city at 20 + 10').to.equal(30);
    });

    it('F3: treats only green (wind) plants as ecological on Quebec', () => {
        for (const variant of variants) {
            // Fusion plant 50 may be removed at random in setup (with 2 players)...
            const removed = [...Array(20).keys()].filter((i) => {
                const G = setup(2, { map: 'Quebec', variant }, `f3-${i}`);
                return ![...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck].some((p) => p.number == 50);
            });
            expect(removed.length, `${variant}: 50 removed in some setups`).to.be.above(0);

            // ...and may be put under the stack in Phase 5, while wind plants never are.
            let G = setup(3, { map: 'Quebec', variant }, 'f3');
            G.actualMarket = plants(3, 4, 5, 6);
            G.futureMarket = plants(7, 8, 44, 50);
            G.phase = Phase.Bureaucracy;
            G.currentPlayers = [...G.playerOrder];
            G = passPhase(G);
            expect(G.powerPlantsDeck[G.powerPlantsDeck.length - 1].number, variant).to.equal(50);
        }
    });
});
