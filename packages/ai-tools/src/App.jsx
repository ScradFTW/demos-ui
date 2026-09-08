import React, {useEffect, useRef} from 'react';
import {Link} from '@heroui/react';

import LlmTesting from './tabs/LlmTesting';
import GenreClassifier from './tabs/GenreClassifier';
import AgentDemo from './tabs/AgentDemo';
import ImageClassifier from './tabs/ImageClassifier';
import Status from './tabs/Status';

// This one app is deployed as-is to five different nginx alias paths, so
// each of the original homepage links keeps working. All five tools live
// on this one page as scrollable sections; landing on any of the five
// paths just scrolls straight to that section, and the nav links (plus
// each tool's own in-page mentions of the others) do the same.
const SECTIONS = [
    {id: 'llm', label: 'LLM Serving', path: '/llm-testing/', Component: LlmTesting},
    {id: 'genre', label: 'Classifier', path: '/genre-classifier/', Component: GenreClassifier},
    {id: 'agent', label: 'Agent', path: '/agent-demo/', Component: AgentDemo},
    {id: 'vision', label: 'Vision', path: '/image-classifier/', Component: ImageClassifier},
    {id: 'status', label: 'Telemetry', path: '/status/', Component: Status}
];

function sectionForPath(pathname) {
    const match = SECTIONS.find((s) => pathname.startsWith(s.path));
    return match ? match.id : null;
}

export default function App() {
    const refs = useRef({});

    useEffect(() => {
        const id = sectionForPath(window.location.pathname);
        if (id && refs.current[id]) {
            refs.current[id].scrollIntoView({block: 'start'});
        }
    }, []);

    function goTo(id) {
        const section = SECTIONS.find((s) => s.id === id);
        if (!section) return;
        refs.current[id]?.scrollIntoView({behavior: 'smooth', block: 'start'});
        window.history.replaceState(null, '', section.path);
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="sticky top-0 z-40 w-full border-b border-separator bg-background/80 backdrop-blur-lg">
                <div className="mx-auto max-w-3xl px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <Link href="/">bradjobe.dev</Link>
                    <span className="text-border">|</span>
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => goTo(s.id)}
                            className="text-sm font-medium text-foreground hover:text-accent"
                        >
                            {s.label}
                        </button>
                    ))}
                    <span className="text-border">|</span>
                    <Link href="/ai/">AI hub</Link>
                </div>
            </nav>

            <main className="mx-auto max-w-3xl px-6">
                {SECTIONS.map((s, i) => {
                    const {Component} = s;
                    return (
                        <section
                            key={s.id}
                            id={s.id}
                            ref={(el) => { refs.current[s.id] = el; }}
                            className={'scroll-mt-16 py-10' + (i > 0 ? ' border-t border-separator' : '')}
                        >
                            <Component onNavigate={goTo}/>
                        </section>
                    );
                })}
            </main>
        </div>
    );
}
