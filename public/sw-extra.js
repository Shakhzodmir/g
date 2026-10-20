/*
 * Extra service-worker code, pulled into the generated sw.js with importScripts (vite.config.ts → workbox.importScripts).
 *
 * Deep links that are not the app: with the service worker installed, ANY navigation inside the scope was answered with
 * index.html. For /g/foo/ or /g/foo/bar the page then asked for ./assets/... relative to that deeper directory and
 * rendered blank. Anything below the scope root (that is not a file) is sent back to the scope root instead, which is
 * the app; the #hash route is kept by the browser across the redirect. Plain ES5 on purpose: old WebViews.
 */
self.addEventListener('fetch', function (event) {
  var req = event.request
  if (req.mode !== 'navigate') return
  var url = new URL(req.url)
  var scope = new URL(self.registration.scope)
  if (url.origin !== scope.origin) return
  if (url.pathname.indexOf(scope.pathname) !== 0) return
  // the scope root itself and its index.html are the app
  if (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html') return
  // real files (manifest, images...) are left alone
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return
  event.respondWith(Response.redirect(scope.href + url.search, 302))
})
