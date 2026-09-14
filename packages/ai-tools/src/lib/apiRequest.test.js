import {afterEach, describe, expect, it, vi} from 'vitest';
import {postJson} from './apiRequest';

function mockFetchOnce(response) {
    global.fetch = vi.fn().mockResolvedValue(response);
    return global.fetch;
}

describe('postJson', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete global.fetch;
    });

    it('POSTs the body as JSON with the right headers', async () => {
        const fetchMock = mockFetchOnce({
            status: 200,
            ok: true,
            json: async () => ({genre: 'rock'})
        });

        await postJson('/genre-classifier/api/predict', {title: 'Bohemian Rhapsody'});

        expect(fetchMock).toHaveBeenCalledWith('/genre-classifier/api/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: 'Bohemian Rhapsody'})
        });
    });

    it('returns kind "ok" with the parsed body on success', async () => {
        mockFetchOnce({status: 200, ok: true, json: async () => ({genre: 'rock', confidence: 0.9})});
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'ok', data: {genre: 'rock', confidence: 0.9}});
    });

    it('returns kind "rate_limited" on HTTP 429 without parsing a body', async () => {
        const jsonSpy = vi.fn();
        mockFetchOnce({status: 429, ok: false, json: jsonSpy});
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'rate_limited'});
        expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('returns kind "error" with the backend\'s message when the response is not ok', async () => {
        mockFetchOnce({status: 500, ok: false, json: async () => ({error: 'model unavailable'})});
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'error', message: 'model unavailable'});
    });

    it('falls back to a generic status message when an error response has no error field', async () => {
        mockFetchOnce({status: 503, ok: false, json: async () => ({})});
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'error', message: 'Backend returned 503'});
    });

    it('returns kind "network_error" when fetch itself rejects', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'network_error'});
    });

    it('returns kind "network_error" when the response body is not valid JSON', async () => {
        mockFetchOnce({
            status: 200,
            ok: true,
            json: async () => { throw new SyntaxError('Unexpected token'); }
        });
        const result = await postJson('/x', {});
        expect(result).toEqual({kind: 'network_error'});
    });
});
