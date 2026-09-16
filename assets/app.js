const $ = (s) => document.querySelector(s);
const fmt = (n, digits = 2) => Number.isFinite(+n)
  ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(+n)
  : '—';
const compact = (n) => Number.isFinite(+n)
  ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 2 }).format(+n)
  : '—';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const CFG = {
  carbon: './data/co2-34.json',
  admin: {
    meta: './data/admin-data.json',
    pmtiles: './data/vietnam-admin.pmtiles',
    source: './data/anhmap-source.json'
  },
  openmapBasePath: 'https://vietflexmap.github.io/openmap/'
};

let map;
let carbonData = null;
let carbonLayer = null;
let labelLayer = null;
let adminLayer = null;
let adminSource = null;
let adminRecords = [];
let provinceNames = [];
let selectedProvinceName = '';
let selectedWardId = '';

const normalizeVN = (v) => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/\b(thanh pho|tinh|tp\.?)\b/g, '')
  .replace(/[._-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const aliasNorm = (v) => {
  const n = normalizeVN(v);
  if (['hcm', 'ho chi minh', 'tp hcm'].includes(n)) return 'ho chi minh';
  if (['thua thien hue', 'hue'].includes(n)) return 'hue';
  return n;
};

function setNetworkStatus() {
  const el = $('#netStatus');
  el.textContent = navigator.onLine ? 'Online' : 'Offline / cache';
  el.classList.toggle('offline', !navigator.onLine);
}
window.addEventListener('online', setNetworkStatus);
window.addEventListener('offline', setNetworkStatus);
setNetworkStatus();

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

function carbonProvinceFromAdmin(name) {
  if (!carbonData) return null;
  const needle = aliasNorm(name);
  return carbonData.provinces.find(p => aliasNorm(p.province) === needle) || null;
}

function bboxAreaKm2(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return 0;
  const [w, s, e, n] = bbox.map(Number);
  if (![w, s, e, n].every(Number.isFinite) || e <= w || n <= s) return 0;
  const R = 6371.0088;
  const dLon = Math.abs(e - w) * Math.PI / 180;
  const sinDelta = Math.abs(Math.sin(n * Math.PI / 180) - Math.sin(s * Math.PI / 180));
  return R * R * dLon * sinDelta;
}

function bboxOf(records) {
  const boxes = records.map(r => r.bbox).filter(b => Array.isArray(b) && b.length === 4).map(b => b.map(Number));
  if (!boxes.length) return null;
  return [
    Math.min(...boxes.map(b => b[0])),
    Math.min(...boxes.map(b => b[1])),
    Math.max(...boxes.map(b => b[2])),
    Math.max(...boxes.map(b => b[3]))
  ];
}

function centerOfBbox(b) {
  if (!Array.isArray(b) || b.length !== 4) return null;
  const [w, s, e, n] = b.map(Number);
  return [(s + n) / 2, (w + e) / 2];
}

function recordsOfProvince(name) {
  return adminRecords.filter(r => r.province === name);
}

function carbonColor(value) {
  if (!carbonData) return '#4b8a68';
  const values = carbonData.provinces.map(p => +p.normalized_index).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return '#4b8a68';
  const q = (pct) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * pct))];
  if (value <= q(.2)) return '#2e8b57';
  if (value <= q(.4)) return '#75a948';
  if (value <= q(.6)) return '#c7a936';
  if (value <= q(.8)) return '#d87832';
  return '#b33d45';
}

function bubbleRadius(value) {
  const vals = carbonData.provinces.map(p => +p.normalized_index).filter(Number.isFinite);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi <= lo) return 9;
  return 6 + 8 * Math.sqrt(Math.max(0, Math.min(1, (value - lo) / (hi - lo))));
}

function htmlBars(items, valueKey = 'total', maxRows = 8) {
  const rows = [...items].sort((a, b) => (+b[valueKey] || 0) - (+a[valueKey] || 0)).slice(0, maxRows);
  const max = Math.max(1, ...rows.map(x => +x[valueKey] || 0));
  return `<div class="mini-bars">${rows.map(x => `
    <div class="mini-row">
      <span title="${esc(x.name)}">${esc(x.name)}</span>
      <div class="mini-track" title="${esc(x.name)}: ${esc(fmt(x[valueKey]))}">
        <div class="mini-fill" style="width:${Math.max(2, (+x[valueKey] || 0) / max * 100)}%"></div>
      </div>
    </div>`).join('')}</div>`;
}

