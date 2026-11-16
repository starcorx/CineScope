const Favorite = require('../models/Favorite');

class FavoriteController {
  /**
   * GET /api/favorites
   */
  async getAll(req, res) {
    try {
      const favorites = Favorite.getAll();
      return res.status(200).json({
        total: favorites.length,
        results: favorites
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al consultar las películas favoritas',
        details: error.message
      });
    }
  }

  /**
   * POST /api/favorites
   */
  async add(req, res) {
    try {
      const { movie_id, title } = req.body;

      if (!movie_id || !title) {
        return res.status(400).json({
          error: true,
          message: 'Los campos "movie_id" y "title" son obligatorios'
        });
      }

      const savedFavorite = Favorite.create(req.body);
      return res.status(201).json({
        message: 'Película agregada a favoritos exitosamente',
        favorite: savedFavorite
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al guardar la película en favoritos',
        details: error.message
      });
    }
  }

  /**
   * DELETE /api/favorites/:id
   * Soporta tanto id interno como movie_id
   */
  async remove(req, res) {
    try {
      const { id } = req.params;
      const movieId = parseInt(id, 10);

      if (isNaN(movieId)) {
        return res.status(400).json({
          error: true,
          message: 'El identificador debe ser numérico'
        });
      }

      const result = Favorite.delete(movieId);
      return res.status(200).json({
        message: 'Película eliminada de favoritos exitosamente',
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al eliminar la película de favoritos',
        details: error.message
      });
    }
  }

  /**
   * GET /api/favorites/check/:id
   */
  async check(req, res) {
    try {
      const { id } = req.params;
      const movieId = parseInt(id, 10);
      const exists = Favorite.exists(movieId);
      return res.status(200).json({ isFavorite: exists, movie_id: movieId });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al verificar estado de favorito'
      });
    }
  }
}

module.exports = new FavoriteController();
