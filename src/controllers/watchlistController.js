const Watchlist = require('../models/Watchlist');

class WatchlistController {
  /**
   * GET /api/watchlist
   */
  async getAll(req, res) {
    try {
      const items = Watchlist.getAll();
      return res.status(200).json({
        total: items.length,
        results: items
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al consultar la lista de películas por ver',
        details: error.message
      });
    }
  }

  /**
   * POST /api/watchlist
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

      const savedItem = Watchlist.create(req.body);
      return res.status(201).json({
        message: 'Película agregada a tu lista exitosamente',
        watchlist: savedItem
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al agregar la película a tu lista',
        details: error.message
      });
    }
  }

  /**
   * DELETE /api/watchlist/:id
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

      const result = Watchlist.delete(movieId);
      return res.status(200).json({
        message: 'Película eliminada de tu lista exitosamente',
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al eliminar la película de tu lista',
        details: error.message
      });
    }
  }

  /**
   * GET /api/watchlist/check/:id
   */
  async check(req, res) {
    try {
      const { id } = req.params;
      const movieId = parseInt(id, 10);
      const exists = Watchlist.exists(movieId);
      return res.status(200).json({ inWatchlist: exists, movie_id: movieId });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: 'Error al verificar estado de la lista'
      });
    }
  }
}

module.exports = new WatchlistController();
