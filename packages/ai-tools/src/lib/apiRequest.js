// Shared POST-JSON request helper for the demo tabs (GenreClassifier,
// ImageClassifier, AgentDemo). Each of those tabs hits its own backend but
// shares the exact same shape of handling: send JSON, treat HTTP 429 as a
// distinct rate-limit outcome (without trying to parse a body), surface a
// backend-provided error message when the response isn't ok, and collapse
// any network/parse failure into one outcome. Extracted so this branching
// is unit-testable with a mocked fetch, independent of each tab's own
// wording and React state.

/**
 * POST a JSON body to `url` and classify the outcome.
 *
 * @returns {Promise<
 *   {kind: 'ok', data: any} |
 *   {kind: 'rate_limited'} |
 *   {kind: 'error', message: string} |
 *   {kind: 'network_error'}
 * >}
 */
export async function postJson(url, body) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });

        if (res.status === 429) {
            return {kind: 'rate_limited'};
        }

        const data = await res.json();
        if (!res.ok) {
            return {kind: 'error', message: data.error || `Backend returned ${res.status}`};
        }

        return {kind: 'ok', data};
    } catch {
        return {kind: 'network_error'};
    }
}