function provincePopup(p) {
  return `<div class="carbon-popup">
    <h3>${esc(p.province)}</h3>
    <div class="popup-badge">Quy đổi hành chính 63 → 34</div>
    <div class="popup-grid">
      <span>TongCO2</span><b>${esc(fmt(p.total_co2))}</b>
      <span>Dientich nguồn</span><b>${esc(fmt(p.area_source))}</b>
      <span>Chỉ số chuẩn hóa</span><b>${esc(fmt(p.normalized_index, 4))}</b>
      <span>Cấu phần tỉnh cũ</span><b>${p.components.length}</b>
    </div>
    ${htmlBars(p.components, 'total', 6)}
    <div class="popup-formula">Index = ΣTongCO2 / ΣDientich × 10.000</div>
    <div class="popup-note">Biểu đồ là cơ cấu TongCO2 của các tỉnh cũ hợp thành. Đơn vị CO₂ của KML chưa được xác nhận; không diễn giải thành ppm hoặc CO₂/tháng.</div>
  </div>`;
}

function wardEstimate(record) {
  const p = carbonProvinceFromAdmin(record.province);
  if (!p) return null;
  const siblings = recordsOfProvince(record.province);
  const weights = siblings.map(r => bboxAreaKm2(r.bbox));
  const sumWeight = weights.reduce((a, b) => a + b, 0);
  let weight = bboxAreaKm2(record.bbox);
  let share;
  let method;
  if (sumWeight > 0 && weight > 0) {
    share = weight / sumWeight;
    method = 'bbox-area-proxy';
  } else {
    share = siblings.length ? 1 / siblings.length : 0;
    method = 'equal-share-fallback';
    weight = 0;
  }
  return {
    province: p,
    share,
    proxy_bbox_km2: weight,
    source_area_est: p.area_source * share,
    total_est: p.total_co2 * share,
    normalized_index: p.normalized_index,
    method
  };
}

function wardPopup(record, est) {
  const title = `${record.type || ''} ${record.name || ''}`.trim();
  const sharePct = est ? est.share * 100 : 0;
  return `<div class="carbon-popup">
    <h3>${esc(title)}</h3>
    <div class="popup-badge">Ước tính cấp xã hiện hành · proxy</div>
    <div class="popup-grid">
      <span>Tỉnh/thành</span><b>${esc(record.province || '')}</b>
      <span>TongCO2 ước tính</span><b>${esc(est ? fmt(est.total_est) : '—')}</b>
      <span>Tỷ trọng proxy</span><b>${esc(est ? fmt(sharePct, 4) + '%' : '—')}</b>
      <span>Diện tích bbox proxy</span><b>${esc(est ? fmt(est.proxy_bbox_km2) + ' km²' : '—')}</b>
      <span>Chỉ số tỉnh tham chiếu</span><b>${esc(est ? fmt(est.normalized_index, 4) : '—')}</b>
    </div>
    <div class="mini-bars">
      <div class="mini-row"><span>Đơn vị</span><div class="mini-track"><div class="mini-fill" style="width:${Math.max(1, Math.min(100, sharePct))}%"></div></div></div>
      <div class="mini-row"><span>Phần còn lại</span><div class="mini-track"><div class="mini-fill" style="width:${Math.max(1, 100 - Math.min(100, sharePct))}%"></div></div></div>
    </div>
    <div class="popup-formula">CO₂_đơn_vị ≈ CO₂_tỉnh × A_bbox_đơn_vị / ΣA_bbox_trong_tỉnh</div>
    <div class="popup-note">Đây là phân bổ mô hình để drill-down tới 3.321 xã/phường/đặc khu, không phải trạm đo tại địa phương. Muốn kiểm kê chính thức cần crosswalk hình học và metadata đơn vị/phương pháp.</div>
  </div>`;
}

function chartRows(items, labelKey, valueKey, maxRows = 10) {
  const rows = [...items].sort((a, b) => (+b[valueKey] || 0) - (+a[valueKey] || 0)).slice(0, maxRows);
  const max = Math.max(1, ...rows.map(x => +x[valueKey] || 0));
  return rows.map(x => `<div class="chart-row">
    <div class="chart-label" title="${esc(x[labelKey])}">${esc(x[labelKey])}</div>
    <div class="bar-track"><div class="bar" style="width:${Math.max(1.5, (+x[valueKey] || 0) / max * 100)}%"></div></div>
    <div class="chart-value">${esc(compact(x[valueKey]))}</div>
  </div>`).join('');
}

