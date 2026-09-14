import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import GenreClassifier from './GenreClassifier';

// End-to-end through the real fetch call (mocked at the network boundary),
// not just the extracted postJson helper — this is what actually proves
// the tab is still wired up correctly after pulling the request/429/error
// handling out into ../lib/apiRequest.
describe('GenreClassifier', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete global.fetch;
    });

    it('shows the rate-limit message on a 429 response', async () => {
        global.fetch = vi.fn().mockResolvedValue({status: 429, ok: false, json: vi.fn()});
        render(<GenreClassifier/>);

        fireEvent.change(screen.getByRole('textbox', {name: /song title/i}), {target: {value: 'Bohemian Rhapsody'}});
        fireEvent.click(screen.getByRole('button', {name: /classify/i}));

        await waitFor(() => {
            expect(screen.getByText(
                'Rate limited — this demo allows a few requests per minute per visitor. Try again shortly.'
            )).toBeInTheDocument();
        });
    });

    it('shows a backend error message when the response is not ok', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 500,
            ok: false,
            json: async () => ({error: 'model failed to load'})
        });
        render(<GenreClassifier/>);

        fireEvent.change(screen.getByRole('textbox', {name: /song title/i}), {target: {value: 'Some Title'}});
        fireEvent.click(screen.getByRole('button', {name: /classify/i}));

        await waitFor(() => {
            expect(screen.getByText('model failed to load')).toBeInTheDocument();
        });
    });

    it('renders the predicted genre and score bars on success', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({
                genre: 'rock',
                confidence: 0.87,
                elapsed_ms: 12,
                scores: [
                    {genre: 'rock', probability: 0.87},
                    {genre: 'pop', probability: 0.1}
                ]
            })
        });
        render(<GenreClassifier/>);

        fireEvent.change(screen.getByRole('textbox', {name: /song title/i}), {target: {value: 'Some Title'}});
        fireEvent.click(screen.getByRole('button', {name: /classify/i}));

        await waitFor(() => {
            expect(screen.getByText('rock', {selector: 'span.text-xl'})).toBeInTheDocument();
        });
        expect(screen.getByText((_, node) => node?.textContent === '87.0% confidence')).toBeInTheDocument();
        // The top-6 score bars, including the runner-up genre, also render.
        expect(screen.getByText('pop')).toBeInTheDocument();
    });
});
