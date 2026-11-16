const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

// Obtener todas las películas favoritas
router.get('/favorites', (req, res) => favoriteController.getAll(req, res));

// Verificar si una película específica está en favoritos
router.get('/favorites/check/:id', (req, res) => favoriteController.check(req, res));

// Agregar una película a favoritos
router.post('/favorites', (req, res) => favoriteController.add(req, res));

// Eliminar una película de favoritos
router.delete('/favorites/:id', (req, res) => favoriteController.remove(req, res));

module.exports = router;
