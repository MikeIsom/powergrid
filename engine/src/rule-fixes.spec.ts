import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { addPowerPlant, getPowerPlant, move, setup, updatePlayerCapacity } from './engine';
import { GameState, Phase, ResourceType, Variant } from './gamestate';
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

    it('F4: stops Italy uranium resupply after plant 39 under both variants', () => {
        const uraniumAfterBureaucracy = (map: 'Italy' | 'Germany', variant: Variant, card39Bought: boolean) => {
            let G = setup(3, { map, variant }, 'f4');
            G.uraniumMarket = 0;
            G.uraniumSupply = 12;
            G.card39Bought = card39Bought;
            G.phase = Phase.Bureaucracy;
            G.currentPlayers = [...G.playerOrder];
            G = passPhase(G);
            return G.uraniumMarket;
        };
        for (const variant of variants) {
            expect(uraniumAfterBureaucracy('Italy', variant, true), `Italy ${variant}`).to.equal(0);
            expect(uraniumAfterBureaucracy('Italy', variant, false), `Italy ${variant}, 39 not bought`).to.be.above(0);
        }
        // Germany's phase-out is a Recharged rule only.
        expect(uraniumAfterBureaucracy('Germany', 'recharged', true)).to.equal(0);
        expect(uraniumAfterBureaucracy('Germany', 'original', true)).to.be.above(0);
    });

    it('F5: never removes a Baden-Württemberg plant for city count, also when drawn', () => {
        const G = setup(3, { map: 'Baden-Württemberg', variant: 'original' }, 'f5');
        G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
        G.actualMarket = plants(11, 12, 13);
        G.futureMarket = plants(14, 15, 16, 17);
        G.powerPlantsDeck = plants(8, 20);
        addPowerPlant(G);
        expect(G.actualMarket.map((p) => p.number)).to.deep.equal([8, 11, 12, 13]);
    });

    it('F6: makes the Step 2 changes first when the Step 3 card is drawn in Step 1', () => {
        for (const variant of variants) {
            const G = setup(4, { map: 'USA', variant }, 'f6');
            G.phase = Phase.Bureaucracy;
            G.actualMarket = plants(10, 11, 12, 13);
            G.futureMarket = plants(14, 15, 16);
            G.powerPlantsDeck = plants(99, 20, 30, 40);
            addPowerPlant(G);
            const events = G.log.map((l) => (l.type == 'event' ? l.event : ''));
            expect(events, variant).to.include('Starting Step 2 before Step 3, Power Plant 10 discarded.');
            expect(events, variant).to.include('Step 3 will begin next phase, Power Plant 11 discarded.');
            expect(G.step, variant).to.equal(2);
            expect(G.actualMarket.length, variant).to.equal(6);
            expect(
                G.actualMarket.slice(0, 5).map((p) => p.number),
                variant
            ).to.deep.equal([12, 13, 14, 15, 16]);
        }
    });

    it('F6: makes the Step 2 changes first when the Step 3 card is drawn in a Step 1 auction', () => {
        let G = setup(4, { map: 'USA', variant: 'recharged' }, 'f6-auction');
        G.round = 2;
        G.plantDiscountActive = false;
        G.actualMarket = plants(10, 11, 12, 13);
        G.futureMarket = plants(14, 15, 16);
        G.powerPlantsDeck = plants(99, 20, 30, 40);
        addPowerPlant(G);
        expect(G.futureMarket.map((p) => p.number)).to.include(99);
        G = passPhase(G);
        const events = G.log.map((l) => (l.type == 'event' ? l.event : ''));
        expect(events).to.include('Starting Step 2 before Step 3, Power Plant 10 discarded.');
        expect(events).to.include('Starting Step 3, Power Plant 11 discarded.');
        expect(G.step).to.equal(3);
        expect(G.phase).to.equal(Phase.Resources);
        expect(G.actualMarket.length).to.equal(6);
        expect(G.futureMarket).to.be.empty;
    });

    it('F7: puts a first house only in an empty city, in every step', () => {
        for (const variant of variants) {
            for (const step of [2, 3]) {
                const G = setup(3, { map: 'Germany', variant }, 'f7');
                G.phase = Phase.Building;
                G.step = step;
                const [occupied, empty] = G.map.cities;
                G.players[1].cities = [{ name: occupied.name, position: 0 }];
                const prices = buildPrices(G, 0);
                expect(prices.get(occupied.name), `${variant} step ${step}`).to.be.undefined;
                expect(prices.get(empty.name), `${variant} step ${step}`).to.equal(10);
            }
        }
    });

    it('F7: still lets a first house share a Japan starting city', () => {
        const G = setup(3, { map: 'Japan', variant: 'recharged' }, 'f7-japan');
        G.phase = Phase.Building;
        const start = G.map.startingCities!.find((name) => G.map.cities.some((c) => c.name == name))!;
        G.players[1].cities = [{ name: start, position: 0 }];
        expect(buildPrices(G, 0).get(start)).to.equal(10);
    });

    it('F8: never adds a too-small plant to the market, even as the last card', () => {
        const G = setup(3, { map: 'USA', variant: 'original' }, 'f8');
        G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
        G.actualMarket = plants(11, 12, 13);
        G.futureMarket = plants(14, 15, 16, 17);
        G.powerPlantsDeck = plants(8);
        addPowerPlant(G);
        expect(G.powerPlantsDeck).to.be.empty;
        expect([...G.actualMarket, ...G.futureMarket].map((p) => p.number)).to.deep.equal([11, 12, 13, 14, 15, 16, 17]);
    });

    it('F9: starts Brazil with 9 biogas on spaces 6–8 under Recharged, 6 under Original', () => {
        const recharged = setup(3, { map: 'Brazil', variant: 'recharged' }, 'f9');
        expect([recharged.garbageMarket, recharged.garbageSupply]).to.deep.equal([9, 15]);
        const original = setup(3, { map: 'Brazil', variant: 'original' }, 'f9');
        expect([original.garbageMarket, original.garbageSupply]).to.deep.equal([6, 18]);
    });

    it('F10: removes 0 plug and 5, 6, 3 socket plants on France Recharged at 2, 3, 4 players', () => {
        // 41 plants without 13, less the removals (plug + socket).
        const removed: Record<number, number> = { 2: 5, 3: 7, 4: 3, 5: 0, 6: 0 };
        for (const n of [2, 3, 4, 5, 6]) {
            const G = setup(n, { map: 'France', variant: 'recharged' }, 'f10');
            const inGame = G.actualMarket.length + G.futureMarket.length + G.powerPlantsDeck.length - 1;
            expect(inGame, `${n} players`).to.equal(41 - removed[n]);
        }
    });

    it('F11: never takes the Wien garbage discount below $1', () => {
        let G = setup(3, { map: 'Central Europe', variant: 'recharged' }, 'f11');
        G.phase = Phase.Resources;
        const player = G.players[0];
        G.currentPlayers = [player.id];
        player.cities = [{ name: 'Wien', position: 0 }];
        player.powerPlants = plants(6);
        updatePlayerCapacity(player);
        const buy = () => {
            const money = player.money;
            player.availableMoves = availableMoves(G, player);
            G = move(G, { name: MoveName.BuyResource, data: { resource: ResourceType.Garbage } }, player.id);
            return money - player.money;
        };
        G.garbageMarket = 24; // cheapest garbage at $1
        expect(buy(), 'from the $1 space').to.equal(1);
        G.garbageMarket = 18; // cheapest garbage at $3
        expect(buy(), 'from the $3 space').to.equal(2);
    });

    it('F13: begins Middle East Step 2 at the start of the next phase', () => {
        let G = setup(3, { map: 'Middle East', variant: 'recharged' }, 'f13');
        G.phase = Phase.Building;
        G.currentPlayers = [G.playerOrder[2]];
        G.actualMarket = plants(3, 4, 5, 7);
        G.futureMarket = plants(8, 9, 10);
        G.powerPlantsDeck = plants(99, 15, 16, 18, 20, 21);
        addPowerPlant(G);
        expect(G.step, 'still Step 1 for the rest of the phase').to.equal(1);
        expect(G.powerPlantsDeck[G.powerPlantsDeck.length - 1].number, 'card back under the stack').to.equal(99);
        expect(G.actualMarket.length + G.futureMarket.length, 'replacement drawn').to.equal(8);

        G = passPhase(G);
        expect(G.phase).to.equal(Phase.Bureaucracy);
        expect(G.step).to.equal(2);
        const events = G.log.map((l) => (l.type == 'event' ? l.event : ''));
        expect(events).to.include('Power Plant 3 discarded to start step 2.');
        expect(events).to.include('Power Plant 4 discarded to start step 2.');
        expect(G.actualMarket.length + G.futureMarket.length).to.equal(8);
    });

    it('F13: puts a Middle East Step 3 card drawn in an auction back under the stack', () => {
        let G = setup(3, { map: 'Middle East', variant: 'recharged' }, 'f13-auction');
        G.round = 2;
        G.plantDiscountActive = false;
        G.actualMarket = plants(3, 4, 5, 7);
        G.futureMarket = plants(8, 9, 10);
        G.powerPlantsDeck = plants(99, 15, 16, 18, 20, 21);
        addPowerPlant(G);
        expect([...G.actualMarket, ...G.futureMarket].map((p) => p.number)).not.to.include(99);
        expect(G.actualMarket.length + G.futureMarket.length).to.equal(8);
        expect(G.step).to.equal(1);

        G = passPhase(G);
        expect(G.phase).to.equal(Phase.Resources);
        expect(G.step).to.equal(2);
    });
});
