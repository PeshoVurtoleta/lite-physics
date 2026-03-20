/**
 * @zakkster/lite-physics — Spring-Based DOM Animation
 *
 * The "Apple-like fluid physics" library. Provides spring-animated CSS
 * properties, magnetic hover cards, draggable cards with velocity handoff,
 * and Tinder-style swipe cards.
 *
 * Zero rAF spam: all springs share a single Ticker.
 * Zero external deps: composes lite-ui (Spring), lite-ticker, lite-pointer-tracker, lite-lerp.
 *
 * Depends on:
 *   @zakkster/lite-ui   (Spring class)
 *   lite-ticker          (shared RAF loop)
 *   lite-pointer-tracker (unified pointer input)
 *   @zakkster/lite-lerp  (clamp)
 */

import { Spring } from '@zakkster/lite-ui';
import { Ticker } from '@zakkster/lite-ticker';
import { PointerTracker } from 'lite-pointer-tracker';
import { clamp } from '@zakkster/lite-lerp';


// ─────────────────────────────────────────────────────────
//  SHARED TICKER (ref-counted, same pattern as lite-timeline)
// ─────────────────────────────────────────────────────────

let _sharedTicker = null;
let _sharedRefs = 0;

function acquireTicker() {
    if (!_sharedTicker) {
        _sharedTicker = new Ticker();
        _sharedTicker.start();
    }
    _sharedRefs++;
    return _sharedTicker;
}

function releaseTicker() {
    _sharedRefs--;
    if (_sharedRefs <= 0 && _sharedTicker) {
        _sharedTicker.destroy();
        _sharedTicker = null;
        _sharedRefs = 0;
    }
}


// ─────────────────────────────────────────────────────────
//  VELOCITY TRACKER
//  Computes drag deltas and release velocity from raw
//  PointerEvents. Stores last 5 positions over 80ms.
//  PointerTracker gives us raw events — we do the math.
// ─────────────────────────────────────────────────────────

function createVelocityTracker() {
    let startX = 0, startY = 0;
    let lastX = 0, lastY = 0;
    const history = [];       // { x, y, time } — last 5 samples
    const MAX_HISTORY = 5;
    const MAX_AGE = 80;       // ms — only use recent samples

    return {
        start(e) {
            startX = e.clientX;
            startY = e.clientY;
            lastX = startX;
            lastY = startY;
            history.length = 0;
            history.push({ x: startX, y: startY, time: performance.now() });
        },

        move(e) {
            lastX = e.clientX;
            lastY = e.clientY;
            history.push({ x: lastX, y: lastY, time: performance.now() });
            if (history.length > MAX_HISTORY) history.shift();
        },

        /** Drag distance from start point. */
        get dragX() { return lastX - startX; },
        get dragY() { return lastY - startY; },

        /** Release velocity in px/s, computed from recent position history. */
        computeVelocity() {
            const now = performance.now();
            // Find the oldest sample within MAX_AGE
            let oldest = null;
            for (let i = 0; i < history.length; i++) {
                if (now - history[i].time < MAX_AGE) {
                    oldest = history[i];
                    break;
                }
            }
            if (!oldest || history.length < 2) return { vx: 0, vy: 0 };

            const newest = history[history.length - 1];
            const dt = (newest.time - oldest.time) / 1000; // seconds
            if (dt < 0.001) return { vx: 0, vy: 0 };

            return {
                vx: (newest.x - oldest.x) / dt,
                vy: (newest.y - oldest.y) / dt,
            };
        },
    };
}


// ─────────────────────────────────────────────────────────
//  DOM HELPERS
// ─────────────────────────────────────────────────────────

function resolveEl(selectorOrEl, name) {
    if (!selectorOrEl) return null;
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) console.warn(`@zakkster/lite-physics [${name}]: element not found`);
    return el;
}

const NOOP = Object.freeze({ set() {}, snap() {}, destroy() {} });


// ═══════════════════════════════════════════════════════════
//  springStyle — Animate a single CSS property with spring physics
// ═══════════════════════════════════════════════════════════

/**
 * Animate a CSS property with spring physics.
 *
 * @param {HTMLElement|string} element
 * @param {string} property  CSS property name (e.g. 'opacity', 'transform')
 * @param {Object} [options]
 * @param {number} [options.stiffness=170]
 * @param {number} [options.damping=26]
 * @param {number} [options.initialValue=0]
 * @param {number} [options.min=-Infinity]
 * @param {number} [options.max=Infinity]
 * @param {string} [options.unit='']   CSS unit suffix (e.g. 'px', 'deg', '%', '')
 * @param {Function} [options.template]  Custom template: (value) => CSS string.
 *                                        Overrides unit. E.g. v => `scale(${v})`
 */
