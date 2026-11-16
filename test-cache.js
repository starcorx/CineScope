
const assert = require('node:assert/strict');
const TMDBService = require('./src/services/tmdbService');

async function testCache() {
  const service = TMDBService;

  // Limpiar caché para comenzar desde cero
  service.cache.clear();

  const key = 'test-cinescope';
  const data = { results: [{ id: 1, title: 'Inception' }] };

  // Primera prueba: almacenar información
  service.setCached(key, data);

  assert.deepEqual(service.getCached(key), data);
  console.log('OK: La caché almacena y recupera datos.');

  // Segunda prueba: modificar el original
  data.results[0].title = 'Modificada';

  assert.equal(
    service.getCached(key).results[0].title,
    'Inception'
  );
  console.log('OK: La caché protege los datos almacenados.');

  // Tercera prueba: comprobar expiración
  service.cache.set(key, {
    data: { expired: true },
    expiresAt: Date.now() - 1000
  });

  assert.equal(service.getCached(key), null);
  console.log('OK: La caché elimina datos vencidos.');

  // Cuarta prueba: comprobar límite de almacenamiento
  service.cache.clear();
  service.maxCacheEntries = 2;

  service.setCached('uno', { value: 1 });
  service.setCached('dos', { value: 2 });
  service.setCached('tres', { value: 3 });

  assert.equal(service.cache.size, 2);
  assert.equal(service.cache.has('uno'), false);

  console.log('OK: Se respeta el límite de almacenamiento.');

  console.log('\nTodas las pruebas de caché finalizaron correctamente.');
}

testCache().catch(error => {
  console.error('ERROR EN LAS PRUEBAS:', error);
  process.exitCode = 1;
});
