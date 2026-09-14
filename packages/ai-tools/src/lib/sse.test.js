import {describe, expect, it} from 'vitest';
import {extractSseDeltas} from './sse';

describe('extractSseDeltas', () => {
    it('extracts a single delta from a complete SSE line', () => {
        const chunk = 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n';
        const {buf, deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual(['Hi']);
        expect(buf).toBe('');
    });

    it('extracts multiple data lines delivered in one chunk, in order', () => {
        const chunk =
            'data: {"choices":[{"delta":{"content":"Hel"}}]}\n' +
            'data: {"choices":[{"delta":{"content":"lo"}}]}\n';
        const {deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual(['Hel', 'lo']);
    });

    it('buffers a partial line split across two network chunks', () => {
        // The server can flush mid-line; the leftover from call 1 must be
        // prepended before parsing call 2.
        const first = extractSseDeltas('', 'data: {"choices":[{"delta":{"conte');
        expect(first.deltas).toEqual([]);
        expect(first.buf).toBe('data: {"choices":[{"delta":{"conte');

        const second = extractSseDeltas(first.buf, 'nt":"partial"}}]}\n');
        expect(second.deltas).toEqual(['partial']);
        expect(second.buf).toBe('');
    });

    it('keeps a trailing line with no newline yet as the returned buf', () => {
        const {buf, deltas} = extractSseDeltas('', 'data: {"choices":[{"delta":{"content":"done"}}]}\nda');
        expect(deltas).toEqual(['done']);
        expect(buf).toBe('da');
    });

    it('ignores the [DONE] sentinel', () => {
        const {buf, deltas} = extractSseDeltas('', 'data: [DONE]\n');
        expect(deltas).toEqual([]);
        expect(buf).toBe('');
    });

    it('ignores non-JSON keep-alive lines without throwing', () => {
        expect(() => extractSseDeltas('', 'data: keep-alive\n')).not.toThrow();
        const {deltas} = extractSseDeltas('', 'data: keep-alive\n');
        expect(deltas).toEqual([]);
    });

    it('ignores lines that are not "data:" lines (blank lines, comments)', () => {
        const chunk = '\n: this is a comment\nevent: ping\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n';
        const {deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual(['ok']);
    });

    it('ignores a valid JSON payload with no delta content', () => {
        const chunk = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\n';
        const {deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual([]);
    });

    it('ignores an empty-string delta (falsy) the same way as no content', () => {
        const chunk = 'data: {"choices":[{"delta":{"content":""}}]}\n';
        const {deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual([]);
    });

    it('handles a payload with extra whitespace after "data:"', () => {
        const chunk = 'data:   {"choices":[{"delta":{"content":"x"}}]}   \n';
        const {deltas} = extractSseDeltas('', chunk);
        expect(deltas).toEqual(['x']);
    });

    it('starts fresh with an empty buffer and empty chunk', () => {
        const {buf, deltas} = extractSseDeltas('', '');
        expect(buf).toBe('');
        expect(deltas).toEqual([]);
    });
});
