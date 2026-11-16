/**
 * CineScope - DetailsModal View
 * Renderiza el modal de información extendida de una película
 */
const DetailsModalView = {
  renderContent(movie, { isFavorite = false, inWatchlist = false } = {}) {
    const movieId = movie.id;
    const title = movie.title || 'Detalles de la Película';
    const originalTitle = movie.original_title && movie.original_title !== title ? `(${movie.original_title})` : '';
    const tagline = movie.tagline ? `<p class="fst-italic text-secondary mb-3">"${movie.tagline}"</p>` : '';
    const backdrop = movie.backdrop_path || movie.poster_path || '';
    const poster = movie.poster_path || MovieCardView.defaultPoster;
    const rating = typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : 'N/A';
    const votes = movie.vote_count ? movie.vote_count.toLocaleString() : '0';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'S/F';
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'No disponible';
    const overview = movie.overview || 'Sinopsis no disponible en este momento.';
    const director = movie.director || 'No especificado';

    // Generar etiquetas de géneros
    const genresHtml = (movie.genres || []).map(g => `
      <span class="badge bg-dark border border-secondary text-light px-2 py-1 me-1 mb-1">${g.name}</span>
    `).join('') || '<span class="text-secondary">Sin clasificar</span>';

    // Generar tarjetas de reparto
    const castHtml = (movie.cast || []).map(actor => {
      const actorImg = actor.profile_path || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2264%22%20height%3D%2264%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22%23232b3e%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2238%22%20fill%3D%22%23fff%22%20font-size%3D%2214%22%3E👤%3C%2Ftext%3E%3C%2Fsvg%3E';
      return `
        <div class="cast-card">
          <img src="${actorImg}" alt="${actor.name}" class="cast-img" onerror="this.src='${MovieCardView.defaultPoster}'"/>
          <p class="cast-name" title="${actor.name}">${actor.name}</p>
          <p class="cast-character" title="${actor.character}">${actor.character || 'Personaje'}</p>
        </div>
      `;
    }).join('') || '<p class="text-secondary small">Información de reparto no disponible.</p>';

    // Trailer de YouTube
    let trailerHtml = '';
    if (movie.trailer_key) {
      trailerHtml = `
        <div class="mt-4">
          <h6 class="fw-bold mb-2 text-light"><i class="bi bi-youtube text-danger me-2"></i>Tráiler Oficial</h6>
          <div class="trailer-container">
            <iframe 
              src="https://www.youtube.com/embed/${movie.trailer_key}?rel=0&modestbranding=1" 
              title="${title} Tráiler" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    }

    return `
      <div class="modal-backdrop-header" style="background-image: url('${backdrop}');">
        <div class="modal-backdrop-overlay"></div>
        <button type="button" class="btn-close-modal" data-bs-dismiss="modal" aria-label="Cerrar">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="modal-body-content">
        <div class="row">
          <!-- Columna Izquierda: Póster y Metadatos -->
          <div class="col-md-4 modal-poster-col mb-4 mb-md-0">
            <img src="${poster}" alt="${title}" class="modal-poster-img mb-3" />
            
            <div class="d-grid gap-2">
              <button 
                class="btn-cinema-primary ${isFavorite ? 'active' : ''}" 
                onclick="app.toggleFavorite(${movieId}, true)"
              >
                <i class="bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}"></i>
                ${isFavorite ? 'En Favoritos' : 'Agregar a Favoritos'}
              </button>
              <button 
                class="btn-cinema-secondary ${inWatchlist ? 'active text-warning' : ''}" 
                onclick="app.toggleWatchlist(${movieId}, true)"
              >
                <i class="bi ${inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}"></i>
                ${inWatchlist ? 'En Mi Lista' : 'Guardar en Mi Lista'}
              </button>
            </div>

            <div class="mt-3 p-3 rounded bg-dark border border-secondary">
              <div class="d-flex justify-content-between mb-2 small">
                <span class="text-secondary">Director:</span>
                <span class="fw-semibold text-light text-end">${director}</span>
              </div>
              <div class="d-flex justify-content-between mb-2 small">
                <span class="text-secondary">Duración:</span>
                <span class="fw-semibold text-light">${runtime}</span>
              </div>
              <div class="d-flex justify-content-between mb-2 small">
                <span class="text-secondary">Estreno:</span>
                <span class="fw-semibold text-light">${movie.release_date || 'N/D'}</span>
              </div>
              <div class="d-flex justify-content-between small">
                <span class="text-secondary">Votos:</span>
                <span class="fw-semibold text-light">${votes}</span>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Sinopsis, Géneros, Reparto y Trailer -->
          <div class="col-md-8">
            <h2 class="fw-bold mb-1">${title}</h2>
            <div class="d-flex align-items-center gap-2 mb-2 text-secondary small">
              <span>${year}</span>
              <span>•</span>
              <span class="text-warning fw-bold"><i class="bi bi-star-fill me-1"></i>${rating} / 10</span>
              <span>•</span>
              <span>${runtime}</span>
            </div>

            ${tagline}

            <div class="mb-3">
              ${genresHtml}
            </div>

            <h6 class="fw-bold text-light mb-2"><i class="bi bi-file-text me-2 text-danger"></i>Sinopsis</h6>
            <p class="text-light-subtle mb-4" style="line-height: 1.6;">${overview}</p>

            <h6 class="fw-bold text-light mb-2"><i class="bi bi-people-fill me-2 text-danger"></i>Reparto Principal</h6>
            <div class="cast-list mb-3">
              ${castHtml}
            </div>

            ${trailerHtml}
          </div>
        </div>
      </div>
    `;
  }
};

window.DetailsModalView = DetailsModalView;
