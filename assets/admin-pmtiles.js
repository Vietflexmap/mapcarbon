import { PMTiles } from 'https://cdn.jsdelivr.net/npm/pmtiles@4.3.0/+esm';
import { VectorTile } from 'https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@2.0.4/+esm';
import Pbf from 'https://cdn.jsdelivr.net/npm/pbf@4.0.1/+esm';

const L = window.Vietflex;
if (!L) throw new Error('Vietflex Map chưa được nạp.');

const CONFIG = Object.freeze({
  sourceLayer: 'admin',
  minDataZoom: 4,
  maxDataZoom: 9,
  wardMinDisplayZoom: 7,
  tileSize: 256,
  cacheName: 'carbonvn-anhmap-pmtiles-v1',
  vietnamBounds: [[7.180931, 102.143914], [23.392643, 117.835457]]
});

class MemorySource {
  constructor(bytes, key = 'memory://carbonvn-admin') {
    this.bytes = bytes;
    this.key = `${key}-${bytes.byteLength}`;
  }
  getKey() { return this.key; }
  async getBytes(offset, length) {
    const view = this.bytes.subarray(offset, offset + length);
    return { data: view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) };
  }
}

async function loadArchive(url) {
  let response;
  if ('caches' in window) {
    const cache = await caches.open(CONFIG.cacheName);
    response = await cache.match(url);
    if (!response) {
      response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`PMTiles HTTP ${response.status}`);
      await cache.put(url, response.clone());
    }
  } else {
    response = await fetch(url);
    if (!response.ok) throw new Error(`PMTiles HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 100 || String.fromCharCode(...bytes.slice(0, 7)) !== 'PMTiles') {
    throw new Error('Archive hành chính không phải PMTiles hợp lệ.');
  }
  return new PMTiles(new MemorySource(bytes, url));
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x, yi = ring[i].y;
    const xj = ring[j].x, yj = ring[j].y;
    const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function pointInFeature(x, y, geometry) {
  let inside = false;
  for (const ring of geometry || []) if (ring.length >= 3 && pointInRing(x, y, ring)) inside = !inside;
  return inside;
}

function lonLatToTilePoint(lng, lat, z, extent) {
  const n = 2 ** z;
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin(safeLat * Math.PI / 180);
  const wx = (lng + 180) / 360 * n;
  const wy = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n;
  const tx = Math.floor(wx), ty = Math.floor(wy);
  return { x: (wx - tx) * extent, y: (wy - ty) * extent, tx, ty };
}

const BoundaryLayer = L.GridLayer.extend({
  initialize(url, options = {}) {
    L.setOptions(this, { tileSize: CONFIG.tileSize, minZoom: 4, maxZoom: 19, noWrap: true, bounds: CONFIG.vietnamBounds, ...options });
    this.archivePromise = loadArchive(url);
    this.decodedTiles = new Map();
    this.selectedIds = new Set();
    this.showProvince = options.showProvince !== false;
    this.showWard = options.showWard !== false;
  },

  createTile(coords, done) {
    const tile = document.createElement('canvas');
    tile.className = 'vietflex-admin-pmtiles-tile';
    const size = this.getTileSize();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    tile.width = size.x * ratio;
    tile.height = size.y * ratio;
    tile.style.width = `${size.x}px`;
    tile.style.height = `${size.y}px`;
    tile.setAttribute('role', 'presentation');
    const ctx = tile.getContext('2d');
    ctx.scale(ratio, ratio);
    const address = this._nativeAddress(coords);
    this._getDecodedTile(address.z, address.x, address.y)
      .then(features => { this._paint(ctx, size.x, features, address); done(null, tile); })
      .catch(error => done(error, tile));
    return tile;
  },

  _nativeAddress(coords) {
    const z = Math.min(Math.max(coords.z, CONFIG.minDataZoom), CONFIG.maxDataZoom);
    const diff = Math.max(0, coords.z - z);
    const factor = 2 ** diff;
    const x = Math.floor(coords.x / factor), y = Math.floor(coords.y / factor);
    return { z, x, y, factor, displayZoom: coords.z, offsetX: coords.x - x * factor, offsetY: coords.y - y * factor };
  },

  _getDecodedTile(z, x, y) {
    const key = `${z}/${x}/${y}`;
    if (!this.decodedTiles.has(key)) {
      this.decodedTiles.set(key, this.archivePromise.then(archive => archive.getZxy(z, x, y)).then(result => {
        if (!result) return [];
        const vectorTile = new VectorTile(new Pbf(new Uint8Array(result.data)));
        const layer = vectorTile.layers[CONFIG.sourceLayer];
        if (!layer) return [];
        const features = [];
        for (let i = 0; i < layer.length; i++) {
          const feature = layer.feature(i);
          if (feature.type !== 3) continue;
          features.push({ properties: feature.properties || {}, geometry: feature.loadGeometry(), extent: layer.extent || 4096 });
        }
        return features;
      }));
    }
    return this.decodedTiles.get(key);
  },

  _paint(ctx, size, features, address) {
    for (const feature of features) {
      const p = feature.properties || {};
      const province = p.level === 'province';
      if (province && !this.showProvince) continue;
      if (!province && (!this.showWard || address.displayZoom < CONFIG.wardMinDisplayZoom)) continue;
      const selected = this.selectedIds.has(String(p.id));
      const scale = address.factor;
      ctx.beginPath();
      for (const ring of feature.geometry) {
        if (!ring.length) continue;
        ring.forEach((point, i) => {
          const x = (point.x / feature.extent * scale - address.offsetX) * size;
          const y = (point.y / feature.extent * scale - address.offsetY) * size;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      if (selected || province) {
        ctx.fillStyle = selected ? 'rgba(255,224,72,.42)' : 'rgba(99,179,255,.045)';
        ctx.fill('evenodd');
      }
      ctx.strokeStyle = selected ? '#ffe048' : province ? '#63b3ff' : '#7bd0ff';
      ctx.lineWidth = selected ? 2.8 : province ? 1.5 : 0.8;
      ctx.globalAlpha = selected ? 1 : 0.88;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  setVisibility({ province = this.showProvince, ward = this.showWard } = {}) {
    this.showProvince = province;
    this.showWard = ward;
    return this.redraw();
  },

  setSelectedIds(ids = []) {
    this.selectedIds = new Set(ids.map(String));
    return this.redraw();
  },

  async query(latlng, displayZoom = 9) {
    const z = Math.min(Math.max(Math.round(displayZoom), CONFIG.minDataZoom), CONFIG.maxDataZoom);
    const probe = lonLatToTilePoint(latlng.lng, latlng.lat, z, 4096);
    const features = await this._getDecodedTile(z, probe.tx, probe.ty);
    const hits = [];
    for (const feature of features) {
      const extent = feature.extent || 4096;
      const pt = extent === 4096 ? probe : lonLatToTilePoint(latlng.lng, latlng.lat, z, extent);
      if (pointInFeature(pt.x, pt.y, feature.geometry)) hits.push(feature.properties || {});
    }
    hits.sort((a, b) => (a.level === 'province') - (b.level === 'province'));
    return hits;
  },

  getAttribution() { return 'Ranh giới hành chính: Vietflexmap/anhmap'; }
});

window.CarbonAdminPMTiles = {
  CONFIG,
  createLayer(url, options) { return new BoundaryLayer(url, options); }
};
window.dispatchEvent(new CustomEvent('carbon-admin-pmtiles-ready'));
