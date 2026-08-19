/**
 * Convierte un número a su representación en letras en español (pesos colombianos).
 * Reemplaza el control NumLetras.ocx de VB6.
 */

const UNIDADES = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
];

const DECENAS = [
  '',
  '',
  'VEINTI',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertirMiles(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  if (n < 21) return UNIDADES[n];
  if (n < 100) {
    const dec = Math.floor(n / 10);
    const uni = n % 10;
    if (dec === 2 && uni > 0) return `VEINTI${UNIDADES[uni]}`;
    return uni === 0 ? DECENAS[dec] : `${DECENAS[dec]} Y ${UNIDADES[uni]}`;
  }
  const cen = Math.floor(n / 100);
  const resto = n % 100;
  return resto === 0 ? CENTENAS[cen] : `${CENTENAS[cen]} ${convertirMiles(resto)}`;
}

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return convertirMiles(n);
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const prefijo = miles === 1 ? 'MIL' : `${convertirMiles(miles)} MIL`;
  return resto === 0 ? prefijo : `${prefijo} ${convertirMiles(resto)}`;
}

export function numeroALetras(valor: number): string {
  if (valor === 0) return 'CERO PESOS M/CTE';

  const entero = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - entero) * 100);

  let resultado = '';

  if (entero >= 1_000_000_000) {
    const miles = Math.floor(entero / 1_000_000_000);
    const resto = entero % 1_000_000_000;
    resultado += `${convertirGrupo(miles)} ${miles === 1 ? 'MIL MILLÓN' : 'MIL MILLONES'}`;
    if (resto > 0) resultado += ` ${convertirGrupo(resto)}`;
  } else if (entero >= 1_000_000) {
    const millones = Math.floor(entero / 1_000_000);
    const resto = entero % 1_000_000;
    resultado += `${convertirGrupo(millones)} ${millones === 1 ? 'MILLÓN' : 'MILLONES'}`;
    if (resto > 0) resultado += ` ${convertirGrupo(resto)}`;
  } else {
    resultado = convertirGrupo(entero);
  }

  resultado = resultado.trim();

  if (centavos > 0) {
    resultado += ` CON ${convertirMiles(centavos)}/100`;
  }

  resultado += ' PESOS M/CTE';

  return valor < 0 ? `MENOS ${resultado}` : resultado;
}
