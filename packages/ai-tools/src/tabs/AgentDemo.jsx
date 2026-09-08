import React, {useState} from 'react';
import {Button, Card, InputGroup, Link, TextField} from '@heroui/react';

const API_URL = '/agent-demo/api/chat';

const DETAILS = [
    ['Orchestration', "A small Flask service (agent-orchestrator) sits between the LLM and the tool. It: asks the LLM whether the message needs the tool → checks that decision against a keyword guardrail → executes the tool only if both agree → asks the LLM again to phrase a final answer using the tool's result."],
    ['Why a separate guardrail', 'Tested empirically: this 0.5B model proposed the tool for "hello, how are you?" and "what is the capital of France?", and once invented an entirely different, unrequested tool. A tiny model\'s own judgment about tool relevance is not reliable enough to trust directly — see the live trigger-precision number on the Telemetry tab.'],
    ['Failure handling', 'Every non-tool path (off-topic guardrail block, hallucinated/malformed tool call, tool-execution error) falls back to a normal conversational answer — the raw model output is never shown to the user directly.'],
    ['Observability', "Every request's outcome (proposed / blocked / malformed / executed) is counted and exposed on the Telemetry tab, including the live tool-trigger precision."]
];

function traceTag(trace) {
    if (trace.tool_executed) return {cls: 'bg-success-soft text-success-soft-foreground', label: '🔧 tool executed'};
    if (trace.blocked_reason?.startsWith('guardrail: malformed')) return {cls: 'bg-warning-soft text-warning-soft-foreground', label: '⚠ malformed tool call blocked'};
    if (trace.blocked_reason?.startsWith('guardrail:')) return {cls: 'bg-warning-soft text-warning-soft-foreground', label: '🛡 tool call blocked (off-topic)'};
    if (trace.blocked_reason === 'tool execution failed') return {cls: 'bg-warning-soft text-warning-soft-foreground', label: '⚠ tool execution failed'};
    return {cls: 'bg-surface-secondary text-surface-secondary-foreground', label: 'no tool involved'};
}

function Message({role, text, pending, error, trace}) {
    const isUser = role === 'user';
    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
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
            {trace &&
            <div className={`text-xs px-2 py-0.5 rounded-full ${traceTag(trace).cls}`}>
                {traceTag(trace).label} &middot; {trace.elapsed_ms}ms
            </div>
            }
        </div>
    );
}

export default function AgentDemo({onNavigate}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);

    async function sendMessage(userText) {
        setMessages((m) => [...m, {role: 'user', text: userText}]);
        let pendingIndex = -1;
        setMessages((m) => {
            pendingIndex = m.length;
            return [...m, {role: 'assistant', text: '…', pending: true}];
        });
        setBusy(true);
        setStatus('thinking…');

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message: userText})
            });

            if (res.status === 429) {
                setMessages((m) => {
                    const copy = [...m];
                    copy[pendingIndex] = {role: 'assistant', text: 'Rate limited — try again in a moment.', error: true};
                    return copy;
                });
                setStatus('rate limited');
                return;
            }

            const data = await res.json();
            if (!res.ok) {
                setMessages((m) => {
                    const copy = [...m];
                    copy[pendingIndex] = {role: 'assistant', text: data.error || `Backend returned ${res.status}`, error: true};
                    return copy;
                });
                setStatus('error');
                return;
            }

            setMessages((m) => {
                const copy = [...m];
                copy[pendingIndex] = {role: 'assistant', text: data.reply, trace: data.trace};
                return copy;
            });
            setStatus(`${data.trace.elapsed_ms}ms total`);
        } catch (err) {
            setMessages((m) => {
                const copy = [...m];
                copy[pendingIndex] = {role: 'assistant', text: 'Something went wrong reaching the agent. Please try again.', error: true};
                return copy;
            });
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
            <h1 className="text-3xl font-bold">Reasoning agent, with one tool</h1>
            <p className="mt-2 text-muted">
                This ties the other tabs together. The LLM (<Link onPress={() => onNavigate('llm')}>LLM Serving</Link>) can
                call the genre classifier (<Link onPress={() => onNavigate('genre')}>Classifier</Link>) as a tool &mdash;
                but its own judgment about when to call it is not trusted. A separate, deterministic guardrail decides that.
            </p>

            <button className="mt-4 text-sm font-medium text-accent" onClick={() => setDetailsOpen((v) => !v)}>
                How this is built {detailsOpen ? '▾' : '▸'}
            </button>
            {detailsOpen &&
            <Card className="mt-2">
                <Card.Content>
                    <dl className="grid grid-cols-[1fr] gap-y-4 text-sm">
                        {DETAILS.map(([k, v]) => (
                            <div key={k}>
                                <dt className="font-semibold text-muted">{k}</dt>
                                <dd className="mt-1">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </Card.Content>
            </Card>
            }

            <Card className="mt-6">
                <Card.Content className="flex flex-col gap-3 min-h-[320px] max-h-[480px] overflow-y-auto">
                    {messages.length === 0 &&
                    <p className="text-sm text-muted">Ask me something. Try a normal question, then try asking about a song&apos;s genre.</p>
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
                                <InputGroup.TextArea placeholder="Ask a question, or ask about a song's genre…" rows={1} maxLength={300}/>
                            </InputGroup>
                        </TextField>
                        <Button type="submit" isDisabled={busy || !input.trim()}>Send</Button>
                    </form>
                    <p className="text-xs text-muted">{status || ' '}</p>
                </Card.Footer>
            </Card>
        </>
    );
}
