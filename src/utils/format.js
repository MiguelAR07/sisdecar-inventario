// Formato de pesos colombianos, cantidades y fechas
export const money=n=>'$ '+Math.round(n).toLocaleString('es-CO');
export const nf=n=>Number(n).toLocaleString('es-CO');
export const fdate=iso=>{const [y,m,d]=iso.split('-');return d+'/'+m+'/'+y};
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
