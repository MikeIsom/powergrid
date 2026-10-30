// Plays seeded games with random legal moves to completion and reports errors and
// stuck games. Every game is reproducible from its seed: the setup uses it, and so
// does the move picker.
//
//   npx ts-node --transpile-only scripts/stress.ts [--games 200] [--cap 3000]
//       [--variant original,recharged] [--maps USA,Germany] [--players 2,3,4,5,6]
//       [--workers 8] [--json out.json]
//
// A game is "stuck" when it hasn't ended and nobody has a move, and "capped" when it
// hits the move cap first.
import { fork } from 'child_process';
import { writeFileSync } from 'fs';
import seedrandom from 'seedrandom';
import { availableMoves } from '../src/available-moves';
import { ended, move, setup } from '../src/engine';
import { GameState, MapName, Phase, Variant } from '../src/gamestate';
import { maps, mapsRecharged } from '../src/maps';
import { Move, MoveName } from '../src/move';

interface Job {
    variant: Variant;
    map: MapName;
    players: number;
    games: number;
    cap: number;
}

interface Failure {
    seed: string;
    kind: 'error' | 'stuck' | 'capped';
    moves: number;
    round: number;
    phase: Phase;
    message?: string;
}

interface JobResult extends Job {
    ended: number;
    totalMoves: number;
    totalRounds: number;
    failures: Failure[];
}

// The chance of passing whenever a pass is offered alongside something else. Without
// it random players rarely build enough for a game to end.
const passChance: Partial<Record<Phase, number>> = {
    [Phase.Auction]: 0.4,
    [Phase.Resources]: 0.35,
    [Phase.Building]: 0.3,
    [Phase.Bureaucracy]: 0.1,
};

function pick<T>(rng: seedrandom.prng, list: T[]): T {
    return list[Math.floor(rng() * list.length)];
}

// The moves on offer, as names with at least one option. A key can be present with
// an undefined value. ReopenPowering revises an earlier choice, so it's left out.
function offered(G: GameState, player: number): MoveName[] {
    const moves = G.players[player].availableMoves ?? {};
    return (Object.keys(moves) as MoveName[]).filter(
        (name) => name != MoveName.ReopenPowering && ((moves[name] as unknown[] | undefined)?.length ?? 0) > 0
    );
}

function randomMove(G: GameState, rng: seedrandom.prng): { player: number; move: Move } | undefined {
    const candidates = G.currentPlayers.filter((p) => offered(G, p).length > 0);
    if (candidates.length == 0) return undefined;

    const player = pick(rng, candidates);
    const moves = G.players[player].availableMoves!;
    const names = offered(G, player).filter((name) => name != MoveName.Pass);
    if (moves.Pass && (names.length == 0 || rng() < (passChance[G.phase] ?? 0))) {
        return { player, move: { name: MoveName.Pass, data: true } };
    }
    const name = pick(rng, names);
    // Keep bids near the minimum so players don't spend everything on one plant.
    const options = name == MoveName.Bid ? moves.Bid!.slice(0, 3) : (moves[name] as unknown[]);
    return { player, move: { name, data: pick(rng, options) } as Move };
}

function playGame(job: Job, seed: string): { G: GameState; failure?: Failure } {
    const rng = seedrandom(seed + '-moves');
    let G = setup(job.players, { map: job.map, variant: job.variant }, seed);
    let moves = 0;
    const fail = (kind: Failure['kind'], message?: string) => ({
        G,
        failure: { seed, kind, moves, round: G.round, phase: G.phase, message },
    });

    try {
        while (!ended(G)) {
            if (moves >= job.cap) return fail('capped');
            const next = randomMove(G, rng);
            if (!next) {
                // availableMoves is also recomputed here to catch a state whose stored
                // moves are stale rather than genuinely empty.
                const fresh = G.currentPlayers.map((p) => availableMoves(G, G.players[p]));
                return fail(
                    'stuck',
                    `currentPlayers=${JSON.stringify(G.currentPlayers)} fresh=${JSON.stringify(fresh)}`
                );
            }
            G = move(G, next.move, next.player);
            moves++;
        }
    } catch (err) {
        const e = err as Error;
        return fail('error', `${e.message}\n${(e.stack ?? '').split('\n').slice(1, 4).join('\n')}`);
    }
    return { G };
}

