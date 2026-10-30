import { cloneDeep } from 'lodash';
import { PowerPlant, PowerPlantType } from './gamestate';

const powerPlants: PowerPlant[] = [
    { number: 3, type: PowerPlantType.Oil, cost: 2, citiesPowered: 1 },
    { number: 4, type: PowerPlantType.Coal, cost: 2, citiesPowered: 1 },
    { number: 5, type: PowerPlantType.Hybrid, cost: 2, citiesPowered: 1 },
    { number: 6, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 1 },
    { number: 7, type: PowerPlantType.Oil, cost: 3, citiesPowered: 2 },
    { number: 8, type: PowerPlantType.Coal, cost: 3, citiesPowered: 2 },
    { number: 9, type: PowerPlantType.Oil, cost: 1, citiesPowered: 1 },
    { number: 10, type: PowerPlantType.Coal, cost: 2, citiesPowered: 2 },
    { number: 11, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 2 },
    { number: 12, type: PowerPlantType.Hybrid, cost: 2, citiesPowered: 2 },
    { number: 13, type: PowerPlantType.Wind, cost: 0, citiesPowered: 1 },
    { number: 14, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 2 },
    { number: 15, type: PowerPlantType.Coal, cost: 2, citiesPowered: 3 },
    { number: 16, type: PowerPlantType.Oil, cost: 2, citiesPowered: 3 },
    { number: 17, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 2 },
    { number: 18, type: PowerPlantType.Wind, cost: 0, citiesPowered: 2 },
    { number: 19, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 3 },
    { number: 20, type: PowerPlantType.Coal, cost: 3, citiesPowered: 5 },
    { number: 21, type: PowerPlantType.Hybrid, cost: 2, citiesPowered: 4 },
    { number: 22, type: PowerPlantType.Wind, cost: 0, citiesPowered: 2 },
    { number: 23, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 3 },
    { number: 24, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 4 },
    { number: 25, type: PowerPlantType.Coal, cost: 2, citiesPowered: 5 },
    { number: 26, type: PowerPlantType.Oil, cost: 2, citiesPowered: 5 },
    { number: 27, type: PowerPlantType.Wind, cost: 0, citiesPowered: 3 },
    { number: 28, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 4 },
    { number: 29, type: PowerPlantType.Hybrid, cost: 1, citiesPowered: 4 },
    { number: 30, type: PowerPlantType.Garbage, cost: 3, citiesPowered: 6 },
    { number: 31, type: PowerPlantType.Coal, cost: 3, citiesPowered: 6 },
    { number: 32, type: PowerPlantType.Oil, cost: 3, citiesPowered: 6 },
    { number: 33, type: PowerPlantType.Wind, cost: 0, citiesPowered: 4 },
    { number: 34, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 5 },
    { number: 35, type: PowerPlantType.Oil, cost: 1, citiesPowered: 5 },
    { number: 36, type: PowerPlantType.Coal, cost: 3, citiesPowered: 7 },
    { number: 37, type: PowerPlantType.Wind, cost: 0, citiesPowered: 4 },
    { number: 38, type: PowerPlantType.Garbage, cost: 3, citiesPowered: 7 },
    { number: 39, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 6 },
    { number: 40, type: PowerPlantType.Oil, cost: 2, citiesPowered: 6 },
    { number: 42, type: PowerPlantType.Coal, cost: 2, citiesPowered: 6 },
    { number: 44, type: PowerPlantType.Wind, cost: 0, citiesPowered: 5 },
    { number: 46, type: PowerPlantType.Hybrid, cost: 3, citiesPowered: 7 },
    { number: 50, type: PowerPlantType.Nuclear, cost: 0, citiesPowered: 6 },
    { number: 99, type: PowerPlantType.Step3, cost: 0, citiesPowered: 6 },
];

// Plug on the back: 03–15 in the standard deck.
powerPlants.forEach((pp) => (pp.plug = pp.number <= 15));

const indiaPowerPlants = cloneDeep(powerPlants).filter((pp) => pp.number != 11);
// Garbage plants cost one more garbage to run, but have no additional storage.
indiaPowerPlants.forEach((pp) => {
    if (pp.type == PowerPlantType.Garbage) {
        pp.storage = 2 * pp.cost;
        pp.cost++;
    }
});

