export function navbar(comparison: boolean) {
  return `<header><a class="brand" href="/">=^･ω･^= &nbsp; MEOWDOKU</a><nav aria-label="Main navigation"><a href="/" ${comparison?'':'aria-current="page"'}>Board builder</a><a href="/algorithm-comparison" ${comparison?'aria-current="page"':''}>Compare solvers</a><button id="install-app" class="install-button" aria-label="Install Meowdoku app"><span aria-hidden="true">⇩</span> Install app</button></nav></header>
  <dialog id="install-help" aria-labelledby="install-title"><h2 id="install-title">Take Meowdoku with you</h2><p id="install-message"></p><p id="offline-status" role="status">Preparing offline access…</p><form method="dialog"><button class="primary">Got it</button></form></dialog>`;
}
