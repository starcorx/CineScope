const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');

// Obtener todas las películas de la lista
router.get('/watchlist', (req, res) => watchlistController.getAll(req, res));

// Verificar si una película está en la lista
router.get('/watchlist/check/:id', (req, res) => watchlistController.check(req, res));

// Agregar una película a la lista
router.post('/watchlist', (req, res) => watchlistController.add(req, res));

// Eliminar una película de la lista
router.delete('/watchlist/:id', (req, res) => watchlistController.remove(req, res));

module.exports = router;
