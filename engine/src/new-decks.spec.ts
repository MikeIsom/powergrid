import { expect } from 'chai';
import 'mocha';
import { setup } from './engine';
import { GameState, hasPlug, MapName, PowerPlant, PowerPlantType } from './gamestate';
import { alternatePowerPlants, powerPlants, set1PowerPlants } from './powerPlants';

const { Coal, Oil, Garbage, Uranium, Hybrid, Wind, Nuclear, GarbageOilHybrid } = PowerPlantType;

// "number type cost→cities" from Appendix A of engine-update-scope.md.
function card(number: number, type: PowerPlantType, cost: number, citiesPowered: number) {
    return { number, type, cost, citiesPowered };
}
const shape = (plants: PowerPlant[]) =>
    plants.filter((p) => p.type != PowerPlantType.Step3).map((p) => card(p.number, p.type, p.cost, p.citiesPowered));

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
        expect(() => setup(3, { map: 'Germany', variant: 'recharged', plantDeck: 'set1' }, 'n')).to.throw(
            'There are no Set 1 map notes for Germany.'
        );
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
});
