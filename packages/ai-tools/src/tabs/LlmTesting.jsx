import React, {useRef, useState} from 'react';
import {Button, Card, InputGroup, TextField} from '@heroui/react';

// Moved off the same-origin /llm-testing/api/ proxy: the Qwen model now
// runs on GKE (see the qwen-llm-gke repo) behind its own subdomain rather
// than the main load balancer, so this is a genuine cross-origin request —
// the GKE deployment's nginx sidecar adds the CORS headers this needs.
const API_URL = 'https://llm.bradjobe.dev/v1/chat/completions';
const SYSTEM_PROMPT =
    'You are a small, friendly demo assistant running on a multi-node Kubernetes cluster. ' +
    'Keep replies short (a few sentences at most) since you are a small quantized model.';
const MAX_HISTORY_TURNS = 6;

// Running CPU-only across 4 Spot nodes for now — GKE has a GPU node pool
// defined and ready (see qwen-llm-gke's README), just waiting on GCP GPU
// quota approval. Update these two lines and the tok/s line below once
// that lands and inference moves back to GPU.
const DETAILS = [
    ['Model', 'Qwen2.5-0.5B-Instruct, quantized to Q4_K_M GGUF (~470MB)'],
    ['Serving', "llama.cpp's llama-server, OpenAI-compatible API, running in GKE across 4 Spot nodes"],
    ['Process management', "Kubernetes Deployment with pod anti-affinity spreading replicas across nodes — auto-restart, resource-limited"],
    ['Edge', "GKE Ingress with a Google-managed TLS cert, fronted by a Cloud Armor per-IP rate limit"],
    ['Hardware', '4x e2-standard-2 Spot nodes, CPU inference — a GPU node pool is provisioned and ready, pending GCP quota approval']
];

function Message({role, text, pending, error}) {
    const isUser = role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm ' +
                    (isUser
                        ? 'bg-accent text-accent-foreground'
                        : error
                            ? 'bg-danger-soft text-danger-soft-foreground'
                            : 'bg-surface-secondary text-surface-secondary-foreground') +
                    (pending ? ' animate-pulse' : '')
                }
            >
                {text}
            </div>
        </div>
    );
}

export default function LlmTesting() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const historyRef = useRef([]);

    async function sendMessage(userText) {
        historyRef.current.push({role: 'user', content: userText});
        historyRef.current = historyRef.current.slice(-MAX_HISTORY_TURNS * 2);

        setMessages((m) => [...m, {role: 'user', text: userText}]);
        const pendingIndex = {current: -1};
        setMessages((m) => {
            pendingIndex.current = m.length;
            return [...m, {role: 'assistant', text: '', pending: true}];
        });
        setBusy(true);
        setStatus('thinking…');

        const startedAt = performance.now();
        let chunkCount = 0;
        let fullText = '';

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    messages: [{role: 'system', content: SYSTEM_PROMPT}, ...historyRef.current],
                    max_tokens: 200,
                    temperature: 0.7,
                    stream: true
                })
            });

            if (res.status === 429) {
                setMessages((m) => {
                    const copy = [...m];
                    copy[pendingIndex.current] = {
                        role: 'assistant',
                        text: 'Rate limited — this demo allows a few messages per minute per visitor. Try again shortly.',
                        error: true
                    };
                    return copy;
                });
                historyRef.current.pop();
                setStatus('rate limited');
                return;
            }

            if (!res.ok || !res.body) throw new Error(`Backend returned ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                buf += decoder.decode(value, {stream: true});
                const lines = buf.split('\n');
                buf = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const payload = trimmed.slice(5).trim();
                    if (payload === '[DONE]') continue;
                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            chunkCount += 1;
                            const text = fullText;
                            setMessages((m) => {
                                const copy = [...m];
                                copy[pendingIndex.current] = {role: 'assistant', text};
                                return copy;
                            });
                        }
                    } catch {
                        // ignore partial/non-JSON keep-alive lines
                    }
                }
            }

            if (!fullText) {
                setMessages((m) => {
                    const copy = [...m];
                    copy[pendingIndex.current] = {role: 'assistant', text: '(empty response — try rephrasing)'};
                    return copy;
                });
            } else {
                historyRef.current.push({role: 'assistant', content: fullText});
            }

            const elapsedS = (performance.now() - startedAt) / 1000;
            const approxTokPerSec = chunkCount > 0 ? (chunkCount / elapsedS).toFixed(1) : '0';
            setStatus(`~${approxTokPerSec} tok/s · ${elapsedS.toFixed(1)}s · Spot CPU node`);
        } catch (err) {
            setMessages((m) => {
                const copy = [...m];
                copy[pendingIndex.current] = {
                    role: 'assistant',
                    text: 'Something went wrong reaching the model server. Please try again.',
                    error: true
                };
                return copy;
            });
            historyRef.current.pop();
            setStatus('error');
        } finally {
            setBusy(false);
        }
    }

    function onSubmit(e) {
        e.preventDefault();
        if (busy) return;
        const text = input.trim();
        if (!text) return;
        setInput('');
        sendMessage(text);
    }

    return (
        <>
            <h1 className="text-3xl font-bold">Self-hosted LLM demo</h1>
            <p className="mt-2 text-muted">
                A small language model, self-hosted across multiple Spot nodes in this site&apos;s own GKE
                cluster &mdash; no external API calls.
            </p>

            <button
                className="mt-4 text-sm font-medium text-accent"
                onClick={() => setDetailsOpen((v) => !v)}
            >
                How this is built {detailsOpen ? '▾' : '▸'}
            </button>
            {detailsOpen &&
            <Card className="mt-2">
                <Card.Content>
                    <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
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
                <Card.Content className="flex flex-col gap-3 min-h-[320px] max-h-[480px] overflow-y-auto">
                    {messages.length === 0 &&
                    <Message role="assistant" text="Hi! I'm a tiny model running on a small Kubernetes cluster. Ask me something short." />
                    }
                    {messages.map((m, i) => <Message key={i} {...m} />)}
                </Card.Content>
                <Card.Footer className="flex-col items-stretch gap-2">
                    <form
                        onSubmit={onSubmit}
                        className="flex gap-2"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit(e);
                            }
                        }}
                    >
                        <TextField className="flex-1" aria-label="Message" value={input} onChange={setInput} isDisabled={busy}>
                            <InputGroup>
                                <InputGroup.TextArea placeholder="Message the model…" rows={1} maxLength={500}/>
                            </InputGroup>
                        </TextField>
                        <Button type="submit" isDisabled={busy || !input.trim()}>Send</Button>
                    </form>
                    <p className="text-xs text-muted">{status || 'Rate-limited to a few requests per minute per visitor — it\'s a small model doing its best.'}</p>
                </Card.Footer>
            </Card>
        </>
    );
}
