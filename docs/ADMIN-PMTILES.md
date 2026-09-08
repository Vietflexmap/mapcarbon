# CarbonVN administrative PMTiles từ Vietflexmap/anhmap

## Mục tiêu

CarbonVN v2.3 dùng lại trực tiếp lớp ranh giới hành chính của `Vietflexmap/anhmap` để hiển thị trên Vietflex Map mà không cần tải GeoJSON rời cho từng tỉnh/xã.

Phạm vi:

- 34 tỉnh/thành phố.
- 3.321 bản ghi phường/xã/đặc khu trong chỉ mục ẢnhMap.
- Vector PMTiles toàn quốc.
- Tra cứu theo tỉnh → phường/xã.
- Highlight đơn vị được chọn.
- Click bản đồ để truy vấn feature hành chính.

## Nguồn

- Repository: `Vietflexmap/anhmap`
- Commit đang ghim: `e80f4ee9f1e167817e4a9af8402c0bca4052573e`
- ẢnhMap nhúng hai payload trong `index.html`:
  - `pmtilesData`: archive PMTiles dạng Base64.
  - `adminData`: chỉ mục đơn vị hành chính.
- Source layer MVT: `admin`.
- Native data zoom: 4–9.

Không sửa trực tiếp các file sinh tự động trong `data/`.

## Quy trình tự động

Workflow `.github/workflows/sync-anhmap-admin.yml`:

1. tải `anhmap/index.html` từ commit đã ghim;
2. trích `pmtilesData`;
3. giải mã Base64 thành `data/vietnam-admin.pmtiles`;
4. trích `adminData` thành `data/admin-data.json`;
5. kiểm tra PMTiles magic và số bản ghi;
6. ghi provenance vào `data/anhmap-source.json`;
7. commit dữ liệu sinh ra khi có thay đổi.

Khi cần đồng bộ một bản ẢnhMap mới, phải kiểm tra dữ liệu trước rồi đổi `ANHMAP_COMMIT` trong workflow.

## Hiển thị

`assets/admin-pmtiles.js` tạo một `Vietflex.GridLayer` dạng canvas và giải mã vector tile trực tiếp từ PMTiles.

- Tỉnh/thành: nét xanh đậm hơn.
- Phường/xã/đặc khu: hiện từ zoom 7 trở lên để tránh quá tải bản đồ toàn quốc.
- Đơn vị được chọn: tô vàng.
- Dropdown hành chính dùng `data/admin-data.json`.
- Chọn xã: highlight theo `id` tương ứng trong PMTiles và zoom tới `bbox`.
- Click bản đồ: point-in-polygon trên tile hiện hành để mở popup đơn vị.

## Offline-first

Archive hành chính hiện khoảng 2 MB. `assets/admin-pmtiles.js` tải toàn archive ở lần sử dụng đầu tiên và lưu vào Cache Storage `carbonvn-anhmap-pmtiles-v1`. Sau đó lớp ranh giới có thể tiếp tục hoạt động khi mất Internet.

`sw.js` cache shell ứng dụng, module, chỉ mục hành chính và tài liệu. Service Worker không cache hoặc prefetch tile công cộng OpenStreetMap.

## Tách biệt với MRV

Lớp hành chính chỉ là lớp tham chiếu không gian và không thay đổi logic TT31:

```text
XCO₂
  ↓
vị trí hành chính
  ↓
polygon rừng / MRV
  ↓
hồ sơ dự án
  ↓
Qp / Qn
  ↓
Gc / Gs
  ↓
Điều 26
```

Kiến trúc này cho phép thay PMTiles hành chính hoặc nâng dữ liệu ẢnhMap mà không phải sửa calculator Carbon.

## Phạm vi pháp lý

Ranh giới dùng cho hiển thị, tra cứu, đào tạo và hỗ trợ phân tích. Khi dùng cho hồ sơ chính thức cần đối chiếu dữ liệu hành chính có hiệu lực, nguồn ban hành, thời điểm cập nhật, CRS và điều kiện sử dụng dữ liệu.
