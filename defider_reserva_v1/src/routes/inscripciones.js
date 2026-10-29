const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/auth');
const { crearReserva } = require('../services/reservasService');

const router = express.Router();

router.post('/', autenticar, autorizar('administrador'), asyncHandler(async (req, res) => {
  const reserva = await crearReserva({
    usuario: req.usuario,
    recursoId: req.body.recursoId,
    fecha: req.body.fecha,
    bloqueId: req.body.bloqueId,
    cantidad: req.body.cantidad ?? 1,
    uso: req.body.uso || 'Inscripción calendarizada especial',
    tipo: 'calendarizada'
  });

  return res.status(201).json(reserva);
}));

module.exports = router;
