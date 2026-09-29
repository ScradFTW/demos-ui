import React from 'react';
import {Card, Link} from '@heroui/react';
import {siGithub} from 'simple-icons';

const BrandIcon = ({icon, size = 16}) => (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={`#${icon.hex}`} className="shrink-0">
        <title>{icon.title}</title>
        <path d={icon.path}/>
    </svg>
);

export const SECTIONS = [
    {n: '01', href: '/llm-testing/', label: 'LLM serving', github: 'https://github.com/ScradFTW/qwen-llm-gke'},
    {n: '02', href: '/genre-classifier/', label: 'Trained text classifier', github: 'https://github.com/ScradFTW/llm-testing-deploy/tree/main/genre-classifier'},
    {n: '03', href: '/image-classifier/', label: 'Trained vision classifier', github: 'https://github.com/ScradFTW/llm-testing-deploy/tree/main/image-classifier'},
    {n: '04', href: '/agent-demo/', label: 'Reasoning agent', github: 'https://github.com/ScradFTW/llm-testing-deploy/tree/main/agent-orchestrator'},
    {n: '05', href: '/status/', label: 'Live telemetry', github: 'https://github.com/ScradFTW/demos-ui/tree/main/packages/ai-tools'},
    {n: '06', href: '/pose-tracker/', label: 'On-device pose estimation', github: 'https://github.com/ScradFTW/pose-tracker'}
];