// Alternate power plant deck: the same card numbers as the standard deck, with
// different fuels and outputs. Its water plants count as garbage plants. Plants
// 8, 22 and 35 burn any mix of garbage and oil.
const alternatePowerPlants: PowerPlant[] = [
    { number: 3, type: PowerPlantType.Coal, cost: 2, citiesPowered: 1 },
    { number: 4, type: PowerPlantType.Coal, cost: 2, citiesPowered: 1 },
    { number: 5, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 1 },
    { number: 6, type: PowerPlantType.Oil, cost: 1, citiesPowered: 1 },
    { number: 7, type: PowerPlantType.Coal, cost: 1, citiesPowered: 1 },
    { number: 8, type: PowerPlantType.GarbageOilHybrid, cost: 3, citiesPowered: 2 },
    { number: 9, type: PowerPlantType.Coal, cost: 3, citiesPowered: 2 },
    { number: 10, type: PowerPlantType.Oil, cost: 2, citiesPowered: 2 },
    { number: 11, type: PowerPlantType.Wind, cost: 0, citiesPowered: 1 },
    { number: 12, type: PowerPlantType.Coal, cost: 2, citiesPowered: 2 },
    { number: 13, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 2 },
    { number: 14, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 2 },
    { number: 15, type: PowerPlantType.Coal, cost: 1, citiesPowered: 2 },
    { number: 16, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 3 },
    { number: 17, type: PowerPlantType.Wind, cost: 0, citiesPowered: 2 },
    { number: 18, type: PowerPlantType.Oil, cost: 2, citiesPowered: 3 },
    { number: 19, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 3 },
    { number: 20, type: PowerPlantType.Coal, cost: 3, citiesPowered: 4 },
    { number: 21, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 3 },
    { number: 22, type: PowerPlantType.GarbageOilHybrid, cost: 3, citiesPowered: 5 },
    { number: 23, type: PowerPlantType.Oil, cost: 2, citiesPowered: 4 },
    { number: 24, type: PowerPlantType.Wind, cost: 0, citiesPowered: 3 },
    { number: 25, type: PowerPlantType.Coal, cost: 2, citiesPowered: 5 },
    { number: 26, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 4 },
    { number: 27, type: PowerPlantType.Coal, cost: 1, citiesPowered: 4 },
    { number: 28, type: PowerPlantType.Wind, cost: 0, citiesPowered: 3 },
    { number: 29, type: PowerPlantType.Coal, cost: 2, citiesPowered: 5 },
    { number: 30, type: PowerPlantType.Oil, cost: 2, citiesPowered: 5 },
    { number: 31, type: PowerPlantType.Wind, cost: 0, citiesPowered: 4 },
    { number: 32, type: PowerPlantType.Uranium, cost: 2, citiesPowered: 5 },
    { number: 33, type: PowerPlantType.Coal, cost: 3, citiesPowered: 6 },
    { number: 34, type: PowerPlantType.Garbage, cost: 3, citiesPowered: 6 },
    { number: 35, type: PowerPlantType.GarbageOilHybrid, cost: 2, citiesPowered: 5 },
    { number: 36, type: PowerPlantType.Wind, cost: 0, citiesPowered: 5 },
    { number: 37, type: PowerPlantType.Uranium, cost: 2, citiesPowered: 6 },
    { number: 38, type: PowerPlantType.Oil, cost: 3, citiesPowered: 6 },
    { number: 39, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 6 },
    { number: 40, type: PowerPlantType.Coal, cost: 2, citiesPowered: 6 },
    { number: 42, type: PowerPlantType.Oil, cost: 2, citiesPowered: 6 },
    { number: 44, type: PowerPlantType.Wind, cost: 0, citiesPowered: 6 },
    { number: 46, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 7 },
    { number: 50, type: PowerPlantType.Uranium, cost: 2, citiesPowered: 7 },
    { number: 99, type: PowerPlantType.Step3, cost: 0, citiesPowered: 6 },
];

// Plug on the back: 03–15, as in the standard deck.
alternatePowerPlants.forEach((pp) => (pp.plug = pp.number <= 15));

