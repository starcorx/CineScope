/**
 * CineScope - App Controller (Frontend MVC)
 * Coordina la lógica de negocio del cliente, eventos, estado y vistas
 */
class CineScopeApp {
  constructor() {
    this.state = {
      favorites: new Map(), // movieId -> movieObject
      watchlist: new Map(), // movieId -> movieObject
      genres: [],
      currentSection: 'home',
      moviesCache: new Map(), // movieId -> movieObject
      currentModalMovie: null,
      explore: {
        page: 1,
        totalPages: 1,
        genreId: 'all',
        sortBy: 'popularity.desc'
      },
      search: {
        query: '',
        page: 1,
        totalPages: 1
      }
    };

    this.searchDebounceTimer = null;
    this.searchAbortController = null;
    this.searchSeq = 0;
    this.detailsModal = null;

    // Estado del Carrusel Hero
    this.currentHeroSlide = 0;
    this.heroSlidesCount = 0;
    this.heroAutoPlayTimer = null;
  }

  /**
   * Inicializa la aplicación, eventos y carga de datos iniciales
   */
  async init() {
    console.log('🎬 Inicializando CineScope App...');

    // Inicializar modal de Bootstrap
    const modalEl = document.getElementById('movieDetailsModal');
    if (modalEl) {
      this.detailsModal = new bootstrap.Modal(modalEl);
    }

    // Vincular eventos de la interfaz
    this.bindEvents();

    // Cargar estado inicial
    await this.checkSystemStatus();
    await Promise.all([
      this.loadGenres(),
      this.loadFavorites(),
      this.loadWatchlist()
    ]);

    // Cargar contenido inicial de la sección Home
    await this.loadHomeContent();

    // Soportar navegación directa por Hash en URL (#explore, #favorites, etc.)
    const hash = window.location.hash.replace('#', '');
    if (['home', 'explore', 'favorites', 'watchlist'].includes(hash)) {
      this.navigateTo(hash, false);
    }
  }

  /**
   * Verifica la configuración y conexión con TMDB
   */
  async checkSystemStatus() {
    try {
      const status = await apiService.getStatus();
      const alertBanner = document.getElementById('tmdbConfigAlert');
      if (alertBanner) {
        if (!status.tmdb_configured) {
          alertBanner.classList.remove('d-none');
        } else {
          alertBanner.classList.add('d-none');
        }
      }
    } catch (err) {
      console.warn('No se pudo verificar el estado del servidor:', err);
    }
  }

