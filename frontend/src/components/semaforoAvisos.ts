import { main } from '../../wailsjs/go/models';

const pesos = (v: number) => v > 0 ? '$' + Math.round(v).toLocaleString('es-MX') : '';

// Aviso al cambiar el estatus a Vendido o Baja, con lo que el semáforo sabe
// del animal. Devuelve null cuando no hay nada útil que decir.
export function avisoVentaBaja(estatus: string, s?: main.SemaforoAnimal): { texto: string; tono: 'alerta' | 'ok' } | null {
  if (!s || !estatus) return null;
  if (estatus === 'Vendido') {
    if (s.venta.color === 'rojo') {
      return { texto: `Buen momento: cumple peso y edad de venta (${s.peso_actual.toFixed(1)} kg${s.valor_estimado ? ', ~' + pesos(s.valor_estimado) : ''}).`, tono: 'ok' };
    }
    if (s.venta.color === 'amarillo' || s.venta.color === 'verde') {
      const extra = s.venta.peso_proyectado > s.peso_actual ? ` Esperando ~${s.venta.dias_estimados} días llegaría a ${s.venta.peso_proyectado.toFixed(1)} kg` : '';
      const dinero = s.valor_estimado && s.venta.peso_proyectado > s.peso_actual && s.peso_actual > 0
        ? ` (~${pesos(s.valor_estimado * (s.venta.peso_proyectado / s.peso_actual - 1))} más)` : '';
      return { texto: `Aún no alcanza la meta de venta: ${s.peso_actual.toFixed(1)} kg hoy.${extra ? extra + dinero + '.' : ''}`, tono: 'alerta' };
    }
    return null;
  }
  if (estatus === 'Baja') {
    if (s.riesgo.color === 'rojo') return { texto: `El semáforo ya lo marcaba en rojo: ${s.riesgo.motivo}.`, tono: 'ok' };
    if (s.color === 'verde') return { texto: `Este animal iba bien (${s.titulo}). Confirma que la baja es correcta antes de guardar.`, tono: 'alerta' };
    return null;
  }
  return null;
}
