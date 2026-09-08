import React from 'react';
import {Card, Link} from '@heroui/react';

const SECTIONS = [
    {n: '01', href: '/llm-testing/', label: 'LLM serving'},
    {n: '02', href: '/genre-classifier/', label: 'Trained text classifier'},
    {n: '03', href: '/image-classifier/', label: 'Trained vision classifier'},
    {n: '04', href: '/agent-demo/', label: 'Reasoning agent'},
    {n: '05', href: '/status/', label: 'Live telemetry'}
];

const REQUIREMENTS = [
    ['Deploy/operate model serving in production', <><Link href="/llm-testing/">LLM serving</Link>: OpenAI-compatible API via llama.cpp, systemd-managed (auto-restart, memory-capped), streaming, loopback-only + reverse proxy</>],
    ['Build validation/evaluation pipelines', <><Link href="/genre-classifier/">Trained text classifier</Link>: two models benchmarked head-to-head on a held-out test set (accuracy, macro-F1, confusion matrix, majority-class baseline) before choosing what to ship</>],
    ['Computer vision / multi-modal model development', <><Link href="/image-classifier/">Trained vision classifier</Link>: a CNN trained from scratch (80.6% test accuracy vs. 10% baseline), trained on GPU and exported to ONNX for CPU-only production serving — verified byte-identical predictions before deploying. A second modality alongside the text pipeline, not just more text.</>],
    ['Validate quality in the long tail; catch exceptions early', <><Link href="/agent-demo/">Reasoning agent</Link>&apos;s guardrail layer: empirically found the LLM proposes its one tool for irrelevant messages (and once hallucinated a tool that doesn&apos;t exist) — a deterministic check gates execution instead of trusting the model&apos;s own judgment</>],
    ['Reasoning agent infrastructure: orchestration, tool execution, guardrails', <><Link href="/agent-demo/">Reasoning agent</Link>: a small orchestrator service between the LLM and the classifier tool, with explicit propose → guard → execute → re-ground stages, all traced</>],
    ['Telemetry, observability, dashboards', <><Link href="/status/">Live telemetry</Link>: real in-process counters and latency percentiles per service, an event log of every agent decision, polled live — not a mockup</>],
    ['Reliability, performance, cost efficiency', 'Model size and architecture chosen for the hardware, not the other way around: 0.5B LLM sized for 1 shared vCPU; classical TF-IDF+LogReg picked over a neural net after it won on accuracy and cost; nginx rate limiting protects the single core from being monopolized'],
    ['Evangelize effective practices', <>Shipping the simpler model after a fair comparison, instead of defaulting to deep learning — see the honest writeup on <Link href="/genre-classifier/">/genre-classifier</Link></>],
    ['Security controls, operational safeguards', 'HTTP Basic Auth at the edge, TLS throughout, every backend loopback-only, systemd sandboxing per service, request-size and rate limits']
];

function DiagramBox({title, sub, className = ''}) {
    return (
        <div className={`rounded-lg border border-border bg-surface px-3 py-2 text-center ${className}`}>
            <div className="text-sm font-semibold">{title}</div>
            {sub && <div className="text-xs text-muted">{sub}</div>}
        </div>
    );
}

export default function App() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-separator">
                <div className="mx-auto max-w-3xl px-6 py-3 text-sm">
                    <Link href="/">&larr; bradjobe.dev</Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-10">
                <h1 className="text-3xl font-bold">Self-hosted ML infrastructure</h1>
                <p className="mt-2 text-muted">
                    Five small, real, running systems on a single $5/mo 1-vCPU / 2GB VPS &mdash; built to demonstrate
                    the production side of ML/LLM/CV work: serving, evaluation, guardrails, and observability, across
                    both text and vision.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                    {SECTIONS.map((s) => (
                        <Link key={s.n} href={s.href} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 no-underline hover:bg-surface-secondary">
                            <span className="text-accent font-mono text-sm">{s.n}</span>
                            <span className="flex-1 font-medium text-foreground">{s.label}</span>
                            <span className="text-muted">&rarr;</span>
                        </Link>
                    ))}
                </div>

                <h2 className="text-xl font-bold mt-12 border-l-4 border-accent pl-3">System diagram</h2>
                <Card className="mt-4">
                    <Card.Content>
                        <div className="flex flex-col items-center gap-2 text-sm">
                            <DiagramBox title="Browser" sub="you"/>
                            <div className="text-xs text-muted">HTTPS + Basic Auth</div>
                            <DiagramBox title="nginx" sub="TLS · rate limits · auth" className="w-full max-w-xs"/>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full mt-2">
                                <DiagramBox title="llama-server" sub="Qwen2.5-0.5B · systemd"/>
                                <DiagramBox title="genre-classifier" sub="Flask+waitress · systemd"/>
                                <DiagramBox title="image-classifier" sub="ONNX Runtime · systemd"/>
                                <DiagramBox title="agent-orchestrator" sub="Flask+waitress · systemd"/>
                            </div>
                            <p className="text-xs text-muted mt-2 text-center">
                                agent-orchestrator calls both llama-server and genre-classifier over loopback — it does
                                not yet call image-classifier. /status polls each service&apos;s own /stats.
                            </p>
                        </div>
                        <p className="mt-4 text-sm text-muted">
                            Every backend service: runs as its own unprivileged systemd user, binds to{' '}
                            <code className="bg-surface-secondary px-1 rounded">127.0.0.1</code> only (never reachable
                            except through nginx), has a hard <code className="bg-surface-secondary px-1 rounded">MemoryMax</code>,
                            and is sandboxed (<code className="bg-surface-secondary px-1 rounded">ProtectSystem=strict</code>,{' '}
                            <code className="bg-surface-secondary px-1 rounded">NoNewPrivileges</code>). Same pattern
                            repeated across every service rather than one-off setups &mdash; the kind of consistency
                            that matters once there&apos;s more than one service to operate.
                        </p>
                    </Card.Content>
                </Card>

                <h2 className="text-xl font-bold mt-12 border-l-4 border-accent pl-3">What each piece demonstrates</h2>
                <div className="mt-4 flex flex-col gap-3">
                    {REQUIREMENTS.map(([req, where], i) => (
                        <Card key={i}>
                            <Card.Content>
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{req}</div>
                                <div className="mt-1 text-sm">{where}</div>
                            </Card.Content>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
