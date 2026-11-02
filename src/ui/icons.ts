/** Registro de iconos seleccionables para burbujas (lineales, Lucide). */
import {
  Activity, AlarmClock, Anchor, BadgeEuro, Banknote, BatteryLow, Bell, BookOpen, Brain, Briefcase, Bug, Building2, Calendar, Car,
  ChartLine, CircleCheck, CircleX, Clock, Cloud, Compass, Cpu, Database, Flag, Flame, Gauge, Gem, Gift, GraduationCap, Guitar,
  Hammer, Handshake, Heart, House, Hourglass, Key, Leaf, Lightbulb, Link, Lock, Mail, Map, Megaphone, MessagesSquare, Mic, Package,
  PhoneIncoming, PiggyBank, Puzzle, Radar, Rocket, RotateCcw, Scale, ScrollText, Search, Shield, ShieldAlert, ShieldCheck, ShoppingCart,
  Sparkles, Star, Store, Target, ThumbsUp, Timer, TrendingDown, TrendingUp, Trophy, Truck, User, UserCheck, Users, Wallet, Wrench, Zap,
  Filter, Split, Shuffle, Minimize2, PackageOpen, SlidersHorizontal, X, type LucideIcon,
} from 'lucide-react';

export const NODE_ICONS: Record<string, LucideIcon> = {
  Activity, AlarmClock, Anchor, BadgeEuro, Banknote, BatteryLow, Bell, BookOpen, Brain, Briefcase, Bug, Building2, Calendar, Car,
  ChartLine, CircleCheck, CircleX, Clock, Cloud, Compass, Cpu, Database, Flag, Flame, Gauge, Gem, Gift, GraduationCap, Guitar,
  Hammer, Handshake, Heart, House, Hourglass, Key, Leaf, Lightbulb, Link, Lock, Mail, Map, Megaphone, MessagesSquare, Mic, Package,
  PhoneIncoming, PiggyBank, Puzzle, Radar, Rocket, RotateCcw, Scale, ScrollText, Search, Shield, ShieldAlert, ShieldCheck, ShoppingCart,
  Sparkles, Star, Store, Target, ThumbsUp, Timer, TrendingDown, TrendingUp, Trophy, Truck, User, UserCheck, Users, Wallet, Wrench, Zap,
  Filter, Split, Shuffle, Minimize2, PackageOpen, SlidersHorizontal, X,
};

export function nodeIcon(name: string | null | undefined): LucideIcon | null {
  return name ? NODE_ICONS[name] ?? null : null;
}

export const NODE_COLORS = ['slate', 'blue', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'pink'] as const;
export const COLOR_LABEL: Record<string, string> = {
  slate: 'Grafito', blue: 'Azul', emerald: 'Verde', rose: 'Rojo suave', amber: 'Ámbar', violet: 'Violeta', cyan: 'Cian', pink: 'Rosa',
};