// The New Power Plants, Set 1. Hybrids burn coal and oil; the fusion plants (44, 60+)
// are modelled like the standard 50. 52, 54, 57 and 60 are boxed in normal play
// (plants-new-power-plants-set1.pdf p.2).
const set1PowerPlants: PowerPlant[] = [
    { number: 1, type: PowerPlantType.Coal, cost: 3, citiesPowered: 1 },
    { number: 2, type: PowerPlantType.Oil, cost: 2, citiesPowered: 1 },
    { number: 3, type: PowerPlantType.Coal, cost: 1, citiesPowered: 1 },
    { number: 4, type: PowerPlantType.Hybrid, cost: 1, citiesPowered: 1 },
    { number: 5, type: PowerPlantType.Hybrid, cost: 3, citiesPowered: 2 },
    { number: 6, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 2 },
    { number: 7, type: PowerPlantType.Oil, cost: 2, citiesPowered: 2 },
    { number: 8, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 2 },
    { number: 9, type: PowerPlantType.Coal, cost: 3, citiesPowered: 3 },
    { number: 10, type: PowerPlantType.Wind, cost: 0, citiesPowered: 1 },
    { number: 11, type: PowerPlantType.Wind, cost: 0, citiesPowered: 1 },
    { number: 12, type: PowerPlantType.Oil, cost: 1, citiesPowered: 2 },
    { number: 13, type: PowerPlantType.Hybrid, cost: 1, citiesPowered: 2 },
    { number: 14, type: PowerPlantType.Coal, cost: 3, citiesPowered: 4 },
    { number: 15, type: PowerPlantType.Wind, cost: 0, citiesPowered: 2 },
    { number: 16, type: PowerPlantType.Wind, cost: 0, citiesPowered: 2 },
    { number: 19, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 3 },
    { number: 20, type: PowerPlantType.Oil, cost: 1, citiesPowered: 3 },
    { number: 21, type: PowerPlantType.Garbage, cost: 3, citiesPowered: 5 },
    { number: 22, type: PowerPlantType.Oil, cost: 2, citiesPowered: 4 },
    { number: 23, type: PowerPlantType.Coal, cost: 2, citiesPowered: 4 },
    { number: 24, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 4 },
    { number: 25, type: PowerPlantType.Oil, cost: 3, citiesPowered: 5 },
    { number: 26, type: PowerPlantType.Wind, cost: 0, citiesPowered: 3 },
    { number: 27, type: PowerPlantType.Garbage, cost: 1, citiesPowered: 4 },
    { number: 28, type: PowerPlantType.Coal, cost: 3, citiesPowered: 5 },
    { number: 29, type: PowerPlantType.Hybrid, cost: 3, citiesPowered: 5 },
    { number: 30, type: PowerPlantType.Coal, cost: 1, citiesPowered: 4 },
    { number: 31, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 5 },
    { number: 32, type: PowerPlantType.Wind, cost: 0, citiesPowered: 4 },
    { number: 33, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 5 },
    { number: 34, type: PowerPlantType.Coal, cost: 3, citiesPowered: 6 },
    { number: 35, type: PowerPlantType.Coal, cost: 1, citiesPowered: 5 },
    { number: 36, type: PowerPlantType.Hybrid, cost: 2, citiesPowered: 6 },
    { number: 37, type: PowerPlantType.Oil, cost: 3, citiesPowered: 7 },
    { number: 38, type: PowerPlantType.Uranium, cost: 1, citiesPowered: 6 },
    { number: 39, type: PowerPlantType.Wind, cost: 0, citiesPowered: 5 },
    { number: 40, type: PowerPlantType.Oil, cost: 1, citiesPowered: 6 },
    { number: 42, type: PowerPlantType.Garbage, cost: 2, citiesPowered: 7 },
    { number: 44, type: PowerPlantType.Nuclear, cost: 0, citiesPowered: 6 },
    { number: 46, type: PowerPlantType.Coal, cost: 2, citiesPowered: 7, plus: true },
    { number: 50, type: PowerPlantType.Uranium, cost: 2, citiesPowered: 8, plus: true },
    { number: 52, type: PowerPlantType.Garbage, cost: 3, citiesPowered: 8, plus: true },
    { number: 54, type: PowerPlantType.Oil, cost: 2, citiesPowered: 8, plus: true },
    { number: 57, type: PowerPlantType.Oil, cost: 3, citiesPowered: 9, plus: true },
    { number: 60, type: PowerPlantType.Nuclear, cost: 0, citiesPowered: 8, plus: true },
    { number: 99, type: PowerPlantType.Step3, cost: 0, citiesPowered: 6 },
];
// Plug on the back: 01–16.
set1PowerPlants.forEach((pp) => (pp.plug = pp.number <= 16));

// The maps the alternate deck can be played on. The alternatePowerPlants option is
// ignored on every other map.
const ALTERNATE_DECK_MAPS: string[] = ['Europe', 'North America'];

function usesAlternateDeck(mapName: string, alternate: boolean | undefined): boolean {
    return !!alternate && ALTERNATE_DECK_MAPS.includes(mapName);
}

// The full card list a game on this map draws from.
function plantCatalogue(mapName: string, alternate?: boolean): PowerPlant[] {
    if (mapName == 'India') {
        return indiaPowerPlants;
    }

    return usesAlternateDeck(mapName, alternate) ? alternatePowerPlants : powerPlants;
}

export {
    powerPlants,
    indiaPowerPlants,
    alternatePowerPlants,
    set1PowerPlants,
    ALTERNATE_DECK_MAPS,
    usesAlternateDeck,
    plantCatalogue,
};
