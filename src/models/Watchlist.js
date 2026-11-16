const db = require('./db');

class Watchlist {
  static getAll() {
    const stmt = db.prepare('SELECT movie_id AS id, movie_id, title, poster_path, backdrop_path, release_date, vote_average, overview, genres, created_at FROM watchlist ORDER BY created_at DESC');
    return stmt.all();
  }

  static getByMovieId(movieId) {
    const stmt = db.prepare('SELECT movie_id AS id, movie_id, title, poster_path, backdrop_path, release_date, vote_average, overview, genres, created_at FROM watchlist WHERE movie_id = ?');
    const result = stmt.all(Number(movieId));
    return result.length > 0 ? result[0] : null;
  }

  static create(data) {
    const {
      movie_id,
      title,
      poster_path = '',
      backdrop_path = '',
      release_date = '',
      vote_average = 0,
      overview = '',
      genres = ''
    } = data;

    const stmt = db.prepare(`
      INSERT INTO watchlist (
        movie_id, title, poster_path, backdrop_path, release_date, vote_average, overview, genres
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(movie_id) DO UPDATE SET
        title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        release_date = excluded.release_date,
        vote_average = excluded.vote_average,
        overview = excluded.overview,
        genres = excluded.genres
    `);

    stmt.run(
      Number(movie_id),
      title,
      poster_path,
      backdrop_path,
      release_date,
      Number(vote_average) || 0,
      overview,
      typeof genres === 'object' ? JSON.stringify(genres) : String(genres || '')
    );

    return this.getByMovieId(movie_id);
  }

  static delete(movieId) {
    const stmt = db.prepare('DELETE FROM watchlist WHERE movie_id = ?');
    stmt.run(Number(movieId));
    return { success: true, movie_id: Number(movieId) };
  }

  static exists(movieId) {
    const stmt = db.prepare('SELECT 1 FROM watchlist WHERE movie_id = ? LIMIT 1');
    return stmt.all(Number(movieId)).length > 0;
  }
}

module.exports = Watchlist;
