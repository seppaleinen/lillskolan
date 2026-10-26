import { LESSON_ORIGIN } from './config';

// The lesson iframe is static in index.html (curl-verifiable scaffold).
// #4 will replace this with a real lesson grid + iframe host.
const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <h1>Lillskolan</h1>
    <p>Välkommen till Lillskolan.</p>
    <a href="${LESSON_ORIGIN}" target="_blank">Öppna lektion</a>
  `;
}
