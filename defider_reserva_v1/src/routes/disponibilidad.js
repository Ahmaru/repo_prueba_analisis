const express = require('express');
const pool = require('../../db');
const asyncHandler = require('../utils/asyncHandler');
const { esFechaValida, fechaHoy } = require('../utils/validators');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, autorizar('consumidor', 'privilegiado', 'administrador'), asyncHandler(async (req, res) => {
  const fecha = req.query.fecha || fechaHoy();

  if (!esFechaValida(fecha)) {
    return res.status(400).json({ mensaje: 'La fecha debe tener formato AAAA-MM-DD y ser válida.' });
  }

  const condiciones = [];
  const valores = [fecha];

  if (req.query.sede) {
    valores.push(req.query.sede);
    condiciones.push(`s.nombre = $${valores.length}`);
  }

  if (req.query.categoria) {
    valores.push(req.query.categoria);
    condiciones.push(`r.categoria = $${valores.length}`);
  }

  if (req.query.tipo) {
    valores.push(req.query.tipo);
    condiciones.push(`r.tipo = $${valores.length}`);
  }

  if (req.query.bloque) {
    valores.push(req.query.bloque);
    condiciones.push(`b.codigo = $${valores.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT r.id,
            r.nombre,
            r.categoria,
            r.tipo,
            s.nombre AS sede,
            b.id AS bloque_id,
            b.codigo AS bloque,
            TO_CHAR(b.hora_inicio, 'HH24:MI') AS hora_inicio,
            TO_CHAR(b.hora_fin, 'HH24:MI') AS hora_fin,
            r.stock_total,
            COALESCE(SUM(CASE WHEN res.estado = 'confirmada' THEN res.cantidad ELSE 0 END), 0)::int AS reservado
     FROM recursos r
     JOIN sedes s ON s.id = r.sede_id
     CROSS JOIN bloques b
     LEFT JOIN reservas res
       ON res.recurso_id = r.id
      AND res.fecha = $1
      AND res.bloque_id = b.id
      AND res.estado = 'confirmada'
     ${where}
     GROUP BY r.id, r.nombre, r.categoria, r.tipo, s.nombre,
              b.id, b.codigo, b.hora_inicio, b.hora_fin, r.stock_total
     ORDER BY s.nombre, r.nombre, b.hora_inicio`,
    valores
  );

  const disponibles = rows
    .map((fila) => {
      const stockDisponible = fila.categoria === 'cancha'
        ? (fila.reservado === 0 ? 1 : 0)
        : Math.max(fila.stock_total - fila.reservado, 0);

      return {
        id: fila.id,
        nombre: fila.nombre,
        categoria: fila.categoria,
        tipo: fila.tipo,
        sede: fila.sede,
        fecha,
        bloqueId: fila.bloque_id,
        bloque: fila.bloque,
        horario: `${fila.hora_inicio} - ${fila.hora_fin}`,
        disponible: stockDisponible > 0,
        stockDisponible,
        stockTotal: fila.stock_total
      };
    })
    .filter((recurso) => recurso.disponible);

  return res.json(disponibles);
}));

module.exports = router;
