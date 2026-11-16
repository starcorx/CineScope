const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config/environment');

// Importar rutas
const movieRoutes = require('./routes/movieRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Exponer Bootstrap JS y Bootstrap Icons de forma estática
app.use('/vendor/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));

// Montar Rutas de la API REST
app.use('/api', movieRoutes);
app.use('/api', favoriteRoutes);
app.use('/api', watchlistRoutes);

// Manejo de rutas no encontradas de la API (404)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Redirigir cualquier otra petición frontend a index.html (SPA Fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no capturado en servidor:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Error interno del servidor CineScope'
  });
});

// Iniciar servidor
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🎬 CineScope Server ejecutándose en el puerto ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`🔑 Estado TMDB: ${config.isTmdbConfigured() ? 'Configurado ✅' : 'Pendiente clave API en .env ⚠️'}`);
  console.log(`=================================================`);
});

module.exports = { app, server };
