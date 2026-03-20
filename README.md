# @zakkster/lite-physics

[![npm version](https://img.shields.io/npm/v/@zakkster/lite-physics.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/@zakkster/lite-physics)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@zakkster/lite-physics?style=for-the-badge)](https://bundlephobia.com/result?p=@zakkster/lite-physics)
[![npm downloads](https://img.shields.io/npm/dm/@zakkster/lite-physics?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-physics)
[![npm total downloads](https://img.shields.io/npm/dt/@zakkster/lite-physics?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-physics)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Spring-based DOM animation with velocity handoff. Magnetic hover, draggable cards, Tinder-style swipe.

**[→ Live Recipes Gallery Demo](https://cdpn.io/pen/debug/dPpzmbZ)**

**100 springs share 1 RAF loop. Zero rAF spam. Zero GC.**

## Why lite-physics?

| Feature | lite-physics | Framer Motion | React Spring | GSAP Draggable |
|---|---|---|---|---|
| **Shared Ticker** | **Yes (1 RAF for all)** | No | No | No |
| **Velocity handoff** | **Yes (measured)** | Approximate | No | No |
| **Swipe-to-dismiss** | **Yes (built-in)** | Manual | No | Manual |
| **Framework-free** | **Yes** | React only | React only | jQuery-era |
| **Spring physics** | **Yes** | Yes | Yes | No |
| **Zero-GC** | **Yes** | No | No | No |
| **Bundle size** | **< 3KB** | ~30KB | ~20KB | ~25KB |

## Installation

```bash
npm install @zakkster/lite-physics
```

## Quick Start

### Magnetic Hover Card

```javascript
import { springCard } from '@zakkster/lite-physics';

const card = springCard('.product-card', {
    stiffness: 220,
    damping: 24,
    strength: 0.2, // 20% follow cursor
});

// Later: card.destroy()
```

### Animate a CSS Property

```javascript
import { springStyle } from '@zakkster/lite-physics';

const opacity = springStyle('#modal', 'opacity', { stiffness: 200, damping: 30, initialValue: 0 });
const scale = springStyle('#modal', 'transform', { stiffness: 180, damping: 22, initialValue: 0.8, template: v => `scale(${v})` });

opacity.set(1);
scale.set(1);
```

### Draggable Card with Velocity Handoff

```javascript
import { draggableSpringCard } from '@zakkster/lite-physics';

const draggable = draggableSpringCard('.card', {
    stiffness: 150,
    damping: 18,
    rotationFactor: 0.05,
    onRelease: ({ vx, vy }) => console.log('Flick speed:', vx),
});
```

### Tinder-Style Swipe

```javascript
import { swipeCard } from '@zakkster/lite-physics';

const swipe = swipeCard('.dating-card', {
    swipeThreshold: 100,
    velocityThreshold: 500,
    onSwipeLeft: (el) => console.log('Nope'),
    onSwipeRight: (el) => console.log('Like!'),
    removeOnSwipe: true,
});
```

## Recipes

<details>
<summary><strong>Stack of Swipe Cards</strong></summary>

```javascript
const cards = document.querySelectorAll('.card');
cards.forEach((card, i) => {
    card.style.zIndex = cards.length - i;
    swipeCard(card, {
        onSwipeRight: () => handleLike(i),
        onSwipeLeft: () => handleDislike(i),
    });
});
```

</details>

<details>
<summary><strong>Spring-Animated Counter</strong></summary>

```javascript
const counter = springStyle('#price', 'textContent', {
    stiffness: 120, damping: 20, initialValue: 0,
    template: v => `$${Math.round(v)}`,
});
counter.set(99);
```

</details>

## API

| Export | Description |
|---|---|
| `springStyle(el, prop, options)` | Animate any CSS property with spring physics |
| `springCard(el, options)` | 2D magnetic hover (Apple TV style) |
| `draggableSpringCard(el, options)` | Drag with velocity handoff on release |
| `swipeCard(el, options)` | Tinder-style swipe-to-dismiss |

All return `{ destroy() }` for SPA cleanup.

## License

MIT
