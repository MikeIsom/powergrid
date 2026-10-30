import { GameOptions } from './gamestate';

// The boardgamers.space site engine version (game.version in an export) from which
// each gated rule change applies. A game replayed with options.version below a
// change's version keeps the older behaviour; a game without a version (every new
// game) gets every change. engine/README.md lists the same table.
export const ruleVersions = {
    // Logs "Starting Step N." for a step change that has no event of its own (9ce6a15).
    stepAnnouncementLog: 13,
    // France, Recharged: starts with 9 garbage, not 6 (F1).
    franceStartingGarbage: 14,
    // UK & Ireland: the island jump may use any city with an open slot (F2).
    ukIrelandOpenSlotJump: 14,
    // Italy: the uranium stop after plant 39 also applies under Original (F4).
    italyUraniumStopOriginal: 14,
    // Baden-Wurttemberg: drawn plants at or below a city count are kept (F5).
    badenWurttembergKeepsDrawnPlants: 14,
    // Russia, Original: drawn plants at or below a city count are kept (C1).
    russiaKeepsDrawnPlants: 14,
    // Original: a too-small plant is not added when the deck runs out (F8).
    noTooSmallLastCard: 14,
    // The Step 2 changes come first when Step 3 begins during Step 1 (F6).
    stepTwoBeforeStepThree: 14,
} as const;

export type RuleChange = keyof typeof ruleVersions;

export function rulesApply(options: GameOptions, change: RuleChange): boolean {
    return options.version === undefined || options.version >= ruleVersions[change];
}
