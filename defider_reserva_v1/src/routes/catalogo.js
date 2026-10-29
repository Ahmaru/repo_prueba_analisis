const express = require('express');
const pool = require('../../db');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, autorizar('administrador'), asyncHandler(async (req, res) => {
  const [{ rows: recursos }, { rows: bloques }] = await Promise.all([
    pool.query(
      `SELECT r.id, r.nombre, r.categoria, r.tipo, s.nombre AS sede, r.stock_total
       FROM recursos r
       JOIN sedes s ON s.id = r.sede_id
       ORDER BY s.nombre, r.nombre`
    ),
    pool.query(
      `SELECT id, codigo, TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
              TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
       FROM bloques
       ORDER BY hora_inicio`
    )
  ]);

  return res.json({
    recursos: recursos.map((recurso) => ({
      id: recurso.id,
      nombre: recurso.nombre,
      categoria: recurso.categoria,
      tipo: recurso.tipo,
      sede: recurso.sede,
      stockTotal: recurso.stock_total
    })),
    bloques
  });
}));

module.exports = router;
