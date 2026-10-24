import { setupPWA } from './pwa';
import './style.css';
const path = window.location.pathname.replace(/\/+$/, '') || '/';
if (path === '/algorithm-comparison') {
  await import('./algorithm-comparison');
} else if (path === '/') {
  await import('./home');
} else {
  document.querySelector('#app')!.innerHTML = '<main><h1>Page not found</h1><a href="/">Back to the board builder</a></main>';
}

setupPWA();
