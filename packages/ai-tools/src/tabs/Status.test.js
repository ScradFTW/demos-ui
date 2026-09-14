import {describe, expect, it} from 'vitest';
import {eventDetail, fmtMs} from './Status';

describe('fmtMs', () => {
    it('formats a number as a rounded millisecond string', () => {
        expect(fmtMs(12.4)).toBe('12ms');
        expect(fmtMs(12.6)).toBe('13ms');
        expect(fmtMs(0)).toBe('0ms');
    });

    it('renders an em dash for missing values', () => {
        expect(fmtMs(null)).toBe('—');
        expect(fmtMs(undefined)).toBe('—');
    });
});

describe('eventDetail', () => {
    it('describes a tool_executed event with the predicted genre and confidence', () => {
        const detail = eventDetail({
            type: 'tool_executed',
            title: 'Bohemian Rhapsody',
            genre: 'rock',
            confidence: 0.874
        });
        expect(detail).toBe('"Bohemian Rhapsody" → rock (87%)');
    });

    it('describes a tool_blocked event with the user message and what the model proposed', () => {
        const detail = eventDetail({
            type: 'tool_blocked',
            user_message: 'hello there',
            proposed: 'classify_genre'
        });
        expect(detail).toBe('"hello there" (model proposed: "classify_genre")');
    });

    it('describes a tool_malformed event, truncating the raw model output to 60 chars', () => {
        const longRaw = 'x'.repeat(100);
        const detail = eventDetail({
            type: 'tool_malformed',
            user_message: 'what genre is this',
            raw_model_output: longRaw
        });
        expect(detail).toBe(`"what genre is this" (raw: ${JSON.stringify(longRaw).slice(0, 60)})`);
        expect(detail.length).toBeLessThan(200);
    });

    it('returns an empty string for an unrecognized event type', () => {
        expect(eventDetail({type: 'something_else'})).toBe('');
    });
});
