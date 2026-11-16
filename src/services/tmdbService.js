const config = require('../config/environment');

class TMDBService {
  get baseUrl() {
    return config.tmdb.baseUrl;
  }

  get apiKey() {
    return config.tmdb.apiKey;
  }

  get language() {
    return 'es-ES';
  }

  /**
   * Verifica si las credenciales están presentes
   */
  checkConfiguration() {
    if (!config.isTmdbConfigured()) {
      const error = new Error('La API Key de TMDB no está configurada en el archivo .env. Por favor ingresa tu TMDB_API_KEY.');
      error.statusCode = 503;
      error.code = 'TMDB_NOT_CONFIGURED';
      throw error;
    }
  }

  /**
   * Método genérico para realizar peticiones HTTP a la API de TMDB con reintentos
   */
  async request(endpoint, queryParams = {}, retries = 1) {
    this.checkConfiguration();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('language', this.language);

    // Agregar parámetros adicionales
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    try {
      // Timeout de 10 segundos para evitar cuelgues
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.status_message || `Error en la API de TMDB: HTTP ${response.status}`);
        error.statusCode = response.status;
        error.tmdbCode = errorData.status_code;
        throw error;
      }

      return await response.json();
    } catch (err) {
      // Reintentar una vez en caso de fallo de red transitorio
      if (retries > 0 && !err.statusCode) {
        console.warn(`[TMDB] Reintentando ${endpoint} tras error: ${err.message}`);
        await new Promise(r => setTimeout(r, 400));
        return this.request(endpoint, queryParams, retries - 1);
      }

      if (err.statusCode) {
        throw err;
      }
      const networkError = new Error(`Error de conexión con el servicio de TMDB: ${err.message}`);
      networkError.statusCode = 502;
      throw networkError;
    }
  }

  /**
   * Obtiene la lista de películas populares
   */
  async getPopular(page = 1) {
    return await this.request('/movie/popular', { page });
  }

  /**
   * Obtiene las películas en tendencia (diarias o semanales)
   */
  async getTrending(timeWindow = 'day', page = 1) {
    return await this.request(`/trending/movie/${timeWindow}`, { page });
  }

  /**
   * Obtiene los próximos estrenos en cines
   */
  async getUpcoming(page = 1) {
    return await this.request('/movie/upcoming', { page });
  }

  /**
   * Busca películas por término de texto
   */
  async searchMovies(query, page = 1) {
    if (!query || query.trim() === '') {
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
    }
    return await this.request('/search/movie', {
      query: query.trim(),
      page,
      include_adult: false
    });
  }

  /**
   * Obtiene el catálogo con filtros (género, ordenamiento, página)
   */
  async discoverMovies({ genreId, sortBy = 'popularity.desc', page = 1 }) {
    const params = {
      page,
      sort_by: sortBy,
      include_adult: false
    };

    if (genreId && genreId !== 'all') {
      params.with_genres = genreId;
    }

    return await this.request('/discover/movie', params);
  }

  /**
   * Obtiene el listado oficial de géneros cinematográficos
   */
  async getGenres() {
    const data = await this.request('/genre/movie/list');
    return data.genres || [];
  }

  /**
   * Obtiene detalles completos de una película incluyendo créditos y videos (tráilers)
   */
  async getMovieDetails(movieId) {
    return await this.request(`/movie/${movieId}`, {
      append_to_response: 'credits,videos,similar'
    });
  }
}

module.exports = new TMDBService();
