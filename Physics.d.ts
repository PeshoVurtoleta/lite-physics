export interface SpringStyleInstance { set(target: number): void; snap(value: number): void; readonly value: number; readonly settled: boolean; destroy(): void; }
export function springStyle(element: HTMLElement | string, property: string, options?: { stiffness?: number; damping?: number; initialValue?: number; min?: number; max?: number; unit?: string; template?: (value: number) => string }): SpringStyleInstance;
export interface SpringCardInstance { nudgeTo(x: number, y: number): void; snapTo(x: number, y: number): void; destroy(): void; }
export function springCard(element: HTMLElement | string, options?: { stiffness?: number; damping?: number; strength?: number }): SpringCardInstance;
export interface DraggableCardInstance { destroy(): void; }
export function draggableSpringCard(element: HTMLElement | string, options?: { stiffness?: number; damping?: number; rotationFactor?: number; onRelease?: (info: { x: number; y: number; vx: number; vy: number }) => void }): DraggableCardInstance;
export interface SwipeCardInstance { readonly swiped: boolean; destroy(): void; }
export function swipeCard(element: HTMLElement | string, options?: { stiffness?: number; damping?: number; swipeThreshold?: number; velocityThreshold?: number; escapeDistance?: number; rotationFactor?: number; onSwipeLeft?: (el: HTMLElement) => void; onSwipeRight?: (el: HTMLElement) => void; removeOnSwipe?: boolean }): SwipeCardInstance;