  /**
   * Vincula los oyentes de eventos del DOM
   */
  bindEvents() {
    // Cambio de estilo en la barra de navegación al hacer scroll
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.navbar-cinescope');
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });

    // Enlaces de navegación de la barra superior
    document.querySelectorAll('[data-nav-target]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.getAttribute('data-nav-target');
        this.navigateTo(target);
      });
    });

    // Manejador del campo de búsqueda con Debounce y control de concurrencia
    const searchInput = document.getElementById('navSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const rawValue = e.target.value;
        const query = rawValue.trim();

        if (clearSearchBtn) {
          clearSearchBtn.style.display = rawValue.length > 0 ? 'block' : 'none';
        }

        clearTimeout(this.searchDebounceTimer);

        if (query.length < 2) {
          if (query.length === 0 && this.state.currentSection === 'search') {
            this.navigateTo('home');
          }
          return;
        }

        // Debounce de 400ms para permitir escribir con fluidez sin disparar peticiones innecesarias
        this.searchDebounceTimer = setTimeout(() => {
          this.executeSearch(query, 1);
        }, 400);
      });

      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query.length >= 2) {
            clearTimeout(this.searchDebounceTimer);
            this.executeSearch(query, 1);
          }
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        if (this.state.currentSection === 'search') {
          this.navigateTo('home');
        }
      });
    }

    // Filtro de ordenamiento en Explorar
    const sortSelect = document.getElementById('exploreSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        this.state.explore.sortBy = e.target.value;
        this.state.explore.page = 1;
        this.loadExploreMovies();
      });
    }

    // Delegación de clics en tarjetas de películas para abrir detalles
    document.addEventListener('click', e => {
      const card = e.target.closest('.movie-card');
      if (card && !e.target.closest('.quick-actions')) {
        const movieId = card.getAttribute('data-movie-id');
        if (movieId) {
          this.openMovieDetails(movieId);
        }
      }
    });
  }

  /**
   * Navega entre las diferentes secciones SPA
   */
  navigateTo(sectionName, updateHash = true) {
    this.state.currentSection = sectionName;

    // Actualizar enlaces activos en la Navbar
    document.querySelectorAll('.navbar-cinescope .nav-link').forEach(link => {
      const target = link.getAttribute('data-nav-target');
      link.classList.toggle('active', target === sectionName);
    });

    // Ocultar todas las secciones y activar la seleccionada
    document.querySelectorAll('.app-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (updateHash) {
      window.location.hash = sectionName;
    }

    // Cargar contenido según la sección
    if (sectionName === 'explore') {
      this.loadExploreMovies();
    } else if (sectionName === 'favorites') {
      this.renderFavoritesView();
    } else if (sectionName === 'watchlist') {
      this.renderWatchlistView();
    }
  }

  /**
   * Carga los géneros oficiales desde TMDB
   */
  async loadGenres() {
    try {
      const data = await apiService.getGenres();
      this.state.genres = data.genres || [];
      this.renderGenreFilters();
    } catch (err) {
      console.warn('Error al cargar géneros:', err);
    }
  }

  /**
   * Renderiza los chips de filtros por género en la sección Explorar
   */
  renderGenreFilters() {
    const container = document.getElementById('genreFilterBar');
    if (!container) return;

    let html = `
      <button class="genre-pill ${this.state.explore.genreId === 'all' ? 'active' : ''}" data-genre-id="all">
        Todos los Géneros
      </button>
    `;

    this.state.genres.forEach(g => {
      const isActive = String(this.state.explore.genreId) === String(g.id);
      html += `
        <button class="genre-pill ${isActive ? 'active' : ''}" data-genre-id="${g.id}">
          ${g.name}
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.genre-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.genre-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.explore.genreId = btn.getAttribute('data-genre-id');
        this.state.explore.page = 1;
        this.loadExploreMovies();
      });
    });
  }

  /**
   * Carga los favoritos persistidos en SQLite
   */
  async loadFavorites() {
    try {
      const res = await apiService.getFavorites();
      this.state.favorites.clear();
      (res.results || []).forEach(movie => {
        const mId = Number(movie.movie_id || movie.id);
        this.state.favorites.set(mId, movie);
        this.state.moviesCache.set(mId, movie);
      });
      this.updateNavbarBadges();
    } catch (err) {
      console.error('Error al cargar favoritos:', err);
    }
  }

  /**
   * Carga la lista de películas por ver persistida en SQLite
   */
  async loadWatchlist() {
    try {
      const res = await apiService.getWatchlist();
      this.state.watchlist.clear();
      (res.results || []).forEach(movie => {
        const mId = Number(movie.movie_id || movie.id);
        this.state.watchlist.set(mId, movie);
        this.state.moviesCache.set(mId, movie);
      });
      this.updateNavbarBadges();
    } catch (err) {
      console.error('Error al cargar watchlist:', err);
    }
  }

  /**
   * Actualiza los contadores numéricos en la barra superior
   */
  updateNavbarBadges() {
    const favBadge = document.getElementById('favCountBadge');
    if (favBadge) {
      favBadge.textContent = this.state.favorites.size;
    }

    const watchBadge = document.getElementById('watchCountBadge');
    if (watchBadge) {
      watchBadge.textContent = this.state.watchlist.size;
    }
  }

  /**
   * Carga el contenido de la sección Inicio (Hero Carousel, Tendencias, Populares, Próximos)
   */
  async loadHomeContent() {
    const heroContainer = document.getElementById('heroContainer');
    const trendingGrid = document.getElementById('trendingGrid');
    const popularGrid = document.getElementById('popularGrid');
    const upcomingGrid = document.getElementById('upcomingGrid');

    // Mostrar loaders esqueletos
    if (trendingGrid) trendingGrid.innerHTML = MovieCardView.renderSkeletons(5);
    if (popularGrid) popularGrid.innerHTML = MovieCardView.renderSkeletons(5);
    if (upcomingGrid) upcomingGrid.innerHTML = MovieCardView.renderSkeletons(5);

    try {
      const [trendingData, popularData, upcomingData] = await Promise.all([
        apiService.getMovies({ type: 'trending' }),
        apiService.getMovies({ type: 'popular' }),
        apiService.getMovies({ type: 'upcoming' })
      ]);

      // Cachear películas para acceso rápido
      [...trendingData.results, ...popularData.results, ...upcomingData.results].forEach(m => {
        const mId = Number(m.id || m.movie_id);
        this.state.moviesCache.set(mId, m);
      });

      // Renderizar Hero Carousel con las mejores 5 películas en tendencia
      if (heroContainer && trendingData.results.length > 0) {
        heroContainer.innerHTML = HeroBannerView.renderCarousel(trendingData.results, {
          isFavoriteFn: (id) => this.state.favorites.has(Number(id)),
          inWatchlistFn: (id) => this.state.watchlist.has(Number(id))
        });
        this.initHeroCarousel(Math.min(5, trendingData.results.length));
      }

      // Renderizar Grilla de Tendencias (omitir las del hero si hay más de 5)
      if (trendingGrid) {
        const trendingMovies = trendingData.results.slice(0, 10);
        trendingGrid.innerHTML = trendingMovies.map(m => MovieCardView.renderCard(m, {
          isFavorite: this.state.favorites.has(Number(m.id || m.movie_id)),
          inWatchlist: this.state.watchlist.has(Number(m.id || m.movie_id))
        })).join('');
      }

      // Renderizar Grilla de Populares
      if (popularGrid) {
        popularGrid.innerHTML = popularData.results.slice(0, 10).map(m => MovieCardView.renderCard(m, {
          isFavorite: this.state.favorites.has(Number(m.id || m.movie_id)),
          inWatchlist: this.state.watchlist.has(Number(m.id || m.movie_id))
        })).join('');
      }

      // Renderizar Grilla de Próximos Estrenos
      if (upcomingGrid) {
        upcomingGrid.innerHTML = upcomingData.results.slice(0, 10).map(m => MovieCardView.renderCard(m, {
          isFavorite: this.state.favorites.has(Number(m.id || m.movie_id)),
          inWatchlist: this.state.watchlist.has(Number(m.id || m.movie_id))
        })).join('');
      }
    } catch (err) {
      console.error('Error al cargar contenido de inicio:', err);
      const errMsg = MovieCardView.renderEmptyState({
        icon: 'bi-exclamation-octagon',
        title: 'Error de Conexión con TMDB',
        message: err.message || 'Verifica que tu clave TMDB_API_KEY esté configurada en el archivo .env'
      });
      if (trendingGrid) trendingGrid.innerHTML = errMsg;
    }
  }

  // --- Manejo del Carrusel Cinemático del Hero Banner ---
  initHeroCarousel(count) {
    this.heroSlidesCount = count;
    this.currentHeroSlide = 0;
    this.startHeroAutoPlay();
  }

  startHeroAutoPlay() {
    this.stopHeroAutoPlay();
    if (this.heroSlidesCount <= 1) return;
    this.heroAutoPlayTimer = setInterval(() => {
      this.nextHeroSlide();
    }, 5500);
  }

  stopHeroAutoPlay() {
    if (this.heroAutoPlayTimer) {
      clearInterval(this.heroAutoPlayTimer);
      this.heroAutoPlayTimer = null;
    }
  }

  pauseHeroAutoPlay() {
    this.stopHeroAutoPlay();
  }

  resumeHeroAutoPlay() {
    this.startHeroAutoPlay();
  }

  goToHeroSlide(index) {
    if (!this.heroSlidesCount || this.heroSlidesCount <= 0) return;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-indicator-dot');

    if (index < 0) index = this.heroSlidesCount - 1;
    if (index >= this.heroSlidesCount) index = 0;

    this.currentHeroSlide = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  nextHeroSlide() {
    this.goToHeroSlide((this.currentHeroSlide || 0) + 1);
  }

  prevHeroSlide() {
    this.goToHeroSlide((this.currentHeroSlide || 0) - 1);
  }

  /**
   * Carga películas en la sección Explorar con filtros y paginación
   */
  async loadExploreMovies() {
    const grid = document.getElementById('exploreGrid');
    const paginationContainer = document.getElementById('explorePagination');
    if (!grid) return;

    grid.innerHTML = MovieCardView.renderSkeletons(10);

    try {
      const data = await apiService.getMovies({
        genre_id: this.state.explore.genreId,
        sort_by: this.state.explore.sortBy,
        page: this.state.explore.page
      });

      this.state.explore.totalPages = data.total_pages || 1;

      (data.results || []).forEach(m => this.state.moviesCache.set(Number(m.id || m.movie_id), m));

      if (!data.results || data.results.length === 0) {
        grid.innerHTML = MovieCardView.renderEmptyState({
          icon: 'bi-search',
          title: 'Sin resultados',
          message: 'No se encontraron películas con los filtros seleccionados.'
        });
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      grid.innerHTML = data.results.map(m => MovieCardView.renderCard(m, {
        isFavorite: this.state.favorites.has(Number(m.id || m.movie_id)),
        inWatchlist: this.state.watchlist.has(Number(m.id || m.movie_id))
      })).join('');

      this.renderPagination(paginationContainer, this.state.explore.page, this.state.explore.totalPages, (newPage) => {
        this.state.explore.page = newPage;
        this.loadExploreMovies();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      });
    } catch (err) {
      grid.innerHTML = MovieCardView.renderEmptyState({
        icon: 'bi-exclamation-triangle',
        title: 'Error al explorar películas',
        message: err.message
      });
    }
  }

  /**
   * Ejecuta una búsqueda de películas por término con cancelación y sincronización segura
   */
  async executeSearch(query, page = 1) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return;

    // Incrementar secuencia de búsqueda para descartar respuestas lentas obsoletas
    this.searchSeq = (this.searchSeq || 0) + 1;
    const currentSeq = this.searchSeq;

    // Abortar solicitud anterior en curso
    if (this.searchAbortController) {
      this.searchAbortController.abort();
    }
    this.searchAbortController = new AbortController();

    this.state.search.query = cleanQuery;
    this.state.search.page = page;

    this.navigateTo('search', false);

    const titleEl = document.getElementById('searchQueryTitle');
    const countEl = document.getElementById('searchResultCount');
    const grid = document.getElementById('searchGrid');
    const paginationContainer = document.getElementById('searchPagination');

    if (titleEl) titleEl.textContent = `Resultados para "${cleanQuery}"`;
    if (countEl) countEl.textContent = 'Buscando películas en TMDB...';
    if (grid) grid.innerHTML = MovieCardView.renderSkeletons(10);
    if (paginationContainer) paginationContainer.innerHTML = '';

    try {
      const data = await apiService.searchMovies(cleanQuery, page, this.searchAbortController.signal);

      // Si se inició una búsqueda más reciente mientras esta respondía, descartarla
      if (currentSeq !== this.searchSeq) {
        return;
      }

      this.state.search.totalPages = data.total_pages || 1;

      if (countEl) {
        const total = data.total_results || 0;
        countEl.textContent = `${total} película${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}`;
      }

      (data.results || []).forEach(m => this.state.moviesCache.set(Number(m.id || m.movie_id), m));

      if (!data.results || data.results.length === 0) {
        grid.innerHTML = MovieCardView.renderEmptyState({
          icon: 'bi-search',
          title: 'No se encontraron resultados',
          message: `No pudimos encontrar ninguna película que coincida con "${cleanQuery}". Intenta con otro término o título.`
        });
        return;
      }

      grid.innerHTML = data.results.map(m => MovieCardView.renderCard(m, {
        isFavorite: this.state.favorites.has(Number(m.id || m.movie_id)),
        inWatchlist: this.state.watchlist.has(Number(m.id || m.movie_id))
      })).join('');

      this.renderPagination(paginationContainer, this.state.search.page, this.state.search.totalPages, (newPage) => {
        this.executeSearch(cleanQuery, newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (err) {
      // Ignorar cancelaciones intencionales por nueva búsqueda
      if (err.name === 'AbortError') {
        return;
      }
      if (currentSeq !== this.searchSeq) {
        return;
      }

      console.error('Error al ejecutar búsqueda:', err);
      if (countEl) countEl.textContent = 'Error al consultar resultados';

      grid.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <i class="bi bi-exclamation-octagon empty-icon text-danger"></i>
            <h3 class="empty-title">Error en la búsqueda</h3>
            <p class="empty-desc">${err.message || 'Ocurrió un problema de conexión al buscar películas.'}</p>
            <button class="btn btn-cinema-primary" onclick="app.executeSearch('${cleanQuery.replace(/'/g, "\\'")}', ${page})">
              <i class="bi bi-arrow-clockwise me-1"></i> Reintentar Búsqueda
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Renderiza el control de paginación
   */
  renderPagination(container, currentPage, totalPages, onPageChange) {
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

    container.innerHTML = `
      <div class="d-flex justify-content-center align-items-center gap-3 my-4">
        <button class="btn btn-cinema-secondary ${prevDisabled}" id="prevPageBtn">
          <i class="bi bi-chevron-left me-1"></i> Anterior
        </button>
        <span class="text-secondary fw-semibold">
          Página <strong class="text-light">${currentPage}</strong> de <strong class="text-light">${totalPages}</strong>
        </span>
        <button class="btn btn-cinema-secondary ${nextDisabled}" id="nextPageBtn">
          Siguiente <i class="bi bi-chevron-right ms-1"></i>
        </button>
      </div>
    `;

    const prevBtn = container.querySelector('#prevPageBtn');
    const nextBtn = container.querySelector('#nextPageBtn');

    if (prevBtn && currentPage > 1) {
      prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
    }
    if (nextBtn && currentPage < totalPages) {
      nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
    }
  }

  /**
   * Renderiza la vista de Favoritos
   */
  renderFavoritesView() {
    const grid = document.getElementById('favoritesGrid');
    const countBadge = document.getElementById('favSectionCount');
    if (!grid) return;

    const favoritesList = Array.from(this.state.favorites.values());
    if (countBadge) countBadge.textContent = `${favoritesList.length} guardadas`;

    if (favoritesList.length === 0) {
      grid.innerHTML = MovieCardView.renderEmptyState({
        icon: 'bi-heart',
        title: 'Aún no tienes favoritos',
        message: 'Explora películas y haz clic en el corazón para guardarlas en tus favoritas.'
      });
      return;
    }

    grid.innerHTML = favoritesList.map(m => MovieCardView.renderCard(m, {
      isFavorite: true,
      inWatchlist: this.state.watchlist.has(Number(m.movie_id || m.id))
    })).join('');
  }

  /**
   * Renderiza la vista de Mi Lista (Watchlist)
   */
  renderWatchlistView() {
    const grid = document.getElementById('watchlistGrid');
    const countBadge = document.getElementById('watchSectionCount');
    if (!grid) return;

    const watchlist = Array.from(this.state.watchlist.values());
    if (countBadge) countBadge.textContent = `${watchlist.length} pendientes`;

    if (watchlist.length === 0) {
      grid.innerHTML = MovieCardView.renderEmptyState({
        icon: 'bi-bookmark-plus',
        title: 'Tu lista está vacía',
        message: 'Guarda películas pendientes de ver haciendo clic en el marcador para no olvidarlas.'
      });
      return;
    }

    grid.innerHTML = watchlist.map(m => MovieCardView.renderCard(m, {
      isFavorite: this.state.favorites.has(Number(m.movie_id || m.id)),
      inWatchlist: true
    })).join('');
  }

  /**
   * Abre el modal de detalles con información completa desde TMDB
   */
  async openMovieDetails(movieId) {
    const numId = Number(movieId);
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    // Mostrar estado de carga dentro del modal
    modalContent.innerHTML = `
      <div class="p-5 text-center">
        <div class="spinner-border text-danger" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 text-secondary">Cargando detalles de la película...</p>
      </div>
    `;

    if (this.detailsModal) {
      this.detailsModal.show();
    }

    try {
      const movie = await apiService.getMovieDetails(numId);
      this.state.currentModalMovie = movie;
      this.state.moviesCache.set(numId, movie);

      const isFav = this.state.favorites.has(numId);
      const inWatch = this.state.watchlist.has(numId);

      modalContent.innerHTML = DetailsModalView.renderContent(movie, {
        isFavorite: isFav,
        inWatchlist: inWatch
      });
    } catch (err) {
      modalContent.innerHTML = `
        <div class="p-5 text-center">
          <i class="bi bi-exclamation-octagon text-danger display-4 mb-3 d-block"></i>
          <h4>Error al cargar detalles</h4>
          <p class="text-secondary">${err.message}</p>
          <button class="btn btn-cinema-secondary mt-2" data-bs-dismiss="modal">Cerrar</button>
        </div>
      `;
    }
  }

  /**
   * Agrega o elimina una película de Favoritos en SQLite con soporte para Deshacer
   */
  async toggleFavorite(movieId) {
    const numId = Number(movieId);
    const isCurrentlyFav = this.state.favorites.has(numId);

    try {
      if (isCurrentlyFav) {
        // Guardar copia de los datos antes de eliminar para permitir "Deshacer"
        const movieToRestore = this.state.favorites.get(numId) || this.state.moviesCache.get(numId);
        const movieTitle = movieToRestore ? movieToRestore.title : 'Película';

        // Eliminar de favoritos en SQLite
        await apiService.removeFavorite(numId);
        this.state.favorites.delete(numId);

        // Mostrar notificación toast con botón "Deshacer"
        ToastView.show(`"${movieTitle}" eliminada de Favoritos`, 'warning', 5500, {
          text: 'Deshacer',
          onClick: () => this.restoreFavorite(movieToRestore, numId)
        });
      } else {
        // Agregar a favoritos
        let movieData = this.state.moviesCache.get(numId);
        if (!movieData) {
          movieData = await apiService.getMovieDetails(numId);
        }

        const payload = {
          movie_id: numId,
          title: movieData.title,
          poster_path: movieData.poster_path,
          backdrop_path: movieData.backdrop_path,
          release_date: movieData.release_date,
          vote_average: movieData.vote_average,
          overview: movieData.overview,
          genres: Array.isArray(movieData.genres) ? movieData.genres.map(g => g.name).join(', ') : (movieData.genres || '')
        };

        const res = await apiService.addFavorite(payload);
        const saved = res.favorite || payload;
        this.state.favorites.set(numId, saved);
        this.state.moviesCache.set(numId, saved);
        ToastView.show(`"${movieData.title}" agregada a Favoritos`, 'success');
      }

      this.updateNavbarBadges();
      this.syncUIButtons(numId);

      // Si estamos en la vista de favoritos, re-renderizar la grilla
      if (this.state.currentSection === 'favorites') {
        this.renderFavoritesView();
      }
    } catch (err) {
      ToastView.show(`Error: ${err.message}`, 'error');
    }
  }

  /**
   * Restaura una película en Favoritos tras presionar "Deshacer"
   */
  async restoreFavorite(movieData, movieId) {
    try {
      const numId = Number(movieId || (movieData && (movieData.movie_id || movieData.id)));
      let data = movieData || this.state.moviesCache.get(numId);
      if (!data) {
        data = await apiService.getMovieDetails(numId);
      }

      const payload = {
        movie_id: numId,
        title: data.title,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: data.release_date,
        vote_average: data.vote_average,
        overview: data.overview,
        genres: Array.isArray(data.genres) ? data.genres.map(g => g.name).join(', ') : (data.genres || '')
      };

      const res = await apiService.addFavorite(payload);
      const saved = res.favorite || payload;
      this.state.favorites.set(numId, saved);
      this.state.moviesCache.set(numId, saved);
      this.updateNavbarBadges();
      this.syncUIButtons(numId);

      if (this.state.currentSection === 'favorites') {
        this.renderFavoritesView();
      }

      ToastView.show(`"${data.title}" reincorporada a Favoritos`, 'success');
    } catch (err) {
      ToastView.show(`Error al restaurar: ${err.message}`, 'error');
    }
  }

  /**
   * Agrega o elimina una película de Mi Lista (Watchlist) en SQLite con soporte para Deshacer
   */
  async toggleWatchlist(movieId) {
    const numId = Number(movieId);
    const isCurrentlyInWatch = this.state.watchlist.has(numId);

    try {
      if (isCurrentlyInWatch) {
        // Guardar copia antes de eliminar
        const movieToRestore = this.state.watchlist.get(numId) || this.state.moviesCache.get(numId);
        const movieTitle = movieToRestore ? movieToRestore.title : 'Película';

        await apiService.removeWatchlist(numId);
        this.state.watchlist.delete(numId);

        ToastView.show(`"${movieTitle}" eliminada de Mi Lista`, 'warning', 5500, {
          text: 'Deshacer',
          onClick: () => this.restoreWatchlist(movieToRestore, numId)
        });
      } else {
        let movieData = this.state.moviesCache.get(numId);
        if (!movieData) {
          movieData = await apiService.getMovieDetails(numId);
        }

        const payload = {
          movie_id: numId,
          title: movieData.title,
          poster_path: movieData.poster_path,
          backdrop_path: movieData.backdrop_path,
          release_date: movieData.release_date,
          vote_average: movieData.vote_average,
          overview: movieData.overview,
          genres: Array.isArray(movieData.genres) ? movieData.genres.map(g => g.name).join(', ') : (movieData.genres || '')
        };

        const res = await apiService.addWatchlist(payload);
        const saved = res.watchlist || payload;
        this.state.watchlist.set(numId, saved);
        this.state.moviesCache.set(numId, saved);
        ToastView.show(`"${movieData.title}" guardada en Mi Lista`, 'success');
      }

      this.updateNavbarBadges();
      this.syncUIButtons(numId);

      if (this.state.currentSection === 'watchlist') {
        this.renderWatchlistView();
      }
    } catch (err) {
      ToastView.show(`Error: ${err.message}`, 'error');
    }
  }

  /**
   * Restaura una película en Watchlist tras presionar "Deshacer"
   */
  async restoreWatchlist(movieData, movieId) {
    try {
      const numId = Number(movieId || (movieData && (movieData.movie_id || movieData.id)));
      let data = movieData || this.state.moviesCache.get(numId);
      if (!data) {
        data = await apiService.getMovieDetails(numId);
      }

      const payload = {
        movie_id: numId,
        title: data.title,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: data.release_date,
        vote_average: data.vote_average,
        overview: data.overview,
        genres: Array.isArray(data.genres) ? data.genres.map(g => g.name).join(', ') : (data.genres || '')
      };

      const res = await apiService.addWatchlist(payload);
      const saved = res.watchlist || payload;
      this.state.watchlist.set(numId, saved);
      this.state.moviesCache.set(numId, saved);
      this.updateNavbarBadges();
      this.syncUIButtons(numId);

      if (this.state.currentSection === 'watchlist') {
        this.renderWatchlistView();
      }

      ToastView.show(`"${data.title}" reincorporada a Mi Lista`, 'success');
    } catch (err) {
      ToastView.show(`Error al restaurar: ${err.message}`, 'error');
    }
  }

  /**
   * Sincroniza el estado visual de los botones de favoritos y watchlist en toda la UI
   */
  syncUIButtons(movieId) {
    const numId = Number(movieId);
    const isFav = this.state.favorites.has(numId);
    const inWatch = this.state.watchlist.has(numId);

    // 1. Actualizar botones rápidos en tarjetas
    document.querySelectorAll(`.btn-quick-fav[data-movie-id="${numId}"]`).forEach(btn => {
      btn.classList.toggle('active', isFav);
      btn.title = isFav ? 'Quitar de Favoritos' : 'Agregar a Favoritos';
      btn.innerHTML = `<i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>`;
    });

    document.querySelectorAll(`.btn-quick-watch[data-movie-id="${numId}"]`).forEach(btn => {
      btn.classList.toggle('active', inWatch);
      btn.title = inWatch ? 'Quitar de Mi Lista' : 'Guardar en Mi Lista';
      btn.innerHTML = `<i class="bi ${inWatch ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}"></i>`;
    });

    // 2. Actualizar botones en el Hero Carousel
    document.querySelectorAll(`[data-hero-fav="${numId}"]`).forEach(btn => {
      btn.classList.toggle('active', isFav);
      btn.classList.toggle('text-danger', isFav);
      btn.innerHTML = `<i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i> <span>${isFav ? 'En Favoritos' : 'Favorito'}</span>`;
    });

    document.querySelectorAll(`[data-hero-watch="${numId}"]`).forEach(btn => {
      btn.classList.toggle('active', inWatch);
      btn.classList.toggle('text-warning', inWatch);
      btn.innerHTML = `<i class="bi ${inWatch ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}"></i> <span>${inWatch ? 'En Mi Lista' : 'Agregar a Mi Lista'}</span>`;
    });

    // 3. Si el modal está abierto para esta película, refrescar su contenido
    if (this.state.currentModalMovie && Number(this.state.currentModalMovie.id) === numId) {
      const modalContent = document.getElementById('modalContent');
      if (modalContent) {
        modalContent.innerHTML = DetailsModalView.renderContent(this.state.currentModalMovie, {
          isFavorite: isFav,
          inWatchlist: inWatch
        });
      }
    }
  }
}

// Instanciar e iniciar la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CineScopeApp();
  window.app.init();
});
