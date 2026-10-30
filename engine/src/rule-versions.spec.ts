import { expect } from 'chai';
import 'mocha';
import { setup } from './engine';
import { rulesApply } from './rule-versions';

describe('Rule versions', () => {
    it('stores the version option only when it is set', () => {
        expect(setup(3, { map: 'USA' }, 'versions').options).not.to.have.property('version');
        expect(setup(3, { map: 'USA', version: 3 }, 'versions').options.version).to.equal(3);
    });

    it('applies every change to a game without a version', () => {
        expect(rulesApply({}, 'any' as never)).to.be.true;
    });
});