function setNationalPanel() {
  if (!carbonData) return;
  selectedProvinceName = '';
  selectedWardId = '';
  $('#selectedTitle').textContent = 'Việt Nam';
  $('#selectedBadge').textContent = 'Tổng hợp 34 tỉnh/thành';
  $('#selTotal').textContent = fmt(carbonData.national.total_co2);
  $('#selArea').textContent = fmt(carbonData.national.area_source);
  $('#selIndex').textContent = fmt(carbonData.national.normalized_index, 4);
  $('#selectedDescription').innerHTML = 'Tổng cấp quốc gia được tính lại từ <b>63 bản ghi tỉnh/thành cũ</b> trong KML. Không cộng thêm các bản ghi huyện/xã để tránh đếm trùng.';
  $('#detailChart').innerHTML = chartRows(carbonData.provinces, 'province', 'total_co2', 10);
  $('#formulaBox').innerHTML = `<div class="formula">NationalIndex = Σ TongCO2₍34₎ / Σ Dientich₍34₎ × 10.000</div>
    <div class="formula-caption">Mỗi tỉnh mới đã được cộng từ đúng các tỉnh cũ cấu thành; sau đó chỉ số được tính lại theo tổng, không lấy trung bình đơn giản.</div>`;
}

function selectProvince(p, openPopup = false) {
  if (!p) return;
  selectedProvinceName = p.province;
  selectedWardId = '';
  $('#selectedTitle').textContent = p.province;
  $('#selectedBadge').textContent = p.components.length > 1 ? `Quy đổi từ ${p.components.length} tỉnh/thành cũ` : 'Giữ nguyên địa giới cấp tỉnh';
  $('#selTotal').textContent = fmt(p.total_co2);
  $('#selArea').textContent = fmt(p.area_source);
  $('#selIndex').textContent = fmt(p.normalized_index, 4);
  $('#selectedDescription').textContent = `${p.province}: TongCO2 và Dientich được cộng từ ${p.source_provinces.join(', ')}.`;
  $('#detailChart').innerHTML = chartRows(p.components, 'name', 'total', 10);
  $('#formulaBox').innerHTML = `<div class="formula">Index₍${esc(p.province)}₎ = ${esc(compact(p.total_co2))} / ${esc(compact(p.area_source))} × 10.000 = ${esc(fmt(p.normalized_index, 4))}</div>
    <div class="formula-caption">TongCO2 mới = Σ TongCO2 các tỉnh cũ; Dientich mới = Σ Dientich các tỉnh cũ.</div>`;
  renderLabels();

  const adminName = provinceNames.find(n => aliasNorm(n) === aliasNorm(p.province));
  if (adminName && $('#provinceSelect').value !== adminName) {
    $('#provinceSelect').value = adminName;
    populateWards();
  }

  if (openPopup && map) {
    const marker = carbonLayer && carbonLayer._layers
      ? Object.values(carbonLayer._layers).find(l => l.__province === p.province)
      : null;
    if (marker && marker.openPopup) marker.openPopup();
  }
}

function selectWard(record, latlng = null, openPopup = true) {
  if (!record) return;
  const est = wardEstimate(record);
  selectedProvinceName = record.province;
  selectedWardId = String(record.id);
  const title = `${record.type || ''} ${record.name || ''}`.trim();
  $('#selectedTitle').textContent = title;
  $('#selectedBadge').textContent = 'Ước tính proxy cấp xã hiện hành';
  $('#selTotal').textContent = est ? fmt(est.total_est) : '—';
  $('#selArea').textContent = est ? `${fmt(est.source_area_est)} (phân bổ nguồn)` : '—';
  $('#selIndex').textContent = est ? `${fmt(est.normalized_index, 4)} (tham chiếu tỉnh)` : '—';
  $('#selectedDescription').innerHTML = est
    ? `Tỷ trọng proxy <b>${fmt(est.share * 100, 4)}%</b> được suy ra từ diện tích bbox của đơn vị so với tổng bbox trong ${esc(record.province)}.`
    : 'Không tìm được bản ghi CO₂ cấp tỉnh tương ứng.';
  $('#detailChart').innerHTML = est ? `
    <div class="chart-row"><div class="chart-label">Đơn vị</div><div class="bar-track"><div class="bar" style="width:${Math.max(1, est.share * 100)}%"></div></div><div class="chart-value">${fmt(est.share * 100, 3)}%</div></div>
    <div class="chart-row"><div class="chart-label">Còn lại tỉnh</div><div class="bar-track"><div class="bar" style="width:${Math.max(1, (1-est.share) * 100)}%"></div></div><div class="chart-value">${fmt((1-est.share) * 100, 3)}%</div></div>` : '';
  $('#formulaBox').innerHTML = `<div class="formula">CO₂₍đơn vị₎ ≈ CO₂₍tỉnh₎ × A_bbox₍đơn vị₎ / ΣA_bbox₍tỉnh₎</div>
    <div class="formula-caption">Để bảo toàn tổng, Dientich nguồn của tỉnh cũng được phân bổ theo cùng tỷ trọng. Đây là mô hình drill-down, không thay cho phép đo/kiểm kê địa phương.</div>`;

  if (adminLayer && adminLayer.setSelectedIds) adminLayer.setSelectedIds([record.id]);
  renderLabels();

  if ($('#provinceSelect').value !== record.province) {
    $('#provinceSelect').value = record.province;
    populateWards();
  }
  $('#wardSelect').value = String(record.id);

  if (openPopup && map && est) {
    const center = latlng || centerOfBbox(record.bbox);
    if (center) {
      Vietflex.popup({ maxWidth: 330 })
        .setLatLng(center)
        .setContent(wardPopup(record, est))
        .openOn(map);
    }
  }
}

