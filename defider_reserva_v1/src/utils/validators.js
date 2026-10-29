function esEnteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
}

function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaObjeto = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fechaObjeto.getUTCFullYear() === anio &&
    fechaObjeto.getUTCMonth() === mes - 1 &&
    fechaObjeto.getUTCDate() === dia
  );
}

function fechaHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

module.exports = {
  esEnteroPositivo,
  esFechaValida,
  fechaHoy
};
