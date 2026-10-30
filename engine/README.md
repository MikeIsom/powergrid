# powergrid-engine

Typescript engine for Power Grid.

## Setup

### Requirements

Recent version of node / pnpm.

### Dependencies

In the project's folder:

```
pnpm
```

### Build

To compile Typescript into javascript:

```
pnpm build
```

### Test

```
pnpm test
```

## Replaying old games

boardgamers.space stamps each game with a site engine version (`game.version` in an export). To replay an old game as it was played, pass that number as the `version` game option. Rule changes listed below apply only from their site version: a game with an older `version` keeps the old behaviour, and a game without a `version` (every new game) gets every change. The versions live in `src/rule-versions.ts`; `src/old-games.spec.ts` replays every export in the folder named by `PG_GAMES_DIR`.

| Change                             | What it does                                                                     | Applies from site version |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| `stepAnnouncementLog`              | Logs "Starting Step N." for a step change that has no event of its own           | 13                        |
| `franceStartingGarbage`            | France, Recharged: starts with 9 garbage, not 6                                  | 14                        |
| `ukIrelandOpenSlotJump`            | UK & Ireland: the island jump may go into any city with an open slot             | 14                        |
| `italyUraniumStopOriginal`         | Italy: the uranium stop after plant 39 also applies under Original               | 14                        |
| `badenWurttembergKeepsDrawnPlants` | Baden-Württemberg: drawn plants at or below a city count are kept                | 14                        |
| `russiaKeepsDrawnPlants`           | Russia, Original: drawn plants at or below a city count are kept                 | 14                        |
| `noTooSmallLastCard`               | Original: a too-small plant is not added when the deck runs out                  | 14                        |
| `stepTwoBeforeStepThree`           | The Step 2 changes come first when Step 3 begins during Step 1                   | 14                        |
| `firstHouseInEmptyCity`            | A first house only goes in an empty city, in every step                          | 14                        |
| `brazilStartingBiogas`             | Brazil, Recharged: starts with 9 biogas, not 6                                   | 14                        |
| `wienDiscountFloor`                | Central Europe: the Wien garbage discount never goes below $1                    | 14                        |
| `france2pSocketRemovals`           | France, Recharged, 2 players: 5 socket plants removed, not 6                     | 14                        |
| `europeOriginalRemovals`           | Europe, Original: the Original removal counts                                    | 14                        |
| `beneluxFusionEcological`          | Benelux: fusion plant 50 counts as ecological                                    | 14                        |
| `manhattanBuyableNextRound`        | Manhattan: the whole market is buyable from the round after the second depletion | 14                        |
| `middleEastStepTwoNextPhase`       | Middle East: Step 2 begins at the start of the next phase                        | 14                        |
| `quebecWindOnlyEcological`         | Québec: only green (wind) plants are ecological, so setup can remove plant 50    | 14                        |

Northern Europe's regional plants are swapped in before the deck is prepared, but with the standard deck this leaves every seeded setup unchanged, so it is not gated.
