import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { addPowerPlant, getPowerPlant, move, setup, updatePlayerCapacity } from './engine';
import { GameState, Phase, PowerPlantType, ResourceType, Variant } from './gamestate';
import { map as northernEurope } from './maps/northerneurope';
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

    it('F14: makes the whole Manhattan market buyable only from the round after the second depletion', () => {
        let G = setup(4, { map: 'Manhattan', variant: 'recharged' }, 'f14');
        G.round = 5;
        G.plantDiscountActive = false;
        G.manhattanDepletion = 1;
        G.manhattanRecyclePile = [];
        G.actualMarket = plants(20, 22, 30, 40);
        G.futureMarket = plants(42, 44, 46);
        G.powerPlantsDeck = [];
        addPowerPlant(G); // the replacement after a purchase finds the deck empty
        expect(G.manhattanDepletion).to.equal(2);
        expect(
            G.actualMarket.map((p) => p.number),
            'this round'
        ).to.deep.equal([20, 22, 30, 40]);
        expect(availableMoves(G, G.players[G.currentPlayers[0]])[MoveName.ChoosePowerPlant]).not.to.include(42);

        // Finish the round: Bureaucracy collapses the market and boxes the smallest plant.
        G = passPhase(G);
        G = passPhase(G);
        G = passPhase(G);
        G = passPhase(G);
        expect(G.round).to.equal(6);
        expect(G.futureMarket).to.be.empty;
        expect(
            G.actualMarket.map((p) => p.number),
            'next round'
        ).to.deep.equal([22, 30, 40, 42, 44, 46]);
    });

    it('F17: swaps Northern Europe regional plants in before the market and stack are prepared', () => {
        // Regional plants with numbers the deck lacks show whether the swap comes
        // first: swapped in afterwards, they have nothing to replace and are lost.
        const regional = northernEurope.regionalPowerPlants!;
        const saved = { ...regional };
        const extraNumbers = [41, 43, 45, 47, 48, 49];
        const extra = (region: string) => ({
            number: extraNumbers[Object.keys(saved).indexOf(region)],
            type: PowerPlantType.Wind,
            cost: 0,
            citiesPowered: 5,
        });
        try {
            for (const region of Object.keys(regional)) regional[region] = [...regional[region], extra(region)];
            for (const variant of variants) {
                for (const chooseRegions of [false, true]) {
                    let G = setup(5, { map: 'Northern Europe', variant, chooseRegions }, 'f17');
                    while (G.regionDraft) {
                        const p = G.currentPlayers[0];
                        G.players[p].availableMoves = availableMoves(G, G.players[p]);
                        const region = G.players[p].availableMoves!.ChooseRegion![0];
                        G = move(G, { name: MoveName.ChooseRegion, data: region }, p);
                    }
                    const inPlay = [...new Set(G.map.cities.map((c) => c.region))].sort();
                    const inGame = [...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck];
                    expect(
                        inGame.filter((p) => extraNumbers.includes(p.number)),
                        `${variant}${chooseRegions ? ', drafted regions' : ''}`
                    ).to.have.deep.members(inPlay.map(extra));
                }
            }
        } finally {
            Object.assign(regional, saved);
        }
    });

    it('C1: never removes a drawn Russia plant for city count under Original', () => {
        const G = setup(3, { map: 'Russia', variant: 'original' }, 'c1');
        G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
        G.actualMarket = plants(11, 12, 13);
        G.futureMarket = plants(14, 15);
        G.powerPlantsDeck = plants(8, 20);
        addPowerPlant(G);
        expect(G.actualMarket.map((p) => p.number)).to.deep.equal([8, 11, 12]);
    });

    it('C2: prepares Europe under Original with the Original removal counts', () => {
        const removed: Record<number, number> = { 2: 8, 3: 8, 4: 4, 5: 0, 6: 0 };
        for (const n of [2, 3, 4, 5, 6]) {
            const G = setup(n, { map: 'Europe', variant: 'original' }, 'c2');
            const market = [...G.actualMarket, ...G.futureMarket];
            expect(market.length, `${n} players`).to.equal(9);
            expect(
                market.every((p) => p.number <= 15),
                `${n} players`
            ).to.be.true;
            const inGame = market.length + G.powerPlantsDeck.length - 1;
            expect(inGame, `${n} players`).to.equal(42 - removed[n]);
            expect(G.powerPlantsDeck[G.powerPlantsDeck.length - 1].number, `${n} players`).to.equal(99);
        }
    });

    it('C5: adds Benelux fusion plant 50 to the current market as an ecological plant', () => {
        for (const variant of variants) {
            const G = setup(3, { map: 'Benelux', variant }, 'c5');
            G.step = 2;
            G.actualMarket = plants(36, 38, 39);
            G.futureMarket = plants(50);
            G.powerPlantsDeck = plants(40, 42);
            addPowerPlant(G);
            expect(
                G.actualMarket.map((p) => p.number),
                variant
            ).to.deep.equal([36, 38, 39, 40, 50]);
        }
    });

    it('C4: deals the lowest plants, one per player, in the China round 1 market', () => {
        for (const variant of variants) {
            for (const n of [2, 3, 4, 5, 6]) {
                const G = setup(n, { map: 'China', variant }, 'c4');
                const expected = [5, 6, 7, 8, 9, 10].slice(0, n);
                expect(
                    G.actualMarket.map((p) => p.number),
                    `${variant}, ${n} players`
                ).to.deep.equal(expected);
                expect(G.futureMarket, `${variant}, ${n} players`).to.be.empty;
            }
        }
    });

    it('Spain & Portugal: needs a city in Spain to buy nuclear plants', () => {
        for (const variant of variants) {
            const G = setup(6, { map: 'Spain & Portugal', variant }, 'spain-nuclear');
            const portugal = G.map.cities.find((c) => c.region == 'yellow')!;
            const spain = G.map.cities.find((c) => c.region != 'yellow')!;
            G.actualMarket = plants(11, 12, 13, 14);
            const player = G.players[G.currentPlayers[0]];
            const choices = () => availableMoves(G, player)[MoveName.ChoosePowerPlant];

            expect(choices(), `${variant}, no cities, round 1`).not.to.include(11);
            G.round = 2;
            expect(choices(), `${variant}, no cities`).not.to.include(11);
            player.cities = [{ name: portugal.name, position: 0 }];
            expect(choices(), `${variant}, only Portugal`).not.to.include(11);
            player.cities.push({ name: spain.name, position: 0 });
            expect(choices(), `${variant}, a city in Spain`).to.include(11);

            // Bidding on a nuclear plant someone else put up.
            G.chosenPowerPlant = getPowerPlant(11);
            G.minimunBid = 11;
            G.currentBid = 11;
            expect(availableMoves(G, player)[MoveName.Bid], `${variant}, a city in Spain, bid`).not.to.be.undefined;
            player.cities = [];
            expect(availableMoves(G, player)[MoveName.Bid], `${variant}, no cities, bid`).to.be.undefined;
        }
    });
});
