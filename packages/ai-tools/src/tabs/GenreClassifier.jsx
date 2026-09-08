import React, {useState} from 'react';
import {Button, Card, InputGroup, TextField} from '@heroui/react';

const API_URL = '/genre-classifier/api/predict';

const DETAILS = [
    ['Task', '11-class genre classification from song title text only — a deliberately weak-signal problem (titles rarely encode genre)'],
    ['Data', 'Spotify Tracks Dataset (114k rows, 114 raw tags), collapsed into 11 broad genres and deduplicated to remove cross-genre label noise → ~38k clean examples'],
    ['Models compared', 'A from-scratch PyTorch embedding+MLP classifier vs. TF-IDF (char n-grams) + Logistic Regression'],
    ['Result', 'The classical model won: 41% test accuracy / 0.38 macro-F1, vs 36% for the neural net — and vs a 12% majority-class baseline. Shipped the simpler, better, cheaper model.'],
    ['Serving', 'Flask + waitress (WSGI), systemd-managed, memory-capped, loopback-only, behind nginx with rate limiting']
];

function Bar({label, probability}) {
    return (
        <div className="flex items-center gap-3 text-sm">
            <div className="w-28 shrink-0 truncate">{label}</div>
            <div className="flex-1 h-2 rounded-full bg-surface-secondary overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{width: `${Math.max(2, probability * 100)}%`}}/>
            </div>
            <div className="w-12 text-right text-muted tabular-nums">{(probability * 100).toFixed(1)}%</div>
        </div>
    );
}

export default function GenreClassifier() {
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        const value = title.trim();
        if (!value) return;

        setBusy(true);
        setStatus('classifying…');
        setError('');
        const startedAt = performance.now();

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title: value})
            });

            if (res.status === 429) {
                setError('Rate limited — this demo allows a few requests per minute per visitor. Try again shortly.');
                setStatus('rate limited');
                return;
            }

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || `Backend returned ${res.status}`);
                setStatus('error');
                return;
            }

            setResult(data);
            const elapsedS = (performance.now() - startedAt) / 1000;
            setStatus(`${elapsedS.toFixed(2)}s round trip · ${data.elapsed_ms}ms model inference`);
        } catch (err) {
            setError('Something went wrong reaching the classifier. Please try again.');
            setStatus('error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <h1 className="text-3xl font-bold">Song genre classifier</h1>
            <p className="mt-2 text-muted">
                A small model I trained from scratch on ~38k Spotify tracks &mdash; predicting genre from the{' '}
                <strong>title text alone</strong> (no audio features). Self-hosted on the same VPS as the LLM demo.
            </p>

            <button className="mt-4 text-sm font-medium text-accent" onClick={() => setDetailsOpen((v) => !v)}>
                How this is built {detailsOpen ? '▾' : '▸'}
            </button>
            {detailsOpen &&
            <Card className="mt-2">
                <Card.Content>
                    <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
                        {DETAILS.map(([k, v]) => (
                            <React.Fragment key={k}>
                                <dt className="font-semibold text-muted">{k}</dt>
                                <dd>{v}</dd>
                            </React.Fragment>
                        ))}
                    </dl>
                </Card.Content>
            </Card>
            }

            <Card className="mt-6">
                <Card.Content>
                    <form onSubmit={onSubmit} className="flex gap-2">
                        <TextField className="flex-1" aria-label="Song title" value={title} onChange={setTitle} isDisabled={busy}>
                            <InputGroup>
                                <InputGroup.Input placeholder="Type a song title… e.g. Bohemian Rhapsody" maxLength={200}/>
                            </InputGroup>
                        </TextField>
                        <Button type="submit" isDisabled={busy || !title.trim()}>Classify</Button>
                    </form>
                    <p className="mt-2 text-xs text-muted">
                        {status || 'Trained on song metadata only — no audio, no lyrics. Expect it to be wrong often; that\'s the honest result of this task.'}
                    </p>

                    {error &&
                    <p className="mt-4 text-sm text-danger">{error}</p>
                    }

                    {result &&
                    <div className="mt-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold">{result.genre}</span>
                            <span className="text-muted">{(result.confidence * 100).toFixed(1)}% confidence</span>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            {result.scores.slice(0, 6).map((s) => <Bar key={s.genre} label={s.genre} probability={s.probability}/>)}
                        </div>
                    </div>
                    }
                </Card.Content>
            </Card>
        </>
    );
}
