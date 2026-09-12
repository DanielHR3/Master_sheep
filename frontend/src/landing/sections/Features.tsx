import React from 'react';
import { features } from '../content';

const Features: React.FC = () => (
  <section id="funciones" className="bg-white py-20 text-slate-900">
    <div className="mx-auto max-w-6xl px-6">
      <h2 className="font-display text-3xl font-black md:text-4xl">{features.title}</h2>
      <div className="mt-12 space-y-16">
        {features.items.map((f, i) => (
          <div key={f.title} className="grid items-center gap-8 md:grid-cols-2">
            <div className={i % 2 ? 'md:order-2' : ''}>
              <h3 className="font-display text-2xl font-black">{f.title}</h3>
              <p className="mt-3 text-slate-600">{f.text}</p>
            </div>
            <div className={`overflow-hidden rounded-3xl border border-slate-200 shadow-lg ${i % 2 ? 'md:order-1' : ''}`}>
              {f.video ? (
                <video className="w-full" src={f.video} poster={f.poster} autoPlay muted loop playsInline preload="metadata" />
              ) : (
                <img src={f.image} alt={f.title} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
