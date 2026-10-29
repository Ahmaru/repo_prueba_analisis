const express = require('express');
const pool = require('../../db');
const asyncHandler = require('../utils/asyncHandler');
const { esEnteroPositivo } = require('../utils/validators');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.get('/:id', autenticar, autorizar('consumidor', 'privilegiado', 'administrador'), asyncHandler(async (req, res) => {
  if (!esEnteroPositivo(req.params.id)) {
    return res.status(400).json({ mensaje: 'El identificador del recurso no es válido.' });
  }

  const { rows } = await pool.query(
    `SELECT r.id, r.nombre, r.categoria, r.tipo, s.nombre AS sede,
            r.indicaciones, r.imagen, r.stock_total, r.materiales_asociados
     FROM recursos r
     JOIN sedes s ON s.id = r.sede_id
     WHERE r.id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ mensaje: 'El recurso solicitado no existe.' });
  }

  const recurso = rows[0];

  return res.json({
    id: recurso.id,
    nombre: recurso.nombre,
    categoria: recurso.categoria,
    tipo: recurso.tipo,
    sede: recurso.sede,
    indicaciones: recurso.indicaciones,
    imagen: recurso.imagen,
    stockTotal: recurso.stock_total,
    materialesAsociados: recurso.materiales_asociados || []
  });
}));

module.exports = router;
