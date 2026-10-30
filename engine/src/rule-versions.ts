import { GameOptions } from './gamestate';

// The boardgamers.space site engine version (game.version in an export) from which
// each gated rule change applies. A game replayed with options.version below a
// change's version keeps the older behaviour; a game without a version (every new
// game) gets every change. engine/README.md lists the same table.
export const ruleVersions = {
    // Logs "Starting Step N." for a step change that has no event of its own (9ce6a15).
    stepAnnouncementLog: 13,
} as const;

export type RuleChange = keyof typeof ruleVersions;

export function rulesApply(options: GameOptions, change: RuleChange): boolean {
    return options.version === undefined || options.version >= ruleVersions[change];
}
