import React from 'react';
import { PlayCircle, CalendarCheck } from 'lucide-react';
import HeroBanner from '../HeroBanner';
import { hero } from '../content';

interface Props {
  onDemo: () => void;
}

const Hero: React.FC<Props> = ({ onDemo }) => (
  <section className="relative overflow-hidden bg-slate-950 text-white">
    <HeroBanner />
    <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-28 md:grid-cols-2 md:items-center md:pt-36">
      <div>
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-400">{hero.eyebrow}</p>
        <h1 className="font-display text-4xl font-black leading-tight md:text-6xl">
          {hero.title} <span className="text-emerald-400">{hero.titleAccent}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-300">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onDemo}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 active:scale-95 cursor-pointer"
          >
            <CalendarCheck size={18} /> {hero.primary}
          </button>
          <a
            href="#funciones"
            className="flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-slate-200 transition hover:border-slate-500"
          >
            <PlayCircle size={18} /> {hero.secondary}
          </a>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-2 shadow-2xl shadow-black/50 backdrop-blur">
        <video className="w-full rounded-2xl" src="/landing/hero.mp4" poster="/landing/hero.jpg" autoPlay muted loop playsInline preload="metadata" />
        <p className="px-3 py-2 text-xs text-slate-400">{hero.caption}</p>
      </div>
    </div>
  </section>
);

export default Hero;