export function springStyle(element, property, {
    stiffness = 170,
    damping = 26,
    initialValue = 0,
    min = -Infinity,
    max = Infinity,
    unit = '',
    template,
} = {}) {
    const el = resolveEl(element, 'springStyle');
    if (!el) return NOOP;

    const spring = new Spring(initialValue, { stiffness, damping });
    const ticker = acquireTicker();
    let isAnimating = false;
    let removeFn = null;

    const update = (dt) => {
        const val = clamp(spring.update(dt / 1000), min, max);

        if (template) {
            el.style[property] = template(val);
        } else {
            el.style[property] = unit ? `${val}${unit}` : val;
        }

        if (spring.settled) {
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
        }
    };

    function wake() {
        if (isAnimating) return;
        isAnimating = true;
        removeFn = ticker.add(update);
    }

    return {
        set(targetValue) {
            spring.set(targetValue);
            wake();
        },
        snap(value) {
            spring.snap(value);
            const clamped = clamp(value, min, max);
            el.style[property] = template ? template(clamped) : (unit ? `${clamped}${unit}` : clamped);
        },
        get value() { return spring.value; },
        get settled() { return spring.settled; },
        destroy() {
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
            releaseTicker();
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  springCard — 2D magnetic hover (Apple TV style)
// ═══════════════════════════════════════════════════════════

/**
 * Magnetic hover card. Element springs toward cursor position,
 * springs back to center on mouse leave.
 *
 * @param {HTMLElement|string} element
 * @param {Object} [options]
 * @param {number} [options.stiffness=220]
 * @param {number} [options.damping=24]
 * @param {number} [options.strength=0.2]  How much the element follows the cursor (0–1)
 */
export function springCard(element, {
    stiffness = 220,
    damping = 24,
    strength = 0.2,
} = {}) {
    const el = resolveEl(element, 'springCard');
    if (!el) return NOOP;

    const sx = new Spring(0, { stiffness, damping });
    const sy = new Spring(0, { stiffness, damping });
    const ticker = acquireTicker();
    let isAnimating = false;
    let removeFn = null;

    el.style.willChange = 'transform';

    const update = (dt) => {
        const dtSec = dt / 1000;
        const x = sx.update(dtSec);
        const y = sy.update(dtSec);

        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

        if (sx.settled && sy.settled) {
            el.style.transform = '';
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
        }
    };

    function wake() {
        if (isAnimating) return;
        isAnimating = true;
        removeFn = ticker.add(update);
    }

    const ac = new AbortController();
    const signal = ac.signal;

    el.addEventListener('mouseenter', () => wake(), { signal });
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        sx.set(dx * strength);
        sy.set(dy * strength);
        wake();
    }, { signal });
    el.addEventListener('mouseleave', () => {
        sx.set(0);
        sy.set(0);
    }, { signal });

    return {
        nudgeTo(x, y) { sx.set(x); sy.set(y); wake(); },
        snapTo(x, y) {
            sx.snap(x); sy.snap(y);
            el.style.transform = x === 0 && y === 0 ? '' : `translate3d(${x}px, ${y}px, 0)`;
        },
        destroy() {
            ac.abort();
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
            el.style.willChange = '';
            el.style.transform = '';
            releaseTicker();
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  draggableSpringCard — Drag with velocity handoff
//  The user drags 1:1. On release, their swipe momentum
//  is injected into the springs. The card overshoots and
//  bounces back naturally.
// ═══════════════════════════════════════════════════════════

/**
 * Draggable card with spring-based velocity handoff.
 *
 * @param {HTMLElement|string} element
 * @param {Object} [options]
 * @param {number} [options.stiffness=150]
 * @param {number} [options.damping=18]    Lower = bouncier on release
 * @param {number} [options.rotationFactor=0.05]  Rotation per pixel of X drag
 * @param {Function} [options.onRelease]   Called with { x, y, vx, vy } on release
 */
export function draggableSpringCard(element, {
    stiffness = 150,
    damping = 18,
    rotationFactor = 0.05,
    onRelease,
} = {}) {
    const el = resolveEl(element, 'draggableSpringCard');
    if (!el) return NOOP;

    const sx = new Spring(0, { stiffness, damping });
    const sy = new Spring(0, { stiffness, damping });
    const ticker = acquireTicker();
    const vel = createVelocityTracker();
    let isAnimating = false;
    let isDragging = false;
    let removeFn = null;

    el.style.willChange = 'transform';

    const render = (x, y) => {
        const rot = x * rotationFactor;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
    };

    const update = (dt) => {
        if (isDragging) return;
        const dtSec = dt / 1000;
        const x = sx.update(dtSec);
        const y = sy.update(dtSec);
        render(x, y);

        if (sx.settled && sy.settled) {
            el.style.transform = '';
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
        }
    };

    function wake() {
        if (isAnimating || isDragging) return;
        isAnimating = true;
        removeFn = ticker.add(update);
    }

    const tracker = new PointerTracker(el, {
        onStart(e) {
            isDragging = true;
            vel.start(e);
            // Pause spring animation, user has control
            if (removeFn) { removeFn(); removeFn = null; isAnimating = false; }
            el.classList.add('is-dragging');
        },
        onMove(e) {
            vel.move(e);
            // Move 1:1 with pointer
            render(vel.dragX, vel.dragY);
            // Keep springs synced so they don't jump on release
            sx.value = vel.dragX;
            sy.value = vel.dragY;
            sx.settled = false;
            sy.settled = false;
        },
        onEnd() {
            isDragging = false;
            el.classList.remove('is-dragging');

            // Velocity handoff: inject swipe momentum into springs
            const { vx, vy } = vel.computeVelocity();
            sx.velocity = vx;
            sy.velocity = vy;

            if (onRelease) onRelease({ x: vel.dragX, y: vel.dragY, vx, vy });

            // Spring back to center
            sx.set(0);
            sy.set(0);
            wake();
        },
    });

    return {
        destroy() {
            tracker.destroy();
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
            el.style.willChange = '';
            el.style.transform = '';
            el.classList.remove('is-dragging');
            releaseTicker();
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  swipeCard — Tinder-style swipe with velocity projection
//  If the user drags far enough OR flicks fast enough,
//  the card is thrown off-screen. Otherwise it snaps back.
// ═══════════════════════════════════════════════════════════

/**
 * Swipe-to-dismiss card with velocity projection.
 *
 * @param {HTMLElement|string} element
 * @param {Object} [options]
 * @param {number} [options.stiffness=150]
 * @param {number} [options.damping=20]
 * @param {number} [options.swipeThreshold=100]    Drag distance to commit (px)
 * @param {number} [options.velocityThreshold=500] Flick speed to commit (px/s)
 * @param {number} [options.escapeDistance=1500]    How far off-screen it flies
 * @param {number} [options.rotationFactor=0.08]   Rotation per pixel of X drag
 * @param {Function} [options.onSwipeLeft]  Called with element when swiped left
 * @param {Function} [options.onSwipeRight] Called with element when swiped right
 * @param {boolean}  [options.removeOnSwipe=true]  Remove element from DOM after swipe
 */
export function swipeCard(element, {
    stiffness = 150,
    damping = 20,
    swipeThreshold = 100,
    velocityThreshold = 500,
    escapeDistance = 1500,
    rotationFactor = 0.08,
    onSwipeLeft,
    onSwipeRight,
    removeOnSwipe = true,
} = {}) {
    const el = resolveEl(element, 'swipeCard');
    if (!el) return NOOP;

    const sx = new Spring(0, { stiffness, damping });
    const sy = new Spring(0, { stiffness, damping });
    const ticker = acquireTicker();
    const vel = createVelocityTracker();
    let isAnimating = false;
    let isDragging = false;
    let hasSwiped = false;
    let removeFn = null;

    el.style.willChange = 'transform, opacity';

    const render = (x, y) => {
        const rot = x * rotationFactor;
        const opacity = Math.max(0, 1 - Math.abs(x) / (swipeThreshold * 3));
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        el.style.opacity = opacity;
    };

    const update = (dt) => {
        if (isDragging) return;
        const dtSec = dt / 1000;
        const x = sx.update(dtSec);
        const y = sy.update(dtSec);
        render(x, y);

        if (sx.settled && sy.settled) {
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;

            if (hasSwiped && removeOnSwipe) {
                el.remove();
            } else if (!hasSwiped) {
                el.style.transform = '';
                el.style.opacity = '';
            }
        }
    };

    function wake() {
        if (isAnimating || isDragging) return;
        isAnimating = true;
        removeFn = ticker.add(update);
    }

    const tracker = new PointerTracker(el, {
        onStart(e) {
            if (hasSwiped) return;
            isDragging = true;
            vel.start(e);
            if (removeFn) { removeFn(); removeFn = null; isAnimating = false; }
            el.classList.add('is-dragging');
        },
        onMove(e) {
            if (hasSwiped) return;
            vel.move(e);
            render(vel.dragX, vel.dragY);
            sx.value = vel.dragX;
            sy.value = vel.dragY;
            sx.settled = false;
            sy.settled = false;
        },
        onEnd() {
            if (hasSwiped) return;
            isDragging = false;
            el.classList.remove('is-dragging');

            const x = vel.dragX;
            const y = vel.dragY;
            const { vx, vy } = vel.computeVelocity();

            sx.velocity = vx;
            sy.velocity = vy;

            // Decision: did they drag far enough OR flick fast enough?
            const isRight = x > swipeThreshold || vx > velocityThreshold;
            const isLeft  = x < -swipeThreshold || vx < -velocityThreshold;

            if (isRight) {
                hasSwiped = true;
                sx.set(escapeDistance);
                sy.set(y + vy * 0.2);
                if (onSwipeRight) onSwipeRight(el);
            } else if (isLeft) {
                hasSwiped = true;
                sx.set(-escapeDistance);
                sy.set(y + vy * 0.2);
                if (onSwipeLeft) onSwipeLeft(el);
            } else {
                // Not enough — snap back
                sx.set(0);
                sy.set(0);
            }

            wake();
        },
    });

    return {
        /** Whether the card has been swiped away. */
        get swiped() { return hasSwiped; },

        destroy() {
            tracker.destroy();
            if (removeFn) { removeFn(); removeFn = null; }
            isAnimating = false;
            el.style.willChange = '';
            el.style.transform = '';
            el.style.opacity = '';
            el.classList.remove('is-dragging');
            releaseTicker();
        },
    };
}
