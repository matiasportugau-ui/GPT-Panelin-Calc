'use strict';

const express = require('express');
const cors = require('cors');
const router = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Rutas
app.use('/', router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada.' });
});

// Error handler global
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Calculadora BMC API corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
