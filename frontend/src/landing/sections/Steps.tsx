import React from 'react';
import { steps } from '../content';

const Steps: React.FC = () => (
  <section className="bg-slate-50 py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{steps.title}</h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.items.map((s) => (
          <li key={s.n} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-display text-lg font-black text-white">{s.n}</span>
            <h3 className="mt-4 font-display text-xl font-black">{s.title}</h3>
            <p className="mt-2 text-slate-600">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default Steps;
