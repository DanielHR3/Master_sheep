import React, { useRef } from 'react';
import { LogIn } from 'lucide-react';
import Hero from './sections/Hero';
import Tailored from './sections/Tailored';
import Features from './sections/Features';
import About from './sections/About';
import Steps from './sections/Steps';
import Contact, { ContactHandle } from './sections/Contact';
import { CONTACT_EMAIL } from './content';

interface LandingProps {
  onLoginClick: () => void;
}

// Página pública de ventas (spec docs/superpowers/specs/2026-09-11-landing-page-design.md).
const Landing: React.FC<LandingProps> = ({ onLoginClick }) => {
  const contactRef = useRef<ContactHandle>(null);
  const requestDemo = () => contactRef.current?.requestDemo();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="./" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-display text-lg font-black">
              Sheep<span className="text-emerald-400">Master</span>
            </span>
          </a>
          <nav className="flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white cursor-pointer"
            >
              <LogIn size={16} /> <span className="hidden sm:inline">Iniciar sesión</span>
            </button>
            <button
              onClick={requestDemo}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-400 cursor-pointer"
            >
              Agenda una demo
            </button>
          </nav>
        </div>
      </header>

      <Hero onDemo={requestDemo} />
      <Tailored />
      <Features />
      <About />
      <Steps />
      <Contact ref={contactRef} />

      <footer className="bg-slate-950 py-10 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm">
          <span className="font-display font-black text-white">SheepMaster</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
          <button onClick={onLoginClick} className="hover:text-white cursor-pointer">
            Iniciar sesión
          </button>
          <span>© {new Date().getFullYear()} SheepMaster</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