const REQUIREMENTS = [
    ['Deploy/operate model serving in production', <><Link href="/llm-testing/">LLM serving</Link>: OpenAI-compatible API via llama.cpp on GKE (Kubernetes-managed restarts and rescheduling on a Spot node pool), streaming, its own subdomain on the shared load balancer via a standalone GKE NEG + Cloud Armor rate limit</>],
    ['Build validation/evaluation pipelines', <><Link href="/genre-classifier/">Trained text classifier</Link>: two models benchmarked head-to-head on a held-out test set (accuracy, macro-F1, confusion matrix, majority-class baseline) before choosing what to ship</>],
    ['Computer vision / multi-modal model development', <><Link href="/image-classifier/">Trained vision classifier</Link>: a CNN trained from scratch (80.6% test accuracy vs. 10% baseline), trained on GPU and exported to ONNX for CPU-only production serving — verified byte-identical predictions before deploying. A second modality alongside the text pipeline, not just more text.</>],
    ['Validate quality in the long tail; catch exceptions early', <><Link href="/agent-demo/">Reasoning agent</Link>&apos;s guardrail layer: empirically found the LLM proposes its one tool for irrelevant messages (and once hallucinated a tool that doesn&apos;t exist) — a deterministic check gates execution instead of trusting the model&apos;s own judgment</>],
    ['Reasoning agent infrastructure: orchestration, tool execution, guardrails', <><Link href="/agent-demo/">Reasoning agent</Link>: a small orchestrator service between the LLM and the classifier tool, with explicit propose → guard → execute → re-ground stages, all traced</>],
    ['Telemetry, observability, dashboards', <><Link href="/status/">Live telemetry</Link>: real in-process counters and latency percentiles per service, an event log of every agent decision, polled live — not a mockup</>],
    ['Cloud infrastructure, IaC, CI/CD', 'Runs on GCP (Cloud Run + GKE + a GCE VM for a separate coding-agent project), provisioned entirely by Terraform and deployed by Cloud Build on every push to main — no infrastructure change is ever applied from a laptop, only from the CI pipeline'],
    ['Reliability, performance, cost efficiency', <>Model size and architecture chosen for the hardware, not the other way around: the 0.5B LLM currently runs CPU-only on a single Spot node while a GCP GPU-quota request is pending, rather than blocking the whole migration on Google&apos;s approval turnaround; classical TF-IDF+LogReg was picked over a neural net for genre classification after it won on accuracy and cost; Cloud Armor throttle rules replace what used to be nginx <code className="bg-surface-secondary px-1 rounded">limit_req</code> zones, at the same effective thresholds</>],
    ['Evangelize effective practices', <>Shipping the simpler model after a fair comparison, instead of defaulting to deep learning — see the honest writeup on <Link href="/genre-classifier/">/genre-classifier</Link></>],
    ['Security controls, operational safeguards', 'TLS via a Google-managed certificate at the edge, every Cloud Run service ingress-locked to load-balancer-only traffic (no direct public *.run.app access), one least-privilege IAM identity per service rather than a shared one, service-to-service calls authenticated with a Google-minted ID token instead of network-path trust, Cloud Armor rate limits per endpoint class'],
    ['Latency-critical / on-device inference', <><Link href="/pose-tracker/">On-device pose estimation</Link>: a ResNet18-shaped CNN trained from scratch on COCO keypoints (no pretrained backbone), exported to ONNX and run entirely in the browser via WebAssembly (SIMD, single-threaded) &mdash; zero network round-trip per frame, and the only demo here with no backend compute cost at all; its ~60MB of model/runtime assets are served straight from a Cloud Storage bucket + CDN, not through any app service</>]
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
                    Six small, real, running systems &mdash; five backend services on Google Cloud (Cloud Run and GKE),
                    plus one that runs entirely in your browser instead &mdash; built to demonstrate the production side
                    of ML/LLM/CV work: serving, evaluation, guardrails, observability, and on-device inference, across
                    both text and vision. All of it provisioned by Terraform and deployed by Cloud Build on every push
                    to <code className="bg-surface-secondary px-1 rounded">main</code> &mdash; no infrastructure change
                    is ever applied from a laptop.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                    {SECTIONS.map((s) => (
                        <div key={s.n} className="flex items-center gap-1 rounded-lg border border-border px-2 hover:bg-surface-secondary">
                            <Link href={s.href} className="flex flex-1 items-center gap-3 px-2 py-3 no-underline">
                                <span className="text-accent font-mono text-sm">{s.n}</span>
                                <span className="flex-1 font-medium text-foreground">{s.label}</span>
                                <span className="text-muted">&rarr;</span>
                            </Link>
                            <Link
                                href={s.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${s.label} source on GitHub`}
                                className="shrink-0 p-2 text-muted hover:text-foreground"
                            >
                                <BrandIcon icon={siGithub}/>
                            </Link>
                        </div>
                    ))}
                </div>

                <h2 className="text-xl font-bold mt-12 border-l-4 border-accent pl-3">System diagram</h2>
                <Card className="mt-4">
                    <Card.Content>
                        <div className="flex flex-col items-center gap-2 text-sm">
                            <DiagramBox title="Browser" sub="you"/>
                            <div className="text-xs text-muted">HTTPS</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-1">
                                <div className="flex flex-col items-center gap-2">
                                    <DiagramBox title="Global Load Balancer" sub="Cloud Armor · managed TLS cert" className="w-full"/>
                                    <div className="grid grid-cols-3 gap-2 w-full mt-1">
                                        <DiagramBox title="genre-classifier" sub="Cloud Run"/>
                                        <DiagramBox title="image-classifier" sub="Cloud Run"/>
                                        <DiagramBox title="agent-orchestrator" sub="Cloud Run"/>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <DiagramBox title="llm.bradjobe.dev" sub="same load balancer · standalone GKE NEG" className="w-full"/>
                                    <DiagramBox title="llama-server" sub="Qwen2.5-0.5B · CPU on a Spot VM (GKE)" className="w-full"/>
                                </div>
                            </div>
                            <p className="text-xs text-muted mt-2 text-center">
                                The LLM demo gets its own subdomain, but it&apos;s just another host rule on the same
                                load balancer, routed straight to the pod through a standalone GKE NEG — one load
                                balancer and one Cloud Armor policy for everything. agent-orchestrator calls
                                llama-server over that public subdomain and calls genre-classifier&apos;s private Cloud
                                Run URL from inside the VPC (Direct VPC egress), authenticated with a Google-minted ID
                                token; it does not yet call image-classifier. /status polls each service&apos;s own
                                /stats.
                                <br/>
                                <Link href="/pose-tracker/">On-device pose estimation</Link> isn&apos;t pictured here on
                                purpose — it has no backend at all, the model runs client-side in the visitor&apos;s
                                own browser (its large model/runtime files are served straight from a Cloud Storage
                                bucket + CDN behind the same load balancer, though).
                            </p>
                        </div>
                        <p className="mt-4 text-sm text-muted">
                            Every Cloud Run service: gets its own least-privilege runtime{' '}
                            <code className="bg-surface-secondary px-1 rounded">service account</code> (never shared
                            with another service), is ingress-locked to{' '}
                            <code className="bg-surface-secondary px-1 rounded">INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER</code>{' '}
                            (no direct <code className="bg-surface-secondary px-1 rounded">*.run.app</code> access — the
                            load balancer is the only public path in), and any service-to-service call is authenticated
                            with a Google-minted identity token scoped to exactly the calling service&apos;s account,
                            not just network-path trust. Same pattern repeated across every service rather than
                            one-off setups &mdash; the kind of consistency that matters once there&apos;s more than one
                            service to operate.
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
