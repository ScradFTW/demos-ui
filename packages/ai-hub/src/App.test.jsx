import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import App, {SECTIONS} from './App';

// This file churns a lot (project rows get added/reworded/reordered), and
// nothing here is type-checked — a missing field or a typo'd URL wouldn't
// break the build, it would just silently render a dead/blank link. These
// tests exist to catch exactly that.
describe('SECTIONS', () => {
    it('is a non-empty array', () => {
        expect(Array.isArray(SECTIONS)).toBe(true);
        expect(SECTIONS.length).toBeGreaterThan(0);
    });

    it('has n, href, label and github as non-empty strings on every entry', () => {
        for (const section of SECTIONS) {
            for (const field of ['n', 'href', 'label', 'github']) {
                expect(section, JSON.stringify(section)).toHaveProperty(field);
                expect(typeof section[field], `${field} on ${JSON.stringify(section)}`).toBe('string');
                expect(section[field].trim().length, `${field} on ${JSON.stringify(section)}`).toBeGreaterThan(0);
            }
        }
    });

    it('has a site-relative href that looks like a real path', () => {
        for (const section of SECTIONS) {
            expect(section.href, section.href).toMatch(/^\/[a-z0-9-]+\/$/);
        }
    });

    it('has a github URL that actually points at github.com', () => {
        for (const section of SECTIONS) {
            expect(() => new URL(section.github)).not.toThrow();
            const url = new URL(section.github);
            expect(url.protocol).toBe('https:');
            expect(url.hostname).toBe('github.com');
        }
    });

    it('has unique n values and unique hrefs', () => {
        const ns = SECTIONS.map((s) => s.n);
        const hrefs = SECTIONS.map((s) => s.href);
        expect(new Set(ns).size).toBe(ns.length);
        expect(new Set(hrefs).size).toBe(hrefs.length);
    });
});

describe('App', () => {
    it('renders without crashing and shows the page heading', () => {
        render(<App/>);
        expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Self-hosted ML infrastructure');
    });

    it('renders one row per SECTIONS entry, linking both its href and its github URL', () => {
        render(<App/>);
        const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
        for (const section of SECTIONS) {
            expect(hrefs, `expected ${section.href} among rendered links`).toContain(section.href);
            expect(hrefs, `expected ${section.github} among rendered links`).toContain(section.github);
        }
    });
});
