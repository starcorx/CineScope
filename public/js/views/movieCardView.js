/**
 * CineScope - MovieCard View
 * Renderiza tarjetas de películas cinematográficas y estados de carga (skeletons)
 */
const MovieCardView = {
  defaultPoster: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22750%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20500%20750%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1%20text%20%7B%20fill%3Argba(255%2C255%2C255%2C0.3)%3Bfont-weight%3Abold%3Bfont-family%3Asans-serif%3Bfont-size%3A32pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_1%22%3E%3Crect%20width%3D%22500%22%20height%3D%22750%22%20fill%3D%22%23131722%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22140%22%20y%3D%22390%22%3ECineScope%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E',

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  renderCard(movie, { isFavorite = false, inWatchlist = false } = {}) {
    const movieId = Number(movie.movie_id || movie.id);
    const rawTitle = movie.title || 'Sin Título';
    const title = this.escapeHtml(rawTitle);
    const poster = movie.poster_path || this.defaultPoster;
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'S/F';
    const rating = typeof movie.vote_average === 'number' && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : 'N/A';

    return `
      <div class="col-6 col-md-4 col-lg-3 col-xl-2-4 mb-4">
        <div class="movie-card" data-movie-id="${movieId}">
          <div class="poster-wrapper">
            <img 
              src="${poster}" 
              alt="${title}" 
              class="poster-img" 
              loading="lazy"
              onerror="this.src='${this.defaultPoster}'"
            />
            <div class="rating-badge">
              <i class="bi bi-star-fill text-warning"></i>
              <span>${rating}</span>
            </div>
            
            <div class="quick-actions">
              <button 
                class="btn-cinema-icon btn-quick-fav ${isFavorite ? 'active' : ''}" 
                data-movie-id="${movieId}" 
                title="${isFavorite ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}"
                onclick="event.stopPropagation(); app.toggleFavorite(${movieId})"
              >
                <i class="bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
              <button 
                class="btn-cinema-icon btn-quick-watch ${inWatchlist ? 'active' : ''}" 
                data-movie-id="${movieId}" 
                title="${inWatchlist ? 'Quitar de Mi Lista' : 'Guardar en Mi Lista'}"
                onclick="event.stopPropagation(); app.toggleWatchlist(${movieId})"
              >
                <i class="bi ${inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}"></i>
              </button>
            </div>

            <div class="poster-overlay"></div>
          </div>

          <div class="movie-info">
            <h5 class="movie-title" title="${title}">${title}</h5>
            <div class="movie-meta">
              <span class="release-year"><i class="bi bi-calendar3 me-1"></i>${year}</span>
              <span class="btn-details-link">Detalles <i class="bi bi-chevron-right"></i></span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderSkeletons(count = 10) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2-4 mb-4">
          <div class="skeleton-card">
            <div class="skeleton-poster"></div>
            <div class="skeleton-body">
              <div class="skeleton-line w-75"></div>
              <div class="skeleton-line w-50"></div>
            </div>
          </div>
        </div>
      `;
    }
    return skeletons;
  },

  renderEmptyState({ icon = 'bi-film', title = 'No hay películas', message = 'No se encontraron resultados en esta sección.' } = {}) {
    return `
      <div class="col-12">
        <div class="empty-state">
          <i class="bi ${icon} empty-icon"></i>
          <h3 class="empty-title">${this.escapeHtml(title)}</h3>
          <p class="empty-desc">${this.escapeHtml(message)}</p>
          <button class="btn-cinema-primary" onclick="app.navigateTo('explore')">
            <i class="bi bi-compass me-1"></i> Explorar Catálogo
          </button>
        </div>
      </div>
    `;
  }
};

window.MovieCardView = MovieCardView;
