const express = require('express');

const sesiones = require('./sesiones');
const catalogo = require('./catalogo');
const disponibilidad = require('./disponibilidad');
const recursos = require('./recursos');
const reservas = require('./reservas');
const inscripciones = require('./inscripciones');

const router = express.Router();

router.use('/sesiones', sesiones);
router.use('/catalogo', catalogo);
router.use('/disponibilidad', disponibilidad);
router.use('/recursos', recursos);
router.use('/reservas', reservas);
router.use('/inscripciones-calendarizadas', inscripciones);

module.exports = router;
