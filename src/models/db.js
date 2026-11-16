const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Asegurar que exista el directorio para la base de datos
const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cinescope.sqlite');
const db = new DatabaseSync(dbPath);

// Configuración de rendimiento y llaves foráneas
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Inicialización de tablas para persistencia de Favoritos y Watchlist (Mi Lista)
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    vote_average REAL DEFAULT 0,
    overview TEXT,
    genres TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    vote_average REAL DEFAULT 0,
    overview TEXT,
    genres TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
