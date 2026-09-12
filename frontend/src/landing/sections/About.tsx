import React from 'react';
import { about } from '../content';

const About: React.FC = () => (
  <section className="bg-slate-950 py-20 text-white">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{about.title}</h2>
      <p className="mt-2 text-sm font-bold uppercase tracking-widest text-cyan-400">{about.line}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {about.blocks.map((b) => (
          <div key={b.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="font-display text-xl font-black text-emerald-400">{b.title}</h3>
            <p className="mt-3 text-slate-300">{b.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {about.values.map((v) => (
          <div key={v.title} className="rounded-2xl border border-slate-800 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Valor</p>
            <h4 className="mt-1 font-display text-lg font-black">{v.title}</h4>
            <p className="mt-2 text-sm text-slate-300">{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default About;
