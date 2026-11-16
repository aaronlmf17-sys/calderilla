/* Aplica el tema (claro/oscuro) antes de pintar nada, para que no haya parpadeo al abrir. */
(function () {
  var dark = false;
  try {
    var t = localStorage.getItem('calderilla.theme') || 'auto';
    dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
