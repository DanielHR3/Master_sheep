import React from 'react';
import { Check } from 'lucide-react';
import { tailored } from '../content';

const Tailored: React.FC = () => (
  <section className="bg-slate-50 py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{tailored.title}</h2>
      <p className="mt-3 max-w-2xl text-slate-600">{tailored.subtitle}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {tailored.cards.map((c) => (
          <article key={c.tag} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <img src={c.image} alt={`Pantalla de SheepMaster para ${c.tag}`} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
            <div className="p-6">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">{c.tag}</span>
              <p className="mt-3 text-sm font-semibold text-slate-500">{c.example}</p>
              <ul className="mt-4 space-y-2">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2 text-slate-700">
                    <Check size={18} className="mt-0.5 shrink-0 text-emerald-500" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Tailored;