function runJob(job: Job): JobResult {
    const result: JobResult = { ...job, ended: 0, totalMoves: 0, totalRounds: 0, failures: [] };
    for (let i = 0; i < job.games; i++) {
        const seed = `stress-${job.variant}-${job.map}-${job.players}p-${i}`;
        const { G, failure } = playGame(job, seed);
        if (failure) {
            result.failures.push(failure);
        } else {
            result.ended++;
            result.totalMoves += G.log.length;
            result.totalRounds += G.round;
        }
    }
    return result;
}

function args(): Record<string, string> {
    const out: Record<string, string> = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
    return out;
}

function main() {
    const a = args();
    const games = Number(a.games ?? 200);
    const cap = Number(a.cap ?? 3000);
    const variants = (a.variant ?? 'original,recharged').split(',') as Variant[];
    const players = (a.players ?? '2,3,4,5,6').split(',').map(Number);
    const workers = Number(a.workers ?? 8);

    const jobs: Job[] = [];
    for (const variant of variants) {
        const mapNames = (variant == 'original' ? maps : mapsRecharged).map((m) => m.name as MapName);
        for (const map of a.maps ? mapNames.filter((m) => a.maps.split(',').includes(m)) : mapNames) {
            for (const n of players) jobs.push({ variant, map, players: n, games, cap });
        }
    }

    const results: JobResult[] = [];
    const started = Date.now();
    let next = 0;
    const startWorker = () => {
        if (next >= jobs.length) return;
        const child = fork(__filename, [], {
            env: { ...process.env, STRESS_WORKER: '1', TS_NODE_TRANSPILE_ONLY: 'true' },
            execArgv: ['-r', 'ts-node/register'],
        });
        const sendNext = () => {
            if (next < jobs.length) child.send(jobs[next++]);
            else child.disconnect();
        };
        child.on('message', (r: JobResult) => {
            results.push(r);
            const bad = r.failures.length ? `  FAILURES ${r.failures.length}` : '';
            console.error(`[${results.length}/${jobs.length}] ${r.variant} ${r.map} ${r.players}p${bad}`);
            sendNext();
        });
        child.on('exit', () => {
            if (results.length == jobs.length) report(results, Date.now() - started, a.json);
        });
        sendNext();
    };
    for (let i = 0; i < Math.min(workers, jobs.length); i++) startWorker();
}

function report(results: JobResult[], ms: number, json?: string) {
    results.sort((x, y) => (x.variant + x.map + x.players).localeCompare(y.variant + y.map + y.players));
    const count = (r: JobResult, kind: Failure['kind']) => r.failures.filter((f) => f.kind == kind).length;
    const total = results.reduce((s, r) => s + r.games, 0);

    console.log('variant\tmap\tplayers\tgames\tended\terrors\tstuck\tcapped\tavgLog\tavgRounds');
    for (const r of results) {
        console.log(
            [
                r.variant,
                r.map,
                r.players,
                r.games,
                r.ended,
                count(r, 'error'),
                count(r, 'stuck'),
                count(r, 'capped'),
                r.ended ? Math.round(r.totalMoves / r.ended) : '-',
                r.ended ? (r.totalRounds / r.ended).toFixed(1) : '-',
            ].join('\t')
        );
    }
    const failures = ([] as Failure[]).concat(...results.map((r) => r.failures));
    console.log(
        `\n${total} games in ${(ms / 1000).toFixed(0)}s: ${total - failures.length} ended, ` +
            `${failures.filter((f) => f.kind == 'error').length} errors, ` +
            `${failures.filter((f) => f.kind == 'stuck').length} stuck, ` +
            `${failures.filter((f) => f.kind == 'capped').length} capped`
    );

    // Group failures by their first message line so a single bug shows up once.
    const groups = new Map<string, Failure[]>();
    for (const f of failures) {
        const key = `${f.kind}: ${(f.message ?? '').split('\n')[0].slice(0, 160)}`;
        groups.set(key, [...(groups.get(key) ?? []), f]);
    }
    for (const [key, list] of groups) {
        console.log(
            `\n${list.length}x ${key}\n  e.g. seed ${list[0].seed}, round ${list[0].round}, phase ${list[0].phase}, move ${list[0].moves}`
        );
        const detail = (list[0].message ?? '').split('\n').slice(1).join('\n');
        if (detail) console.log(detail);
    }
    if (json) writeFileSync(json, JSON.stringify(results, null, 2));
}

if (process.env.STRESS_WORKER) {
    process.on('message', (job: Job) => process.send!(runJob(job)));
} else {
    main();
}
