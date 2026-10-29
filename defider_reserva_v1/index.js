const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/inscripcion-calendarizada', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inscripcion-calendarizada.html'));
});

app.get('/revisar-reservas', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'revisar-reservas.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    mensaje: error.message || 'Ocurrió un error inesperado.'
  });
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});
