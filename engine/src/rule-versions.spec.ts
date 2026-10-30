import { expect } from 'chai';
import 'mocha';
import { availableMoves } from './available-moves';
import { addPowerPlant, getPowerPlant, move, setup } from './engine';
import { GameOptions, GameState, Phase } from './gamestate';
import { MoveName } from './move';
import { rulesApply } from './rule-versions';

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
});
