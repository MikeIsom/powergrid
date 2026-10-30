import { expect } from 'chai';
import { setup } from 'powergrid-engine';
import { getPowerPlant } from 'powergrid-engine/src/engine';
import { PowerPlantType } from 'powergrid-engine/src/gamestate';
import { journalPlant } from '../../src/util/journal-plant';

describe('journal plant illustrations', () => {
    it('matches every regional card, including cards no longer on the board', () => {
        const state = setup(5, { map: 'Northern Europe', variant: 'recharged' }, 'journal');
        for (const region of Object.keys(state.map.regionalPowerPlants!)) {
            state.map.cities = [{ ...state.map.cities[0], region }];
            state.actualMarket = [];
            state.futureMarket = [];
            state.players.forEach((player) => (player.powerPlants = []));
            for (const plant of state.map.regionalPowerPlants![region]) {
                expect(journalPlant(state, plant.number)).to.deep.equal({ ...plant, plug: plant.number <= 15 });
                state.players[0].powerPlants = [plant];
                expect(journalPlant(state, plant.number)).to.deep.equal(plant);
                state.players[0].powerPlants = [];
            }
        }
    });

    it('retains the standard and alternate deck lookup for discarded cards', () => {
        for (const alternatePowerPlants of [false, true]) {
            const state = setup(3, { map: 'Germany', alternatePowerPlants }, 'journal');
            state.actualMarket = [];
            state.futureMarket = [];
            expect(journalPlant(state, 18)).to.deep.equal(getPowerPlant(18, 'Germany', alternatePowerPlants));
        }
    });

    it('tells Set 1 plant 25 from Sweden North 25.1 for discarded cards', () => {
        const state = setup(5, { map: 'Northern Europe', variant: 'recharged', plantDeck: 'set1' }, 'journal');
        state.map.cities = [{ ...state.map.cities[0], region: 'yellow' }];
        state.actualMarket = [];
        state.futureMarket = [];
        state.players.forEach((player) => (player.powerPlants = []));
        expect(journalPlant(state, 25)).to.include({ number: 25, type: PowerPlantType.Oil, cost: 3, citiesPowered: 5 });
        expect(journalPlant(state, 25.1)).to.include({ number: 25.1, type: PowerPlantType.Uranium, citiesPowered: 4 });
    });
});
