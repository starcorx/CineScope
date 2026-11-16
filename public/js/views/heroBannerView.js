/**
 * CineScope - HeroBanner View
 * Renderiza el carrusel cinematográfico rotativo de películas top
 */
const HeroBannerView = {
  renderCarousel(movies, { isFavoriteFn = () => false, inWatchlistFn = () => false } = {}) {
    if (!movies || movies.length === 0) return '';

    // Tomar las mejores 5 películas para el carrusel
    const topMovies = movies.slice(0, 5);

    const slidesHtml = topMovies.map((movie, index) => {
      const movieId = Number(movie.id || movie.movie_id);
      const title = movie.title || 'Película Destacada';
      const backdrop = movie.backdrop_path || movie.poster_path || '';
      const year = movie.release_date ? movie.release_date.split('-')[0] : '';
      const rating = typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : 'N/A';
      const overview = movie.overview || 'Sin descripción disponible para esta película.';
      const isFav = isFavoriteFn(movieId);
      const inWatch = inWatchlistFn(movieId);
      const isActive = index === 0 ? 'active' : '';

      return `
        <div class="hero-slide ${isActive}" data-slide-index="${index}" style="background-image: url('${backdrop}');">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <div class="hero-badge-tag">
              <i class="bi bi-fire text-danger"></i> #${index + 1} en Tendencias Hoy
            </div>
            <h1 class="hero-title">${title}</h1>
            <div class="hero-meta">
              <span class="rating-pill">
                <i class="bi bi-star-fill"></i> ${rating}
              </span>
              ${year ? `<span><i class="bi bi-calendar3 me-1"></i>${year}</span>` : ''}
              <span class="badge bg-secondary-subtle text-light border border-secondary">
                <i class="bi bi-badge-hd me-1"></i> 4K Ultra HD
              </span>
            </div>
            <p class="hero-overview">${overview}</p>
            <div class="hero-actions">
              <button class="btn-cinema-primary" onclick="app.openMovieDetails(${movieId})">
                <i class="bi bi-info-circle-fill"></i> Ver Detalles
              </button>
              <button 
                class="btn-cinema-secondary hero-btn-watch ${inWatch ? 'active text-warning' : ''}" 
                data-hero-watch="${movieId}"
                onclick="app.toggleWatchlist(${movieId})"
              >
                <i class="bi ${inWatch ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}"></i>
                <span>${inWatch ? 'En Mi Lista' : 'Agregar a Mi Lista'}</span>
              </button>
              <button 
                class="btn-cinema-secondary hero-btn-fav ${isFav ? 'active text-danger' : ''}" 
                data-hero-fav="${movieId}"
                onclick="app.toggleFavorite(${movieId})"
              >
                <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                <span>${isFav ? 'En Favoritos' : 'Favorito'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const indicatorsHtml = topMovies.map((_, index) => `
      <button 
        type="button" 
        class="hero-indicator-dot ${index === 0 ? 'active' : ''}" 
        data-slide-to="${index}" 
        aria-label="Diapositiva ${index + 1}"
        onclick="app.goToHeroSlide(${index})"
      ></button>
    `).join('');

    return `
      <div class="hero-carousel-container" id="heroCarousel" onmouseenter="app.pauseHeroAutoPlay()" onmouseleave="app.resumeHeroAutoPlay()">
        ${slidesHtml}

        <!-- Controles de navegación -->
        <button class="hero-nav-btn hero-nav-prev" onclick="app.prevHeroSlide()" aria-label="Película anterior">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="hero-nav-btn hero-nav-next" onclick="app.nextHeroSlide()" aria-label="Siguiente película">
          <i class="bi bi-chevron-right"></i>
        </button>

        <!-- Indicadores -->
        <div class="hero-indicators">
          ${indicatorsHtml}
        </div>
      </div>
    `;
  }
};

window.HeroBannerView = HeroBannerView;
