require('dotenv').config();

const config = {
  get port() {
    return process.env.PORT || 3000;
  },
  tmdb: {
    get apiKey() {
      // Recargar dotenv para detectar cambios en caliente en el archivo .env
      require('dotenv').config();
      return (process.env.TMDB_API_KEY || '').trim();
    },
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
    posterSize: 'w500',
    backdropSize: 'original',
    profileSize: 'w185'
  },
  isTmdbConfigured: () => {
    require('dotenv').config();
    const key = (process.env.TMDB_API_KEY || '').trim();
    return !!key && key !== '' && key !== 'tu_api_key_de_tmdb_aqui';
  }
};

module.exports = config;
