"use strict";
const CACHE_NAME = "mapcarbon-v2.1.0";
const APP_ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./README.md", "./THIRD_PARTY_NOTICES.md", "./docs/TT31-IMPLEMENTATION.md"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Không cache/prefetch tile OSM hoặc tài nguyên ngoài origin.
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.status === 200) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
