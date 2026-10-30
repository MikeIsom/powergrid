import type { GameState } from 'powergrid-engine';
import { withRegionalPlants } from 'powergrid-engine/src/engine';
import type { PowerPlant } from 'powergrid-engine/src/gamestate';
import { plantCatalogue } from 'powergrid-engine/src/powerPlants';

export function journalPlant(state: GameState, number: number): PowerPlant | undefined {
    const livePlant = [
        ...state.players.flatMap((player) => player.powerPlants),
        ...state.actualMarket,
        ...state.futureMarket,
    ].find((plant) => plant.number === number);
    if (livePlant) return livePlant;

    // Discarded cards still appear in the journal; reconstruct the regional deck
    // using the same region order as setup, without needing the hidden draw pile.
    const catalogue = plantCatalogue(
        state.map.name,
        !!state.options.alternatePowerPlants,
        state.options.plantDeck,
        state.shuffledDeck
    );
    const regions = new Set(state.map.cities.map((city) => city.region));
    return withRegionalPlants(catalogue, state.map, regions, state.options.plantDeck).find(
        (card) => card.number === number
    );
}