function renderCarbon() {
  if (!map || !carbonData) return;
  if (carbonLayer && map.hasLayer && map.hasLayer(carbonLayer)) map.removeLayer(carbonLayer);
  carbonLayer = new Vietflex.LayerGroup();

  for (const p of carbonData.provinces) {
    const [lon, lat] = p.center;
    const marker = Vietflex.circleMarker([lat, lon], {
      radius: bubbleRadius(+p.normalized_index),
      color: '#ffffff',
      weight: 1.4,
      fillColor: carbonColor(+p.normalized_index),
      fillOpacity: .88
    });
    marker.__province = p.province;
    marker.bindPopup(provincePopup(p), { maxWidth: 340 });
    marker.on('click', () => selectProvince(p));
    marker.addTo(carbonLayer);
  }

  if ($('#toggleCarbon').checked) carbonLayer.addTo(map);
  renderLabels();
}

function renderLabels() {
  if (!map || !carbonData) return;
  if (labelLayer && map.hasLayer && map.hasLayer(labelLayer)) map.removeLayer(labelLayer);
  labelLayer = null;
  if (!$('#toggleLabels').checked) return;
  labelLayer = new Vietflex.LayerGroup();
  const z = map.getZoom ? map.getZoom() : 5;
  for (const p of carbonData.provinces) {
    if (z < 5.4 && p.components.length === 1 && p.province !== selectedProvinceName) continue;
    const [lon, lat] = p.center;
    const selected = aliasNorm(p.province) === aliasNorm(selectedProvinceName);
    const icon = new Vietflex.DivIcon({
      className: 'admin-label-icon',
      html: `<span class="admin-map-label${selected ? ' selected' : ''}">${esc(p.province)}</span>`
    });
    new Vietflex.Marker([lat, lon], { interactive: false, keyboard: false, icon }).addTo(labelLayer);
  }
  labelLayer.addTo(map);
}

function refreshAdminVisibility() {
  if (!adminLayer || !map) return;
  const showProvince = $('#toggleProvince').checked;
  const showWard = $('#toggleWard').checked;
  adminLayer.setVisibility({ province: showProvince, ward: showWard });
  if ((showProvince || showWard) && map.hasLayer && !map.hasLayer(adminLayer)) adminLayer.addTo(map);
  if (!showProvince && !showWard && map.hasLayer && map.hasLayer(adminLayer)) map.removeLayer(adminLayer);
}

function initMap() {
  map = Vietflex.vietflexMap({
    container: 'map',
    center: [106.3, 16.2],
    zoom: 5.15,
    pitch: 0,
    bearing: 0,
    basemap: 'light',
    basePath: CFG.openmapBasePath,
    minZoom: 2,
    renderWorldCopies: false,
    enableBasemapControl: false
  });

  if (map.on) {
    map.on('zoomend', renderLabels);
    map.on('moveend', renderLabels);
  }
}

function populateProvinceSelect() {
  $('#provinceSelect').innerHTML = '<option value="">— Chọn tỉnh/thành —</option>' +
    provinceNames.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
}

