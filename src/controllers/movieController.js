const tmdbService = require('../services/tmdbService');
const config = require('../config/environment');

class MovieController {
  /**
   * GET /api/movies
   * Permite obtener películas por tipo (popular, trending, upcoming) o mediante filtros (género, orden)
   */
  async getMovies(req, res) {
    try {
      const { type = 'popular', genre_id, sort_by, page = 1, time_window = 'day' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);

      let data;
      if (genre_id || sort_by) {
        data = await tmdbService.discoverMovies({
          genreId: genre_id,
          sortBy: sort_by || 'popularity.desc',
          page: pageNum
        });
      } else {
        switch (type.toLowerCase()) {
          case 'trending':
            data = await tmdbService.getTrending(time_window, pageNum);
            break;
          case 'upcoming':
            data = await tmdbService.getUpcoming(pageNum);
            break;
          case 'popular':
          default:
            data = await tmdbService.getPopular(pageNum);
            break;
        }
      }

      // Normalizar resultados agregando URLs completas de póster y fondo
      const formattedResults = (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        poster_path: movie.poster_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.posterSize}${movie.poster_path}` : null,
        backdrop_path: movie.backdrop_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.backdropSize}${movie.backdrop_path}` : null,
        genre_ids: movie.genre_ids || []
      }));

      return res.status(200).json({
        page: data.page,
        total_pages: Math.min(data.total_pages || 1, 500), // TMDB limita discover a 500 páginas
        total_results: data.total_results || 0,
        results: formattedResults
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: true,
        message: error.message || 'Error al obtener el listado de películas',
        code: error.code || 'MOVIES_FETCH_ERROR'
      });
    }
  }

  /**
   * GET /api/movies/search?q=...&page=...
   */
  async searchMovies(req, res) {
    try {
      const { q, page = 1 } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          error: true,
          message: 'El parámetro de búsqueda "q" es requerido'
        });
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const data = await tmdbService.searchMovies(q, pageNum);

      console.log(`🔍 [Búsqueda TMDB] Consulta: "${q}" (Pág ${pageNum}) => ${data.total_results || 0} resultados.`);

      const formattedResults = (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        poster_path: movie.poster_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.posterSize}${movie.poster_path}` : null,
        backdrop_path: movie.backdrop_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.backdropSize}${movie.backdrop_path}` : null,
        genre_ids: movie.genre_ids || []
      }));

      return res.status(200).json({
        page: data.page,
        total_pages: data.total_pages || 1,
        total_results: data.total_results || 0,
        results: formattedResults
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: true,
        message: error.message || 'Error en la búsqueda de películas',
        code: error.code || 'SEARCH_ERROR'
      });
    }
  }

  /**
   * GET /api/movies/:id
   * Retorna detalles enriquecidos: reparto principal, director, trailer de YouTube, etc.
   */
  async getMovieDetails(req, res) {
    try {
      const { id } = req.params;
      const movieId = parseInt(id, 10);

      if (isNaN(movieId)) {
        return res.status(400).json({
          error: true,
          message: 'El identificador de película debe ser numérico'
        });
      }

      const movie = await tmdbService.getMovieDetails(movieId);

      // Extraer director
      const crew = (movie.credits && movie.credits.crew) || [];
      const directorObj = crew.find(member => member.job === 'Director');
      const director = directorObj ? directorObj.name : 'No disponible';

      // Extraer reparto principal (top 8)
      const cast = ((movie.credits && movie.credits.cast) || []).slice(0, 8).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.profileSize}${actor.profile_path}` : null
      }));

      // Extraer trailer principal de YouTube
      const videos = (movie.videos && movie.videos.results) || [];
      const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || videos[0] || null;

      const details = {
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        tagline: movie.tagline || '',
        overview: movie.overview,
        release_date: movie.release_date,
        runtime: movie.runtime || 0,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        poster_path: movie.poster_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.posterSize}${movie.poster_path}` : null,
        backdrop_path: movie.backdrop_path ? `${config.tmdb.imageBaseUrl}/${config.tmdb.backdropSize}${movie.backdrop_path}` : null,
        genres: (movie.genres || []).map(g => ({ id: g.id, name: g.name })),
        director,
        cast,
        trailer_key: trailer ? trailer.key : null,
        status: movie.status,
        budget: movie.budget,
        revenue: movie.revenue
      };

      return res.status(200).json(details);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: true,
        message: error.message || 'Error al obtener los detalles de la película',
        code: error.code || 'MOVIE_DETAILS_ERROR'
      });
    }
  }

  /**
   * GET /api/genres
   */
  async getGenres(req, res) {
    try {
      const genres = await tmdbService.getGenres();
      return res.status(200).json({ genres });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: true,
        message: error.message || 'Error al obtener los géneros',
        code: error.code || 'GENRES_ERROR'
      });
    }
  }

  /**
   * GET /api/status
   */
  async getStatus(req, res) {
    const isConfigured = config.isTmdbConfigured();
    return res.status(200).json({
      status: 'online',
      service: 'CineScope API',
      version: '1.0.0',
      tmdb_configured: isConfigured,
      message: isConfigured ? 'Servicio configurado correctamente' : 'Falta configurar TMDB_API_KEY en .env'
    });
  }
}

module.exports = new MovieController();
