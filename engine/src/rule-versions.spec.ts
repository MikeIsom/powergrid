import { expect } from 'chai';
import { readFileSync } from 'fs';
import 'mocha';
import { join } from 'path';
import { availableMoves } from './available-moves';
import { addPowerPlant, getPowerPlant, move, setup, updatePlayerCapacity } from './engine';
import { GameOptions, GameState, Phase, ResourceType } from './gamestate';
import { MoveName } from './move';
import { rulesApply, ruleVersions } from './rule-versions';

const plants = (...numbers: number[]) => numbers.map((n) => getPowerPlant(n));

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

describe('Rule versions', () => {
    it('stores the version option only when it is set', () => {
        expect(setup(3, { map: 'USA' }, 'versions').options).not.to.have.property('version');
        expect(setup(3, { map: 'USA', version: 3 }, 'versions').options.version).to.equal(3);
    });

    it('lists every gated change and its version in the engine README', () => {
        const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');
        const listed: Record<string, number> = {};
        const row = /^\|\s*`(\w+)`\s*\|.*\|\s*(\d+)\s*\|\s*$/gm;
        for (let m = row.exec(readme); m; m = row.exec(readme)) listed[m[1]] = Number(m[2]);
        expect(listed).to.deep.equal(ruleVersions);
    });

    it('applies every change to a game without a version', () => {
        expect(rulesApply({}, 'any' as never)).to.be.true;
    });

    it('stepAnnouncementLog: logs a step change without its own event only from version 13', () => {
        const stepLogs = (options: GameOptions) => {
            const G = setup(3, { map: 'China', variant: 'original', ...options }, 'versions');
            G.phase = Phase.Bureaucracy;
            G.step = 2;
            G.powerPlantsDeck.unshift(getPowerPlant(99));
            addPowerPlant(G);
            expect(G.step).to.equal(3);
            return G.log.filter((l) => l.type == 'event' && l.event == 'Starting Step 3.').length;
        };
        expect(stepLogs({ version: 12 })).to.equal(0);
        expect(stepLogs({ version: 13 })).to.equal(1);
        expect(stepLogs({})).to.equal(1);
    });

    it('franceStartingGarbage: starts France, Recharged, with 9 garbage from version 14', () => {
        expect(setup(3, { map: 'France', variant: 'recharged', version: 13 }, 'versions').garbageMarket).to.equal(6);
        expect(setup(3, { map: 'France', variant: 'recharged', version: 14 }, 'versions').garbageMarket).to.equal(9);
    });

    it('ukIrelandOpenSlotJump: jumps into an occupied UK & Ireland city from version 14', () => {
        const jumpPrice = (version: number) => {
            const G = setup(5, { map: 'UK & Ireland', variant: 'recharged', version }, 'versions');
            G.phase = Phase.Building;
            G.step = 2;
            const player = G.players[0];
            player.money = 200;
            const [occupied] = G.map.cities.filter((c) => c.island === 'ie');
            player.cities = [{ name: G.map.cities.find((c) => c.island === 'gb')!.name, position: 0 }];
            G.players[1].cities = [{ name: occupied.name, position: 0 }];
            return availableMoves(G, player)[MoveName.Build]?.find((b) => b.name == occupied.name)?.price;
        };
        expect(jumpPrice(13)).to.be.undefined;
        expect(jumpPrice(14)).to.equal(35);
    });
    it('italyUraniumStopOriginal: stops Italy Original uranium after plant 39 from version 14', () => {
        const uranium = (version: number) => {
            let G = setup(3, { map: 'Italy', variant: 'original', version }, 'versions');
            G.uraniumMarket = 0;
            G.card39Bought = true;
            G.phase = Phase.Bureaucracy;
            G.currentPlayers = [...G.playerOrder];
            G = passPhase(G);
            return G.uraniumMarket;
        };
        expect(uranium(13)).to.be.above(0);
        expect(uranium(14)).to.equal(0);
    });

    it('badenWurttembergKeepsDrawnPlants: keeps a too-small drawn plant from version 14', () => {
        const market = (version: number) => {
            const G = setup(3, { map: 'Baden-Württemberg', variant: 'original', version }, 'versions');
            G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
            G.actualMarket = plants(11, 12, 13);
            G.futureMarket = plants(14, 15, 16, 17);
            G.powerPlantsDeck = plants(8, 20);
            addPowerPlant(G);
            return G.actualMarket.map((p) => p.number);
        };
        expect(market(13)).to.deep.equal([11, 12, 13, 14]);
        expect(market(14)).to.deep.equal([8, 11, 12, 13]);
    });

    it('russiaKeepsDrawnPlants: keeps a too-small drawn Russia plant from version 14', () => {
        const market = (version: number) => {
            const G = setup(3, { map: 'Russia', variant: 'original', version }, 'versions');
            G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
            G.actualMarket = plants(11, 12, 13);
            G.futureMarket = plants(14, 15);
            G.powerPlantsDeck = plants(8, 20);
            addPowerPlant(G);
            return G.actualMarket.map((p) => p.number);
        };
        expect(market(13)).to.deep.equal([11, 12, 13]);
        expect(market(14)).to.deep.equal([8, 11, 12]);
    });

    it('noTooSmallLastCard: leaves a too-small last card out of the market from version 14', () => {
        const market = (version: number) => {
            const G = setup(3, { map: 'USA', variant: 'original', version }, 'versions');
            G.players[0].cities = G.map.cities.slice(0, 10).map((c) => ({ name: c.name, position: 0 }));
            G.actualMarket = plants(11, 12, 13);
            G.futureMarket = plants(14, 15, 16, 17);
            G.powerPlantsDeck = plants(8);
            addPowerPlant(G);
            return G.actualMarket.map((p) => p.number);
        };
        expect(market(13)).to.deep.equal([8, 11, 12, 13]);
        expect(market(14)).to.deep.equal([11, 12, 13, 14]);
    });

    it('stepTwoBeforeStepThree: makes the Step 2 changes first from version 14', () => {
        const events = (version: number) => {
            const G = setup(4, { map: 'USA', variant: 'recharged', version }, 'versions');
            G.phase = Phase.Bureaucracy;
            G.actualMarket = plants(10, 11, 12, 13);
            G.futureMarket = plants(14, 15, 16);
            G.powerPlantsDeck = plants(99, 20, 30, 40);
            addPowerPlant(G);
            return G.log.map((l) => (l.type == 'event' ? l.event : ''));
        };
        expect(events(13)).not.to.include('Starting Step 2 before Step 3, Power Plant 10 discarded.');
        expect(events(13)).to.include('Step 3 will begin next phase, Power Plant 10 discarded.');
        expect(events(14)).to.include('Starting Step 2 before Step 3, Power Plant 10 discarded.');
    });

    it('firstHouseInEmptyCity: keeps a first house out of occupied cities from version 14', () => {
        const price = (version: number) => {
            const G = setup(3, { map: 'Germany', variant: 'recharged', version }, 'versions');
            G.phase = Phase.Building;
            G.step = 2;
            const occupied = G.map.cities[0];
            G.players[1].cities = [{ name: occupied.name, position: 0 }];
            return availableMoves(G, G.players[0])[MoveName.Build]?.find((b) => b.name == occupied.name)?.price;
        };
        expect(price(13)).to.equal(15);
        expect(price(14)).to.be.undefined;
    });

    it('brazilStartingBiogas: starts Brazil, Recharged, with 9 biogas from version 14', () => {
        expect(setup(3, { map: 'Brazil', variant: 'recharged', version: 13 }, 'versions').garbageMarket).to.equal(6);
        expect(setup(3, { map: 'Brazil', variant: 'recharged', version: 14 }, 'versions').garbageMarket).to.equal(9);
    });

    it('wienDiscountFloor: charges at least 1 for Wien garbage from version 14', () => {
        const cost = (version: number) => {
            let G = setup(3, { map: 'Central Europe', variant: 'recharged', version }, 'versions');
            G.phase = Phase.Resources;
            const player = G.players[0];
            G.currentPlayers = [player.id];
            player.cities = [{ name: 'Wien', position: 0 }];
            player.powerPlants = plants(6);
            updatePlayerCapacity(player);
            G.garbageMarket = 24;
            const money = player.money;
            player.availableMoves = availableMoves(G, player);
            G = move(G, { name: MoveName.BuyResource, data: { resource: ResourceType.Garbage } }, player.id);
            return money - G.players[0].money;
        };
        expect(cost(13)).to.equal(0);
        expect(cost(14)).to.equal(1);
    });

    it('france2pSocketRemovals: removes 5 socket plants on France Recharged 2P from version 14', () => {
        const inGame = (version: number) => {
            const G = setup(2, { map: 'France', variant: 'recharged', version }, 'versions');
            return G.actualMarket.length + G.futureMarket.length + G.powerPlantsDeck.length - 1;
        };
        expect(inGame(13)).to.equal(35);
        expect(inGame(14)).to.equal(36);
    });

    it('europeOriginalRemovals: uses the Original removal counts on Europe from version 14', () => {
        const inGame = (version: number) => {
            const G = setup(2, { map: 'Europe', variant: 'original', version }, 'versions');
            return G.actualMarket.length + G.futureMarket.length + G.powerPlantsDeck.length - 1;
        };
        expect(inGame(13)).to.equal(36);
        expect(inGame(14)).to.equal(34);
    });

    it('beneluxFusionEcological: moves Benelux plant 50 into the current market from version 14', () => {
        const market = (version: number) => {
            const G = setup(3, { map: 'Benelux', variant: 'recharged', version }, 'versions');
            G.step = 2;
            G.actualMarket = plants(36, 38, 39);
            G.futureMarket = plants(50);
            G.powerPlantsDeck = plants(40, 42);
            addPowerPlant(G);
            return G.actualMarket.map((p) => p.number);
        };
        expect(market(13)).to.deep.equal([36, 38, 39, 40]);
        expect(market(14)).to.deep.equal([36, 38, 39, 40, 50]);
    });

    it('manhattanBuyableNextRound: keeps the Manhattan future market until the next round from version 14', () => {
        const future = (version: number) => {
            const G = setup(4, { map: 'Manhattan', variant: 'recharged', version }, 'versions');
            G.plantDiscountActive = false;
            G.manhattanDepletion = 1;
            G.manhattanRecyclePile = [];
            G.actualMarket = plants(20, 22, 30, 40);
            G.futureMarket = plants(42, 44, 46);
            G.powerPlantsDeck = [];
            addPowerPlant(G);
            return G.futureMarket.length;
        };
        expect(future(13)).to.equal(0);
        expect(future(14)).to.equal(3);
    });

    it('middleEastStepTwoNextPhase: starts Middle East Step 2 at the next phase from version 14', () => {
        const stepAfterDraw = (version: number) => {
            const G = setup(3, { map: 'Middle East', variant: 'recharged', version }, 'versions');
            G.phase = Phase.Building;
            G.actualMarket = plants(3, 4, 5, 7);
            G.futureMarket = plants(8, 9, 10);
            G.powerPlantsDeck = plants(99, 15, 16, 18, 20, 21);
            addPowerPlant(G);
            return G.step;
        };
        expect(stepAfterDraw(13)).to.equal(2);
        expect(stepAfterDraw(14)).to.equal(1);
    });

    it('middleEastStepTwoNextPhase: keeps an auction-drawn Middle East card in the market before version 14', () => {
        let G = setup(3, { map: 'Middle East', variant: 'recharged', version: 13 }, 'versions');
        G.round = 2;
        G.plantDiscountActive = false;
        G.actualMarket = plants(3, 4, 5, 7);
        G.futureMarket = plants(8, 9, 10);
        G.powerPlantsDeck = plants(99, 15, 16, 18, 20, 21);
        addPowerPlant(G);
        expect(G.futureMarket.map((p) => p.number)).to.include(99);
        G = passPhase(G);
        expect(G.phase).to.equal(Phase.Resources);
        expect(G.step).to.equal(2);
    });

    it('quebecWindOnlyEcological: lets Quebec setup remove fusion plant 50 from version 14', () => {
        const removedIn = (version: number) =>
            [...Array(20).keys()].filter((i) => {
                const G = setup(2, { map: 'Quebec', variant: 'original', version }, `quebec-${i}`);
                return ![...G.actualMarket, ...G.futureMarket, ...G.powerPlantsDeck].some((p) => p.number == 50);
            }).length;
        expect(removedIn(13)).to.equal(0);
        expect(removedIn(14)).to.be.above(0);
    });
});
