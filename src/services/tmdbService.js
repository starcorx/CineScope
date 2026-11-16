
const config = require('../config/environment');

class TMDBService {
  constructor() {
    // Caché temporal en memoria
    this.cache = new Map();

    // Tiempo de vida: 5 minutos
    this.cacheTtl = 5 * 60 * 1000;

    // Máximo de consultas almacenadas
    this.maxCacheEntries = 100;
  }

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
      const error = new Error(
        'La API Key de TMDB no está configurada en el archivo .env.'
      );
      error.statusCode = 503;
      error.code = 'TMDB_NOT_CONFIGURED';
      throw error;
    }
  }

  /**
   * Genera una clave única para cada consulta
   */
  getCacheKey(url) {
    const cacheUrl = new URL(url);

    // Nunca incluir la API Key en la clave de caché
    cacheUrl.searchParams.delete('api_key');

    const params = [...cacheUrl.searchParams.entries()]
      .sort(([a, av], [b, bv]) =>
        a.localeCompare(b) || av.localeCompare(bv)
      );

    return `${cacheUrl.origin}${cacheUrl.pathname}?${new URLSearchParams(params)}`;
  }

  /**
   * Elimina entradas vencidas
   */
  cleanCache() {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtiene una respuesta almacenada
   */
  getCached(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Evita que una modificación externa altere la caché
    return JSON.parse(JSON.stringify(entry.data));
  }

  /**
   * Almacena una respuesta con tiempo de expiración
   */

setCached(key, data) {
  this.cleanCache();

  // Crear una copia independiente de los datos
  const safeData = JSON.parse(JSON.stringify(data));

  // Eliminar la entrada más antigua si se alcanza el límite
  if (
    !this.cache.has(key) &&
    this.cache.size >= this.maxCacheEntries
  ) {
    const oldestKey = this.cache.keys().next().value;
    this.cache.delete(oldestKey);
  }

  this.cache.set(key, {
    data: safeData,
    expiresAt: Date.now() + this.cacheTtl
  });
}


  /**
   * Realiza peticiones HTTP a TMDB con caché y reintentos
   */
  async request(endpoint, queryParams = {}, retries = 1) {
    this.checkConfiguration();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('language', this.language);

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    // Comprobar caché antes de consultar TMDB
    const cacheKey = this.getCacheKey(url.toString());
    const cachedData = this.getCached(cacheKey);

    if (cachedData !== null) {
      return cachedData;
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        const error = new Error(
          errorData.status_message ||
          `Error en la API de TMDB: HTTP ${response.status}`
        );

        error.statusCode = response.status;
        error.tmdbCode = errorData.status_code;
        throw error;
      }

      const data = await response.json();

      // Guardar únicamente respuestas exitosas
      this.setCached(cacheKey, data);

      return data;

    } catch (err) {
      // Reintentar fallos transitorios de red
      if (retries > 0 && !err.statusCode) {
        console.warn(
          `[TMDB] Reintentando ${endpoint}: ${err.message}`
        );

        await new Promise(resolve => setTimeout(resolve, 400));

        return this.request(endpoint, queryParams, retries - 1);
      }

      if (err.statusCode) {
        throw err;
      }

      const networkError = new Error(
        `Error de conexión con TMDB: ${err.message}`
      );

      networkError.statusCode = 502;
      throw networkError;
    }
  }

  async getPopular(page = 1) {
    return this.request('/movie/popular', { page });
  }

  async getTrending(timeWindow = 'day', page = 1) {
    return this.request(`/trending/movie/${timeWindow}`, { page });
  }

  async getUpcoming(page = 1) {
    return this.request('/movie/upcoming', { page });
  }

  async searchMovies(query, page = 1) {
    if (!query || query.trim() === '') {
      return {
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0
      };
    }

    return this.request('/search/movie', {
      query: query.trim(),
      page,
      include_adult: false
    });
  }

  async discoverMovies({
    genreId,
    sortBy = 'popularity.desc',
    page = 1
  }) {
    const params = {
      page,
      sort_by: sortBy,
      include_adult: false
    };

    if (genreId && genreId !== 'all') {
      params.with_genres = genreId;
    }

    return this.request('/discover/movie', params);
  }

  async getGenres() {
    const data = await this.request('/genre/movie/list');
    return data.genres || [];
  }

  async getMovieDetails(movieId) {
    return this.request(`/movie/${movieId}`, {
      append_to_response: 'credits,videos,similar'
    });
  }
}

module.exports = new TMDBService();
