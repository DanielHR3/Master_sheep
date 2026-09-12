import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Send } from 'lucide-react';
import { SendContact, GetLandingConfig } from '../../services/api';
import { contact } from '../content';

export interface ContactHandle {
  requestDemo: () => void;
}

const inputClass =
  'mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

const emptyForm = { nombre: '', rancho: '', telefono: '', correo: '', mensaje: '', quiere_demo: false, horario_preferido: '', website: '' };

const Contact = React.forwardRef<ContactHandle>((_, ref) => {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const horarioRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    GetLandingConfig().then((c) => setBookingUrl(c.bookingUrl || ''));
  }, []);

  const requestDemo = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank', 'noopener');
      return;
    }
    setForm((f) => ({ ...f, quiere_demo: true }));
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => horarioRef.current?.focus(), 500);
  };

  React.useImperativeHandle(ref, () => ({ requestDemo }), [bookingUrl]);

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await SendContact(form);
      setStatus('ok');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'No se pudo enviar.');
    }
  };

  return (
    <section id="contacto" ref={sectionRef} className="bg-white py-20 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="font-display text-3xl font-black md:text-4xl">{contact.title}</h2>
          <p className="mt-3 text-slate-600">{contact.subtitle}</p>
          {status === 'ok' ? (
            <p className="mt-8 rounded-2xl bg-emerald-50 p-6 font-bold text-emerald-700">{contact.success}</p>
          ) : (
            <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Nombre
                <input required maxLength={120} className={inputClass} value={form.nombre} onChange={set('nombre')} />
              </label>
              <label className="text-sm font-bold">
                Rancho
                <input maxLength={120} className={inputClass} value={form.rancho} onChange={set('rancho')} />
              </label>
              <label className="text-sm font-bold">
                Teléfono
                <input type="tel" maxLength={30} className={inputClass} value={form.telefono} onChange={set('telefono')} />
              </label>
              <label className="text-sm font-bold">
                Correo
                <input type="email" maxLength={160} className={inputClass} value={form.correo} onChange={set('correo')} />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Mensaje
                <textarea maxLength={2000} rows={4} className={inputClass} value={form.mensaje} onChange={set('mensaje')} />
              </label>
              <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2">
                <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={form.quiere_demo} onChange={set('quiere_demo')} />
                Quiero una demo en vivo
              </label>
              {form.quiere_demo && (
                <label className="text-sm font-bold sm:col-span-2">
                  Fecha y horario que te acomoda
                  <input
                    ref={horarioRef}
                    maxLength={200}
                    placeholder="Ej. martes o jueves después de las 4 pm"
                    className={inputClass}
                    value={form.horario_preferido}
                    onChange={set('horario_preferido')}
                  />
                </label>
              )}
              {/* Campo trampa para bots: invisible y sin autocompletar */}
              <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={set('website')} />
              {status === 'error' && <p className="text-sm font-bold text-rose-600 sm:col-span-2">{error}</p>}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-emerald-400 disabled:opacity-60 sm:col-span-2 cursor-pointer"
              >
                <Send size={18} /> {status === 'sending' ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>
        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="font-display text-xl font-black">{contact.demoCard.title}</h3>
          <p className="mt-2 text-slate-600">{contact.demoCard.text}</p>
          <button
            onClick={requestDemo}
            className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-emerald-400 cursor-pointer"
          >
            <CalendarCheck size={18} /> {contact.demoCard.button}
          </button>
        </aside>
      </div>
    </section>
  );
});

Contact.displayName = 'Contact';

export default Contact;
