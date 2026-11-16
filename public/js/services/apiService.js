/**
 * CineScope - API Service
 * Centraliza las llamadas asíncronas HTTP al Backend propio mediante fetch()
 */
class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Error en la solicitud HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err; // Permitir que el controlador descarte búsquedas canceladas
      }
      console.error(`[ApiService Error] ${options.method || 'GET'} ${url}:`, err);
      throw err;
    }
  }

  // --- Estado del Servicio ---
  async getStatus() {
    return this.request('/status');
  }

  // --- Películas (TMDB vía Backend) ---
  async getMovies({ type = 'popular', genre_id, sort_by, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (genre_id) params.set('genre_id', genre_id);
    if (sort_by) params.set('sort_by', sort_by);
    if (page) params.set('page', page);

    return this.request(`/movies?${params.toString()}`);
  }

  async getMovieDetails(id) {
    return this.request(`/movies/${id}`);
  }

  async searchMovies(query, page = 1, signal = null) {
    const params = new URLSearchParams({
      q: query,
      page: page
    });
    return this.request(`/movies/search?${params.toString()}`, { signal });
  }

  async getGenres() {
    return this.request('/genres');
  }

  // --- Favoritos (SQLite) ---
  async getFavorites() {
    return this.request('/favorites');
  }

  async checkFavorite(movieId) {
    return this.request(`/favorites/check/${movieId}`);
  }

  async addFavorite(movieData) {
    return this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify(movieData)
    });
  }

  async removeFavorite(movieId) {
    return this.request(`/favorites/${movieId}`, {
      method: 'DELETE'
    });
  }

  // --- Watchlist / Mi Lista (SQLite) ---
  async getWatchlist() {
    return this.request('/watchlist');
  }

  async checkWatchlist(movieId) {
    return this.request(`/watchlist/check/${movieId}`);
  }

  async addWatchlist(movieData) {
    return this.request('/watchlist', {
      method: 'POST',
      body: JSON.stringify(movieData)
    });
  }

  async removeWatchlist(movieId) {
    return this.request(`/watchlist/${movieId}`, {
      method: 'DELETE'
    });
  }
}

// Exportar instancia singleton
window.apiService = new ApiService();
