import React, {useEffect, useState} from 'react';
import {Card, Link} from '@heroui/react';

const DOT = {good: 'bg-success', warning: 'bg-warning', critical: 'bg-danger'};

function fmtMs(v) {
    if (v === null || v === undefined) return '—';
    return `${v.toFixed(0)}ms`;
}

async function fetchJson(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return {ok: false, status: res.status};
        return {ok: true, data: await res.json()};
    } catch (e) {
        return {ok: false, error: String(e)};
    }
}

function Tile({name, value, sub, level}) {
    return (
        <Card>
            <Card.Content>
                <div className="flex items-center gap-2 text-sm text-muted">
                    {level && <span className={`inline-block w-2 h-2 rounded-full ${DOT[level]}`}/>}
                    {name}
                </div>
                <div className="text-2xl font-bold mt-1">{value}</div>
                <div className="text-xs text-muted mt-1">{sub || ' '}</div>
            </Card.Content>
        </Card>
    );
}

function DistributionBars({counts, emptyHint}) {
    const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return <p className="text-sm text-muted">{emptyHint}</p>;
    const max = entries[0][1];
    return (
        <div className="flex flex-col gap-2">
            {entries.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                    <div className="w-28 shrink-0 truncate">{label}</div>
                    <div className="flex-1 h-2 rounded-full bg-surface-secondary overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{width: `${Math.max(4, (count / max) * 100)}%`}}/>
                    </div>
                    <div className="w-10 text-right text-muted tabular-nums">{count}</div>
                </div>
            ))}
        </div>
    );
}

function eventDetail(e) {
    if (e.type === 'tool_executed') return `"${e.title}" → ${e.genre} (${(e.confidence * 100).toFixed(0)}%)`;
    if (e.type === 'tool_blocked') return `"${e.user_message}" (model proposed: "${e.proposed}")`;
    if (e.type === 'tool_malformed') return `"${e.user_message}" (raw: ${JSON.stringify(e.raw_model_output).slice(0, 60)})`;
    return '';
}

const EVT_TAG_CLS = {
    tool_executed: 'bg-success-soft text-success-soft-foreground',
    tool_blocked: 'bg-warning-soft text-warning-soft-foreground',
    tool_malformed: 'bg-danger-soft text-danger-soft-foreground'
};