function populateWards() {
  const p = $('#provinceSelect').value;
  const select = $('#wardSelect');
  if (!p) {
    select.disabled = true;
    select.innerHTML = '<option value="">Chọn tỉnh trước</option>';
    return;
  }
  const rows = recordsOfProvince(p).sort((a, b) => `${a.type || ''} ${a.name || ''}`.localeCompare(`${b.type || ''} ${b.name || ''}`, 'vi'));
  select.disabled = false;
  select.innerHTML = '<option value="">— Chọn xã/phường/đặc khu —</option>' +
    rows.map(r => `<option value="${esc(r.id)}">${esc(`${r.type || ''} ${r.name || ''}`.trim())}</option>`).join('');
  $('#adminInfo').textContent = `${p}: ${rows.length.toLocaleString('vi-VN')} đơn vị cấp xã trong chỉ mục hiện hành.`;
}

function zoomProvince() {
  const adminName = $('#provinceSelect').value;
  if (!adminName) return;
  const rows = recordsOfProvince(adminName);
  const b = bboxOf(rows);
  if (b) map.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: [28, 28], maxZoom: 9 });
  const p = carbonProvinceFromAdmin(adminName);
  if (p) selectProvince(p);
  if (adminLayer && adminLayer.setSelectedIds) adminLayer.setSelectedIds([]);
}

function zoomWard() {
  const id = $('#wardSelect').value;
  const r = adminRecords.find(x => String(x.id) === String(id));
  if (!r) return;
  if (Array.isArray(r.bbox) && r.bbox.length === 4) {
    const b = r.bbox.map(Number);
    map.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: [36, 36], maxZoom: 14 });
  }
  selectWard(r, null, true);
}

function clearSelection() {
  $('#provinceSelect').value = '';
  $('#wardSelect').value = '';
  $('#wardSelect').disabled = true;
  $('#wardSelect').innerHTML = '<option value="">Chọn tỉnh trước</option>';
  $('#adminSearch').value = '';
  $('#searchResults').innerHTML = '';
  if (adminLayer && adminLayer.setSelectedIds) adminLayer.setSelectedIds([]);
  setNationalPanel();
  renderLabels();
  if (map.setView) map.setView([16.2, 106.3], 5.15);
}

