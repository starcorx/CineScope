const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

// Estado del servicio
router.get('/status', (req, res) => movieController.getStatus(req, res));

// Búsqueda de películas
router.get('/movies/search', (req, res) => movieController.searchMovies(req, res));

// Listado de películas (populares, tendencias, próximos estrenos o filtradas por género/orden)
router.get('/movies', (req, res) => movieController.getMovies(req, res));

// Detalles completos de una película
router.get('/movies/:id', (req, res) => movieController.getMovieDetails(req, res));

// Listado de géneros disponibles
router.get('/genres', (req, res) => movieController.getGenres(req, res));

module.exports = router;
