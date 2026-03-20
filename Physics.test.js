import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

vi.mock('lite-ticker', () => {
    class T {
        constructor() {
            this._fns = [];
        }

        add(fn) {
            this._fns.push(fn);
            return () => {
                this._fns = this._fns.filter(f => f !== fn);
            };
        }

        start() {
        }

        destroy() {
        }

        tick(dt) {
            for (const fn of [...this._fns]) fn(dt);
        }
    }

    return {Ticker: T};
});
vi.mock('@zakkster/lite-ui', () => ({
    Spring: class {
        constructor(v = 0, o = {}) {
            this.value = v;
            this.target = v;
            this.velocity = 0;
            this.settled = true;
            this.stiffness = o.stiffness || 170;
            this.damping = o.damping || 26;
        }

        set(t) {
            this.target = t;
            this.settled = false;
        }

        update(dt) {
            this.value += (this.target - this.value) * 0.5;
            if (Math.abs(this.value - this.target) < 0.01) {
                this.value = this.target;
                this.velocity = 0;
                this.settled = true;
            }
            return this.value;
        }

        snap(v) {
            this.value = v;
            this.target = v;
            this.velocity = 0;
            this.settled = true;
        }
    },
}));
vi.mock('lite-pointer-tracker', () => ({
    PointerTracker: class {
        constructor(el, h) {
            this._h = h;
        }

        destroy() {
        }
    },
}));
vi.mock('@zakkster/lite-lerp', () => ({
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
}));

import {springStyle, springCard, draggableSpringCard, swipeCard} from './Physics.js';

describe('🏀 lite-physics', () => {

    beforeEach(() => {
        vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
    });
    afterEach(() => vi.restoreAllMocks());

    describe('springStyle()', () => {
        it('returns set, snap, destroy', () => {
            const el = document.createElement('div');
            const s = springStyle(el, 'opacity', {initialValue: 0});
            expect(s.set).toBeTypeOf('function');
            expect(s.snap).toBeTypeOf('function');
            expect(s.destroy).toBeTypeOf('function');
            s.destroy();
        });

        it('snap() sets style immediately', () => {
            const el = document.createElement('div');
            const s = springStyle(el, 'opacity', {initialValue: 0});
            s.snap(0.5);
            expect(el.style.opacity).toBe('0.5');
            s.destroy();
        });

        it('snap() with unit appends suffix', () => {
            const el = document.createElement('div');
            const s = springStyle(el, 'width', {initialValue: 0, unit: 'px'});
            s.snap(100);
            expect(el.style.width).toBe('100px');
            s.destroy();
        });

        it('snap() with template uses custom format', () => {
            const el = document.createElement('div');
            const s = springStyle(el, 'transform', {initialValue: 1, template: v => `scale(${v})`});
            s.snap(1.5);
            expect(el.style.transform).toBe('scale(1.5)');
            s.destroy();
        });

        it('returns noop on null element', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
            });
            const s = springStyle(null, 'opacity');
            expect(s.destroy).toBeTypeOf('function');
            s.destroy();
            spy.mockRestore();
        });
    });

    describe('springCard()', () => {
        it('returns nudgeTo, snapTo, destroy', () => {
            const el = document.createElement('div');
            const c = springCard(el);
            expect(c.nudgeTo).toBeTypeOf('function');
            expect(c.snapTo).toBeTypeOf('function');
            expect(c.destroy).toBeTypeOf('function');
            c.destroy();
        });

        it('snapTo() sets transform', () => {
            const el = document.createElement('div');
            const c = springCard(el);
            c.snapTo(10, 20);
            expect(el.style.transform).toContain('translate3d');
            c.destroy();
        });

        it('snapTo(0, 0) clears transform', () => {
            const el = document.createElement('div');
            const c = springCard(el);
            c.snapTo(0, 0);
            expect(el.style.transform).toBe('');
            c.destroy();
        });

        it('destroy() cleans up styles', () => {
            const el = document.createElement('div');
            const c = springCard(el);
            c.snapTo(10, 10);
            c.destroy();
            expect(el.style.willChange).toBe('');
            expect(el.style.transform).toBe('');
        });

        it('returns noop on missing element', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
            });
            const c = springCard('.nonexistent');
            expect(c.destroy).toBeTypeOf('function');
            c.destroy();
            spy.mockRestore();
        });
    });

    describe('draggableSpringCard()', () => {
        it('returns destroy', () => {
            const el = document.createElement('div');
            const d = draggableSpringCard(el);
            expect(d.destroy).toBeTypeOf('function');
            d.destroy();
        });

        it('returns noop on null element', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
            });
            const d = draggableSpringCard(null);
            d.destroy();
            spy.mockRestore();
        });
    });

    describe('swipeCard()', () => {
        it('returns swiped getter and destroy', () => {
            const el = document.createElement('div');
            const s = swipeCard(el);
            expect(s.swiped).toBe(false);
            expect(s.destroy).toBeTypeOf('function');
            s.destroy();
        });

        it('returns noop on null element', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
            });
            const s = swipeCard(null);
            expect(s.destroy).toBeTypeOf('function');
            s.destroy();
            spy.mockRestore();
        });

        it('destroy() cleans up styles', () => {
            const el = document.createElement('div');
            const s = swipeCard(el);
            s.destroy();
            expect(el.style.willChange).toBe('');
            expect(el.style.opacity).toBe('');
        });
    });
});
