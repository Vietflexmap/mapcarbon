"use strict";
const CACHE_NAME = "mapcarbon-v2.4.0";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./README.md",
  "./THIRD_PARTY_NOTICES.md",
  "./docs/TT31-IMPLEMENTATION.md",
  "./docs/ADMIN-PMTILES.md",
  "./assets/app.js",
  "./assets/admin-pmtiles.js",
  "./data/admin-data.json",
  "./data/anhmap-source.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("mapcarbon-") && k !== CACHE_NAME && !k.startsWith("carbonvn-")).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Không cache/prefetch tile OSM công cộng.
  if (url.hostname === "tile.openstreetmap.org") return;

  // PMTiles hành chính do assets/admin-pmtiles.js quản lý trong cache theo source_commit.
  if (url.origin === self.location.origin && url.pathname.endsWith("/data/vietnam-admin.pmtiles")) return;

  // Provenance + chỉ mục hành chính: network-first để nhận bản sync mới, fallback cache khi offline.
  if (url.origin === self.location.origin && (url.pathname.endsWith("/data/anhmap-source.json") || url.pathname.endsWith("/data/admin-data.json"))) {
    event.respondWith(fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(hit => hit || caches.match(url.pathname.split('/').pop()))));
    return;
  }

  // Same-origin app shell: cache-first, tự bổ sung file chưa có sau lần tải đầu.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    })));
    return;
  }

  // CDN thư viện: network-first và runtime-cache để tái dùng offline nếu trình duyệt cho phép.
  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
  }
});
