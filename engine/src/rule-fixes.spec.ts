import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { setup } from './engine';
import { GameState, Phase, Variant } from './gamestate';
import { MoveName } from './move';

const variants: Variant[] = ['original', 'recharged'];

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
});