function recordSearchText(r) {
  const vals = [];
  for (const [k, v] of Object.entries(r)) {
    if (k === 'bbox' || v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') vals.push(v);
    else if (Array.isArray(v)) vals.push(v.join(' '));
  }
  return normalizeVN(vals.join(' '));
}

function searchAdmin(q) {
  const n = normalizeVN(q);
  if (n.length < 2) return [];
  return adminRecords.map(r => {
    const name = normalizeVN(r.name);
    const id = normalizeVN(r.id);
    const hay = recordSearchText(r);
    let score = 0;
    if (name === n) score += 100;
    if (id === n) score += 90;
    if (name.startsWith(n)) score += 55;
    if (hay.includes(n)) score += 20;
    return { r, score };
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || String(a.r.name).localeCompare(String(b.r.name), 'vi'))
    .slice(0, 12).map(x => x.r);
}

function renderSearch() {
  const q = $('#adminSearch').value.trim();
  const box = $('#searchResults');
  if (q.length < 2) { box.innerHTML = ''; return; }
  const rows = searchAdmin(q);
  box.innerHTML = rows.length ? rows.map(r => `
    <button class="search-result" data-id="${esc(r.id)}">
      <b>${esc(`${r.type || ''} ${r.name || ''}`.trim())}</b>
      <span>${esc(r.province || '')} · ${esc(r.id)}</span>
    </button>`).join('') : '<div class="small-note">Không tìm thấy.</div>';
}

async function initAdminPMTiles() {
  if (!map || adminLayer || !window.CarbonAdminPMTiles || !adminRecords.length) return;
  try {
    adminLayer = window.CarbonAdminPMTiles.createLayer(CFG.admin.pmtiles, {
      showProvince: $('#toggleProvince').checked,
      showWard: $('#toggleWard').checked,
      attribution: 'Ranh giới © Vietflexmap/anhmap'
    });
    refreshAdminVisibility();
    $('#adminStatus').textContent = 'Hành chính: PMTiles';

    map.on('click', async (e) => {
      try {
        if (!adminLayer || !adminLayer.query) return;
        const hits = await adminLayer.query(e.latlng, map.getZoom());
        if (!hits || !hits.length) return;
        const hit = hits[0];
        const record = hit.id != null ? adminRecords.find(r => String(r.id) === String(hit.id)) : null;
        if (!record) return;
        selectWard(record, e.latlng, true);
      } catch (err) {
        console.warn('PMTiles query:', err);
      }
    });
  } catch (err) {
    $('#adminStatus').textContent = 'Hành chính: lỗi PMTiles';
    $('#adminInfo').textContent = `Không mở được PMTiles: ${err.message}`;
  }
}
window.addEventListener('carbon-admin-pmtiles-ready', initAdminPMTiles);

function renderSourceInfo() {
  const s = carbonData.source;
  $('#sourceInfo').innerHTML = `
    <b>KML:</b> ${esc(s.title)}<br>
    <b>Cấu trúc:</b> ${fmt(s.source_counts.province, 0)} tỉnh · ${fmt(s.source_counts.district, 0)} huyện · ${fmt(s.source_counts.commune, 0)} xã cũ.<br>
    <b>URL ghi trong KML:</b> ${esc(s.source_url || 'không có')}<br>
    <b>Xuất KML:</b> ${esc(s.exported_at_utc || 'không có')}<br>
    <b>Giới hạn:</b> ${esc(s.interpretation_note || '')}<br>
    <b>Hành chính:</b> Vietflexmap/anhmap · 34 tỉnh/thành · ${adminRecords.length ? adminRecords.length.toLocaleString('vi-VN') : '…'} xã/phường/đặc khu.`;
}

function bindUI() {
  $('#provinceSelect').addEventListener('change', () => {
    populateWards();
    const p = carbonProvinceFromAdmin($('#provinceSelect').value);
    if (p) selectProvince(p);
  });
  $('#wardSelect').addEventListener('change', () => {
    const r = adminRecords.find(x => String(x.id) === String($('#wardSelect').value));
    if (r) selectWard(r, null, false);
  });
  $('#zoomProvince').onclick = zoomProvince;
  $('#zoomWard').onclick = zoomWard;
  $('#clearSelection').onclick = clearSelection;

  let t;
  $('#adminSearch').addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(renderSearch, 100);
  });
  $('#searchResults').addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    const r = adminRecords.find(x => String(x.id) === String(btn.dataset.id));
    if (!r) return;
    $('#provinceSelect').value = r.province;
    populateWards();
    $('#wardSelect').value = String(r.id);
    zoomWard();
    $('#searchResults').innerHTML = '';
  });

  $('#toggleProvince').onchange = refreshAdminVisibility;
  $('#toggleWard').onchange = refreshAdminVisibility;
  $('#toggleLabels').onchange = renderLabels;
  $('#toggleCarbon').onchange = (e) => {
    if (!carbonLayer || !map) return;
    if (e.target.checked) carbonLayer.addTo(map);
    else if (map.hasLayer && map.hasLayer(carbonLayer)) map.removeLayer(carbonLayer);
  };
}

async function bootstrap() {
  bindUI();
  initMap();

  try {
    const [carbon, admin, source] = await Promise.all([
      getJSON(CFG.carbon),
      getJSON(CFG.admin.meta),
      getJSON(CFG.admin.source).catch(() => ({}))
    ]);
    carbonData = carbon;
    adminRecords = Array.isArray(admin) ? admin : (admin.records || []);
    adminSource = source || {};
    provinceNames = [...new Set(adminRecords.map(r => r.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));

    if (provinceNames.length !== 34) {
      console.warn(`Chỉ mục hành chính có ${provinceNames.length} tỉnh/thành; kỳ vọng 34.`);
    }

    $('#nationalTotal').textContent = compact(carbonData.national.total_co2);
    $('#nationalIndex').textContent = fmt(carbonData.national.normalized_index, 2);
    $('#adminCount').textContent = adminRecords.length.toLocaleString('vi-VN');
    $('#adminInfo').textContent = `${provinceNames.length} tỉnh/thành · ${adminRecords.length.toLocaleString('vi-VN')} xã/phường/đặc khu.`;
    $('#adminStatus').textContent = `Hành chính: ${provinceNames.length}/${adminRecords.length.toLocaleString('vi-VN')}`;

    populateProvinceSelect();
    setNationalPanel();
    $('#rankingChart').innerHTML = chartRows(carbonData.provinces, 'province', 'total_co2', 12);
    renderCarbon();
    renderSourceInfo();
    initAdminPMTiles();
  } catch (err) {
    console.error(err);
    $('#adminStatus').textContent = 'Lỗi dữ liệu';
    $('#adminInfo').textContent = err.message;
    $('#sourceInfo').textContent = `Không nạp được dữ liệu: ${err.message}`;
  }
}

bootstrap();
