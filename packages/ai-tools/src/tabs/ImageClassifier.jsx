import React, {useRef, useState} from 'react';
import {Button, Card} from '@heroui/react';

const API_URL = '/image-classifier/api/predict';
const MAX_BYTES = 3 * 1024 * 1024;

const DETAILS = [
    ['Task', '10-class image classification (CIFAR-10: airplane, automobile, bird, cat, deer, dog, frog, horse, ship, truck), 32×32 RGB input'],
    ['Model', 'A small custom CNN (3 conv blocks + 2 FC layers, ~1M params), trained from scratch for 15 epochs with data augmentation'],
    ['Result', '80.6% test accuracy vs. a 10% majority-class baseline (full per-class report + confusion matrix in the repo)'],
    ['Train vs. serve split', 'Trained with PyTorch on a GPU (workstation, not this Cloud Run container), then exported to ONNX and verified to produce byte-identical predictions before deploying — this container runs ONNX Runtime only, ~50MB memory, no GPU and no PyTorch needed for inference'],
    ['Out-of-distribution behavior', "Upload something that isn't one of the 10 classes (a face, a landscape) and watch the confidence scores — it doesn't confidently misclassify, the top score usually drops well below 50%"]
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

export default function ImageClassifier() {
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('Best results on the 10 CIFAR classes above — but try anything. Images are classified in-memory and not stored.');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const fileInputRef = useRef(null);

    async function classifyFile(file) {
        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('Image too large (max 3MB).');
            return;
        }

        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });

        setPreview(dataUrl);
        setError('');
        setBusy(true);
        setStatus('classifying…');
        const startedAt = performance.now();

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({image: dataUrl})
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

    function onDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) classifyFile(file);
    }

    return (
        <>
            <h1 className="text-3xl font-bold">Image classifier</h1>
            <p className="mt-2 text-muted">
                A small convolutional network, trained from scratch on CIFAR-10, exported to ONNX and served with
                ONNX Runtime &mdash; no PyTorch on this box at all. The computer-vision counterpart to the text
                classifier next door.
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
                <Card.Content>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        className={
                            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ' +
                            (dragOver ? 'border-accent bg-accent-soft' : 'border-border')
                        }
                    >
                        {preview
                            ? <img src={preview} alt="preview" className="max-h-48 rounded-lg object-contain"/>
                            : <>
                                <span className="text-3xl">📷</span>
                                <p className="text-sm text-muted">Drop an image here, or choose a file</p>
                            </>
                        }
                        <Button
                            variant="tertiary"
                            size="sm"
                            onPress={() => fileInputRef.current?.click()}
                        >
                            Browse
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { if (e.target.files[0]) classifyFile(e.target.files[0]); }}
                        />
                    </div>

                    <p className="mt-3 text-xs text-muted">{status}</p>

                    {error &&
                    <p className="mt-4 text-sm text-danger">{error}</p>
                    }

                    {result &&
                    <div className="mt-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold">{result.label}</span>
                            <span className="text-muted">{(result.confidence * 100).toFixed(1)}% confidence</span>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                            {result.scores.slice(0, 6).map((s) => <Bar key={s.label} label={s.label} probability={s.probability}/>)}
                        </div>
                    </div>
                    }
                </Card.Content>
            </Card>
        </>
    );
}
