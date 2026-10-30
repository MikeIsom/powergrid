import { expect } from 'chai';
import 'mocha';
import { addPowerPlant, getPowerPlant, setup } from './engine';
import { GameOptions, Phase } from './gamestate';
import { rulesApply } from './rule-versions';

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
});
