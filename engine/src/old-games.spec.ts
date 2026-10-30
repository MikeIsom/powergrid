import { expect } from 'chai';
import * as fs from 'fs';
import 'mocha';
import * as path from 'path';
import { reconstructState } from './engine';
import { GameState } from './gamestate';
import { LogItem } from './log';

// Replays every boardgamers.space export in PG_GAMES_DIR with the engine's
// reconstruction function, under the export's site version, and compares the
// final state and the log. Skipped when PG_GAMES_DIR is not set. The exports hold
// real usernames, so nothing here prints them: tests are named by export number
// and site version, and player names are replaced by P0, P1, … before comparing.

const dir = process.env.PG_GAMES_DIR;
const files = dir ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

// Indices of server duplicates: in a fast-bid auction, a second Pass from a player
// who already passed or bid in it. No engine version accepts one; they come from the
// server, not from a rule, so they are left out of both sides.
function serverDuplicates(log: LogItem[]): Set<number> {
    const duplicates = new Set<number>();
    let acted: Set<number> | undefined; // players who passed or bid in the open auction
    log.forEach((item, i) => {
        if (item.type == 'event') {
            if (item.event.includes('wins the bid')) acted = undefined;
        } else if (item.move.name == 'ChoosePowerPlant') {
            acted = new Set();
        } else if (acted && item.move.name == 'Pass' && acted.has(item.player)) {
            duplicates.add(i);
        } else if (acted && (item.move.name == 'Pass' || item.move.name == 'Bid')) {
            acted.add(item.player);
        }
    });
    return duplicates;
}

function summary(G: GameState) {
    return G.players.map((p) => ({
        money: p.money,
        cities: p.cities.map((c) => c.name).sort(),
        powerPlants: p.powerPlants.map((pp) => pp.number),
    }));
}

describe('Old games replay', () => {
    if (!dir) it.skip('replays every export in PG_GAMES_DIR (not set)');
    files.forEach((file, i) => {
        const exported = JSON.parse(fs.readFileSync(path.join(dir!, file), 'utf8'));
        const want: GameState = exported.data;
        const names: string[] = want.players.map((p) => p.name ?? '').filter((n) => n);
        const redact = (s: string) => names.reduce((t, n, k) => t.split(n).join(`P${k}`), s);
        const entry = (e: LogItem) =>
            e.type == 'move' ? `P${e.player} ${e.move.name} ${JSON.stringify(e.move.data)}` : redact(e.event);

        it(`replays export ${i + 1} (site version ${exported.game.version}, ${want.map.name}) exactly`, () => {
            const duplicates = serverDuplicates(want.log);
            const log = want.log.filter((_, k) => !duplicates.has(k));
            const G = reconstructState({ ...want, log, options: { ...want.options, version: exported.game.version } });

            expect(summary(G), 'final money, cities and plants').to.deep.equal(summary(want));
            expect(G.log.map(entry), 'log').to.deep.equal(log.map(entry));
        });
    });
});
