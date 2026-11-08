/**
 * Iconos de un solo trazo, color lápiz oscuro. Los textos de la app llevan un
 * emoji como «palabra clave» (🪨 = piedra, 🌱 = inicio…) y aquí se dibujan como
 * icono de línea. Así todo se ve igual, limpio, en claro y en oscuro.
 */
import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpFromLine, Ban, BicepsFlexed, BookOpen, Bookmark, Box, Brush,
  CalendarDays, ChartColumn, ChevronsDown, CircleCheck, CircleHelp, ClipboardList, Compass, Construction, Dices, Droplet, Eye, EyeOff,
  Filter, Flag, FlaskConical, Flashlight, FolderKanban, Footprints, Frown, Gift, Globe, Grid3x3, Hand, Handshake, Hash, Heart, HeartPulse,
  Hourglass, Inbox, LayoutGrid, Lightbulb, Link2, Lock, Map, Meh, MessageCircle, MessageSquare, Minus, Moon, Mountain, Orbit, Palette, Paperclip,
  PartyPopper, PenLine, PiggyBank, Plug, Plus, Puzzle, RefreshCw, Repeat, Ruler, Scale, ScanSearch, Search, Settings2, Shapes, SlidersHorizontal,
  Smile, Snail, Sparkles, Split, Sprout, Star, StickyNote, Tag, Target, ThumbsUp, Timer, Trash2, TrendingDown, TrendingUp, TriangleAlert, Truck,
  Type, User, Users, Utensils, Volume2, VolumeX, Waves, Wrench, X, Zap, Bandage, Sigma, Brain, Thermometer,
} from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const MAP: Record<string, LucideIcon> = {
  '🌱': Sprout, '🎯': Target, '💡': Lightbulb, '👣': Footprints, '🪨': Mountain, '⛰': Mountain, '🤝': Handshake, '💛': Heart, '❤': HeartPulse,
  '❓': CircleHelp, '📝': StickyNote, '🔤': Type, '💬': MessageSquare, '💭': MessageCircle, '📦': Box, '🗺': Map, '✨': Sparkles, '🍽': Utensils,
  '🧺': Filter, '🔄': RefreshCw, '✖': X, '💧': Droplet, '⚡': Zap, '🚧': Construction, '↪': Split, '🐷': PiggyBank, '🎁': Gift, '🩹': Bandage,
  '👀': Eye, '🎛': SlidersHorizontal, '✏': PenLine, '⚙': Settings2, '💪': BicepsFlexed, '⏰': AlarmClock, '🔀': Split, '🔗': Link2, '🧩': Puzzle,
  '🤔': CircleHelp, '🤷': CircleHelp, '🎨': Palette, '📎': Paperclip, '🧰': Wrench, '🔇': VolumeX, '🔊': Volume2, '🗑': Trash2, '🔦': Flashlight,
  '🔍': Search, '🔎': ScanSearch, '📥': ArrowDownToLine, '📤': ArrowUpFromLine, '⏳': Hourglass, '💤': Moon, '🌡': Thermometer, '👉': ArrowRight,
  '➕': Plus, '⭐': Star, '✅': CircleCheck, '🎉': PartyPopper, '😟': Frown, '😣': Frown, '😵': Frown, '😀': Smile, '🙂': Smile, '😌': Smile,
  '😐': Meh, '🙋': User, '🌍': Globe, '🕳': TrendingDown, '📏': Ruler, '⏱': Timer, '🔁': Repeat, '👥': Users, '📐': LayoutGrid,
  '🗂': FolderKanban, '🔒': Lock, '🙈': EyeOff, '🔌': Plug, '🏷': Tag, '🔖': Bookmark, '🧪': FlaskConical, '🔻': ChevronsDown, '⛔': Ban,
  '📬': Inbox, '🚚': Truck, '➡': ArrowRight, '↔': ArrowLeftRight, '🔷': Shapes, '🎲': Dices, '🌀': Orbit, '🔢': Hash, '🗓': CalendarDays,
  '🏁': Flag, '📋': ClipboardList, '⚠': TriangleAlert, '🤏': Minus, '👍': ThumbsUp, '📈': TrendingUp, '📊': ChartColumn, '⚖': Scale,
  '🧭': Compass, '🧹': Brush, '🐍': Waves, '🐌': Snail, '✋': Hand, '📖': BookOpen, '▦': Grid3x3, '∑': Sigma, '🧠': Brain,
};

const norm = (e: string) => e.replace(/️/g, '');
const SEQ = /(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)/gu;

export const hasIcon = (e: string) => !!MAP[norm(e)];

/** Un icono de línea a partir de su emoji. Si no lo conozco, dejo el texto tal cual. */
export function Ico({ e, size = 16, className, title }: { e: string; size?: number; className?: string; title?: string }) {
  const I = MAP[norm(e)];
  if (!I) return <span className={className} aria-hidden>{e}</span>;
  return <I aria-hidden={title ? undefined : true} aria-label={title} className={cx('mdf-ico inline-block shrink-0', className)} style={{ width: size, height: size }} strokeWidth={1.6} />;
}

/** Un texto con emojis, dibujado con iconos de línea. */
export function IcoText({ text, size = 15 }: { text: string; size?: number }) {
  if (!SEQ.test(text)) return <>{text}</>;
  SEQ.lastIndex = 0;
  const parts = text.split(SEQ);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 1) return MAP[norm(p)] ? <Ico key={i} e={p} size={size} className="mr-1 align-[-0.2em]" /> : <span key={i}>{p}</span>;
        // el espacio que iba tras el emoji ya lo pone el margen del icono
        return p ? <span key={i}>{i > 0 && MAP[norm(parts[i - 1])] ? p.replace(/^\s/, '') : p}</span> : null;
      })}
    </>
  );
}

/** Quita los emojis (para los desplegables del sistema, que no pueden dibujar iconos). */
export const stripEmoji = (t: string) => t.replace(SEQ, '').replace(/\s{2,}/g, ' ').trim();

/** Cambia los emojis de los textos sueltos de unos hijos de React por iconos de línea. */
export function icoChildren(children: ReactNode, size = 15): ReactNode {
  if (typeof children === 'string') return <IcoText text={children} size={size} />;
  if (Array.isArray(children)) return Children.map(children, (c) => (typeof c === 'string' ? <IcoText text={c} size={size} /> : c));
  if (isValidElement(children) && (children as ReactElement<{ children?: ReactNode }>).type === 'span' && typeof (children as ReactElement<{ children?: ReactNode }>).props.children === 'string') {
    const el = children as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, {}, <IcoText text={el.props.children as string} size={size} />);
  }
  return children;
}
