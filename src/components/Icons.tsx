/** Original stroke icons (no game art). Decorative unless a label is given. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { label?: string; size?: number };

function Svg({ label, size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true} {...rest}>
      {children}
    </svg>
  );
}

export const Crest = (p: P) => (
  <Svg {...p} viewBox="0 0 52 52">
    <path d="M26 3 46 12v14c0 12-9 20-20 23C15 46 6 38 6 26V12Z" fill="#2a1f12" stroke="#e0b85c" strokeWidth={2} />
    <path d="M26 9 40 15v11c0 9-6 15-14 18-8-3-14-9-14-18V15Z" stroke="#8a6a2f" strokeWidth={2} />
    <path d="M26 16v20M19 23l7-7 7 7" stroke="#e0b85c" strokeWidth={2.4} />
  </Svg>
);
export const Compass = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>;
export const Castle = (p: P) => <Svg {...p}><path d="M4 21V9l2-2 2 2v3h2V6l2-2 2 2v6h2V9l2-2 2 2v12z" /><path d="M10 21v-4a2 2 0 0 1 4 0v4" /></Svg>;
export const Shield = (p: P) => <Svg {...p}><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Svg>;
export const Scroll = (p: P) => <Svg {...p}><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z" /><path d="M6 4a2 2 0 0 0-2 2v2h2M9 9h7M9 13h7" /></Svg>;
export const Hammer = (p: P) => <Svg {...p}><path d="m14 6 4 4M3 21l9-9M12 4l6 6-3 3-6-6z" /></Svg>;
export const Paw = (p: P) => <Svg {...p}><circle cx="7" cy="10" r="1.6" /><circle cx="10.5" cy="6.5" r="1.6" /><circle cx="14.5" cy="6.5" r="1.6" /><circle cx="18" cy="10" r="1.6" /><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 2-4 2s-4 0-4-2z" /></Svg>;
export const Book = (p: P) => <Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></Svg>;
export const Bow = (p: P) => <Svg {...p}><path d="M6 3c9 4 9 14 0 18" /><path d="M6 3v18" strokeWidth={1} /><path d="M3 12h16M16 9l3 3-3 3" /></Svg>;
export const Pick = (p: P) => <Svg {...p}><path d="M4 8c4-4 12-4 16 0M12 6v15" /></Svg>;
export const Gear = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></Svg>;
export const Star = (p: P) => <Svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></Svg>;
export const Chevron = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const External = (p: P) => <Svg {...p} size={p.size ?? 14}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></Svg>;
export const Horse = (p: P) => <Svg {...p}><path d="M5 20v-6l3-5 2-5 2 3h3l3 3-2 2-3-1-1 3v6M9 20v-4" /></Svg>;

export const KIND_ICON = {
  spell: Star, armor: Shield, weapon: Bow, talent: Book, pet: Paw, mount: Horse,
  profession: Hammer, system: Compass, quest: Scroll, dungeon: Castle, raid: Castle,
} as const;
