import { containsPattern, escapeLike } from './like.util';

describe('escapeLike / containsPattern', () => {
    it('should escape the characters that mean something inside a pattern', () => {
        expect(escapeLike('50%')).toBe('50\\%');
        expect(escapeLike('a_b')).toBe('a\\_b');
        expect(escapeLike('c:\\dir')).toBe('c:\\\\dir');
    });

    it('should leave ordinary text alone and wrap it for a "contains" search', () => {
        expect(escapeLike('Freezer 1')).toBe('Freezer 1');
        expect(containsPattern('Freezer')).toBe('%Freezer%');
        expect(containsPattern('100%')).toBe('%100\\%%');
    });
});
