// Pure helper for parsing an OpenAI-compatible SSE chat-completions stream.
// Extracted out of LlmTesting.jsx so the buffering/parsing logic (partial
// lines across chunk boundaries, "data: ..." JSON payloads, the [DONE]
// sentinel, and non-JSON keep-alive lines) can be unit tested without
// mounting the component or a real ReadableStream.

/**
 * Feed one newly-decoded chunk of SSE text through the parser, along with
 * whatever incomplete line was left over from the previous chunk.
 *
 * @param {string} buf - leftover partial line from the previous call ('' initially)
 * @param {string} chunkText - newly decoded text to append to buf
 * @returns {{buf: string, deltas: string[]}} the new leftover partial line,
 *   and the list of non-empty assistant content deltas found in this chunk
 *   (in order).
 */
export function extractSseDeltas(buf, chunkText) {
    const combined = buf + chunkText;
    const lines = combined.split('\n');
    const remainder = lines.pop() ?? '';

    const deltas = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) deltas.push(delta);
        } catch {
            // ignore partial/non-JSON keep-alive lines
        }
    }

    return {buf: remainder, deltas};
}