export default function Status({onNavigate}) {
    const [tiles, setTiles] = useState([]);
    const [precision, setPrecision] = useState(null);
    const [events, setEvents] = useState([]);
    const [genreCounts, setGenreCounts] = useState({});
    const [imageCounts, setImageCounts] = useState({});
    const [updated, setUpdated] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function refresh() {
            const [agentRes, genreRes, imageRes] = await Promise.all([
                fetchJson('/status/api/agent-stats'),
                fetchJson('/status/api/genre-stats'),
                fetchJson('/status/api/image-stats')
            ]);
            if (cancelled) return;

            const nextTiles = [];

            if (agentRes.ok) {
                const a = agentRes.data;
                nextTiles.push({name: 'agent-orchestrator', value: a.metrics.requests_total, sub: `p50 ${fmtMs(a.latency_ms.p50)} · p95 ${fmtMs(a.latency_ms.p95)}`, level: 'good'});
                const pct = a.tool_trigger_precision === null ? '—' : `${(a.tool_trigger_precision * 100).toFixed(0)}%`;
                setPrecision({
                    pct,
                    detail: `${a.metrics.tool_executed_total} executed / ${a.metrics.tool_proposed_total + a.metrics.tool_malformed_total} proposed — ${a.metrics.tool_blocked_total} off-topic-blocked, ${a.metrics.tool_malformed_total} malformed`
                });
                setEvents(a.recent_events || []);
                nextTiles.push({name: 'llama-server', value: 'reachable', sub: 'via agent-orchestrator calls; see journalctl -u llama-server for token/sec', level: 'good'});
            } else {
                nextTiles.push({name: 'agent-orchestrator', value: 'down', sub: agentRes.status ? `HTTP ${agentRes.status}` : 'unreachable', level: 'critical'});
                nextTiles.push({name: 'llama-server', value: 'unknown', sub: 'via agent-orchestrator calls; see journalctl -u llama-server for token/sec', level: 'warning'});
            }

            if (genreRes.ok) {
                const g = genreRes.data;
                nextTiles.push({name: 'genre-classifier', value: g.requests_total, sub: `p50 ${fmtMs(g.latency_ms.p50)} · p95 ${fmtMs(g.latency_ms.p95)}`, level: 'good'});
                setGenreCounts(g.genre_counts || {});
            } else {
                nextTiles.push({name: 'genre-classifier', value: 'down', sub: genreRes.status ? `HTTP ${genreRes.status}` : 'unreachable', level: 'critical'});
            }

            if (imageRes.ok) {
                const im = imageRes.data;
                nextTiles.push({name: 'image-classifier', value: im.requests_total, sub: `p50 ${fmtMs(im.latency_ms.p50)} · p95 ${fmtMs(im.latency_ms.p95)}`, level: 'good'});
                setImageCounts(im.class_counts || {});
            } else {
                nextTiles.push({name: 'image-classifier', value: 'down', sub: imageRes.status ? `HTTP ${imageRes.status}` : 'unreachable', level: 'critical'});
            }

            setTiles(nextTiles);
            setUpdated(`updated ${new Date().toLocaleTimeString()} — refreshes every 5s`);
        }

        refresh();
        const id = setInterval(refresh, 5000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    return (
        <>
            <h1 className="text-3xl font-bold">Live telemetry</h1>
            <p className="mt-2 text-muted">
                Real metrics from the services below, polled every 5s directly from each service&apos;s own{' '}
                <code className="text-sm bg-surface-secondary px-1 rounded">/stats</code> endpoint &mdash; no
                Prometheus/Grafana at this scale, but the same idea: counters and latency percentiles collected
                in-process and exposed for scraping.
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {tiles.map((t) => <Tile key={t.name} {...t} />)}
            </div>

            <Card className="mt-6">
                <Card.Header><Card.Title>Agent tool-trigger precision</Card.Title></Card.Header>
                <Card.Content>
                    <p className="text-sm text-muted mb-2">
                        Of all times the LLM proposed calling the genre-classifier tool (including hallucinated/malformed
                        attempts), the share where the deterministic guardrail actually let it through. Low precision
                        here is expected and honestly reported &mdash; see the{' '}
                        <Link onPress={() => onNavigate('agent')}>Agent tab</Link>{' '}
                        for why the model&apos;s own judgment isn&apos;t trusted.
                    </p>
                    <div className="text-3xl font-bold">
                        {precision?.pct ?? '—'}
                        {precision && <span className="text-sm font-normal text-muted ml-2">({precision.detail})</span>}
                    </div>
                </Card.Content>
            </Card>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
                <Card>
                    <Card.Header><Card.Title>Image classifier</Card.Title><Card.Description>Prediction distribution</Card.Description></Card.Header>
                    <Card.Content>
                        <DistributionBars counts={imageCounts} emptyHint={<>No predictions yet, try the <Link onPress={() => onNavigate('vision')}>Vision tab</Link>.</>}/>
                    </Card.Content>
                </Card>
                <Card>
                    <Card.Header><Card.Title>Genre classifier</Card.Title><Card.Description>Prediction distribution</Card.Description></Card.Header>
                    <Card.Content>
                        <DistributionBars counts={genreCounts} emptyHint={<>No predictions yet, try the <Link onPress={() => onNavigate('genre')}>Classifier tab</Link>.</>}/>
                    </Card.Content>
                </Card>
            </div>

            <Card className="mt-6">
                <Card.Header><Card.Title>Recent agent events</Card.Title><Card.Description>Last requests to the agent orchestrator, most recent first.</Card.Description></Card.Header>
                <Card.Content>
                    {events.length === 0
                        ? <p className="text-sm text-muted">No agent requests yet, try the <Link onPress={() => onNavigate('agent')}>Agent tab</Link>.</p>
                        : <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-muted border-b border-separator">
                                        <th className="py-1 pr-4 font-medium">time</th>
                                        <th className="py-1 pr-4 font-medium">outcome</th>
                                        <th className="py-1 font-medium">detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.slice(0, 15).map((e, i) => (
                                        <tr key={i} className="border-b border-separator/50">
                                            <td className="py-1.5 pr-4 whitespace-nowrap">{new Date(e.ts * 1000).toLocaleTimeString()}</td>
                                            <td className="py-1.5 pr-4">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${EVT_TAG_CLS[e.type] || 'bg-surface-secondary'}`}>
                                                    {e.type.replace('tool_', '')}
                                                </span>
                                            </td>
                                            <td className="py-1.5">{eventDetail(e)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                </Card.Content>
            </Card>

            <p className="mt-4 text-xs text-muted">{updated}</p>
        </>
    );
}
