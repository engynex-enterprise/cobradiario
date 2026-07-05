// Datos y formateadores para Colombia (clientes / gota a gota).

/** Ciudades/municipios frecuentes. El combobox permite agregar cualquiera. */
export const CITIES: string[] = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga',
  'Pereira', 'Santa Marta', 'Ibagué', 'Manizales', 'Villavicencio', 'Pasto', 'Montería',
  'Neiva', 'Armenia', 'Popayán', 'Sincelejo', 'Valledupar', 'Tunja', 'Riohacha', 'Florencia',
  'Yopal', 'Quibdó', 'Mocoa', 'San Andrés', 'Leticia', 'Arauca', 'Soacha', 'Bello',
  'Itagüí', 'Envigado', 'Palmira', 'Buenaventura', 'Soledad', 'Floridablanca', 'Girón',
  'Piedecuesta', 'Dosquebradas', 'Tuluá', 'Barrancabermeja', 'Zipaquirá', 'Chía', 'Facatativá',
  'Fusagasugá', 'Girardot', 'Duitama', 'Sogamoso', 'Maicao', 'Magangué', 'Turbo', 'Apartadó',
  'Rionegro', 'Cartago', 'Buga', 'Jamundí', 'Malambo', 'Sabanalarga', 'Ipiales', 'Tumaco',
];

/** Parentesco / relación (fiadores y referencias). */
export const RELATIONSHIPS: string[] = [
  'Cónyuge', 'Esposo', 'Esposa', 'Padre', 'Madre', 'Hijo', 'Hija', 'Hermano', 'Hermana',
  'Abuelo', 'Abuela', 'Tío', 'Tía', 'Primo', 'Prima', 'Sobrino', 'Sobrina', 'Suegro', 'Suegra',
  'Cuñado', 'Cuñada', 'Yerno', 'Nuera', 'Amigo', 'Amiga', 'Vecino', 'Vecina',
  'Compañero de trabajo', 'Socio', 'Conocido', 'Otro',
];

/** Formatea un teléfono colombiano: dígitos agrupados "300 123 4567". */
export function formatPhoneCO(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
  return parts.join(' ');
}

/** Capitaliza cada palabra (nombres, ciudad, barrio, ocupación). */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s|\/|-)([a-záéíóúñ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Normaliza correo: minúsculas y sin espacios. */
export function normalizeEmail(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** Solo dígitos (documentos CC/CE); NIT puede llevar guion final que se respeta aparte. */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}
