# CarbonVN Monitor & Forest MRV Toolkit v2.3

WebGIS **Carbon/MRV offline-first** cho Việt Nam, sử dụng **Vietflex Map** làm lõi bản đồ và kết hợp:

- XCO₂ demo / adapter OCO-2, CAMS.
- 5 vùng dự án carbon rừng mô phỏng.
- Máy tính Điều 24–26 theo logic TT31 đã triển khai trong dự án.
- Ranh giới hành chính PMTiles tái sử dụng trực tiếp từ `Vietflexmap/anhmap`.
- 34 tỉnh/thành và chỉ mục 3.321 phường/xã/đặc khu.
- OSM khi online; dữ liệu nghiệp vụ + ranh giới hành chính tiếp tục hoạt động offline sau lần tải đầu.
- CSV XCO₂ → WebGIS → GeoJSON → polygon rừng → calculator Carbon/MRV.

## Chạy

GitHub Pages có thể deploy trực tiếp từ `main` / root. Với local server:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## PMTiles hành chính từ ẢnhMap

CarbonVN không còn dùng GeoJSON bên thứ ba cho lớp hành chính chính. Workflow:

```text
Vietflexmap/anhmap@index.html
        │
        ├─ pmtilesData (Base64)
        └─ adminData (JSON)
                ↓
.github/workflows/sync-anhmap-admin.yml
                ↓
 data/vietnam-admin.pmtiles
 data/admin-data.json
 data/anhmap-source.json
                ↓
 assets/admin-pmtiles.js
                ↓
 Vietflex GridLayer / Canvas
```

Nguồn đang ghim:

```text
repo: Vietflexmap/anhmap
commit: e80f4ee9f1e167817e4a9af8402c0bca4052573e
source layer: admin
native zoom: 4–9
```

Bản sinh hiện tại có archive PMTiles khoảng **2.09 MB** và **3.321 bản ghi hành chính**. Provenance chính xác nằm trong `data/anhmap-source.json`.

### Cách hiển thị

- Ranh giới tỉnh/thành được hiển thị ở mức toàn quốc.
- Ranh giới phường/xã/đặc khu xuất hiện từ zoom 7 để giảm tải.
- Chọn tỉnh → lọc danh sách đơn vị trực thuộc.
- Chọn phường/xã → zoom theo `bbox` và highlight bằng `id` trong PMTiles.
- Click trực tiếp bản đồ → truy vấn point-in-polygon trong vector tile và mở popup.

Chi tiết: `docs/ADMIN-PMTILES.md`.

## Offline-first

- `sw.js` cache shell ứng dụng, module và chỉ mục hành chính.
- `assets/admin-pmtiles.js` cache toàn bộ `data/vietnam-admin.pmtiles` trong Cache Storage sau lần tải đầu.
- OSM public tiles **không được prefetch/cache hàng loạt**.
- Khi mất Internet, lớp hành chính PMTiles, dữ liệu XCO₂ đã lưu, polygon rừng, localStorage và calculator vẫn dùng được.
- Các module CDN được runtime-cache sau khi tải thành công; để triển khai air-gapped tuyệt đối nên vendor các thư viện vào repo.

## Dữ liệu XCO₂

Bản DEMO chứa 34 điểm đại diện cấp tỉnh/thành cho đào tạo. Đây không phải quan trắc chính thức.

CSV:

```text
time,province,lat,lon,xco2_ppm,quality,source
```

XCO₂ là nồng độ CO₂ trung bình theo cột khí quyển, không đồng nghĩa trực tiếp với phát thải tại nguồn nếu chưa có mô hình suy luận/đồng hóa phù hợp.

## GIS → MRV carbon rừng

```text
XCO₂
 ↓
PMTiles hành chính
 ↓
polygon rừng / dự án
 ↓
Qp / Qn / NDC
 ↓
Gc / Gs
 ↓
Điều 26
```

Khi bấm polygon rừng, Qp/Qn mô phỏng được đưa vào calculator để minh họa luồng nghiệp vụ. Các trường chi phí, thuế/phí, NDC, tham chiếu thị trường và dữ liệu rừng thật vẫn phải được nghiệp vụ xác nhận.

## Cổng tích hợp cũ

Cấu hình cũ vẫn được giữ trong `assets/app.js`:

```text
http://103.71.96.34:8880/assets/index-AboC7gkv.css
http://103.71.96.34:8880/assets/index-DtZXQAfN.js
```

Lõi ứng dụng không phụ thuộc cổng này.

## Tệp chính

```text
index.html
assets/app.js
assets/admin-pmtiles.js
data/vietnam-admin.pmtiles
data/admin-data.json
data/anhmap-source.json
.github/workflows/sync-anhmap-admin.yml
docs/ADMIN-PMTILES.md
docs/TT31-IMPLEMENTATION.md
sw.js
```

## Phạm vi sử dụng

CarbonVN phục vụ đào tạo, nghiên cứu, thử nghiệm và hỗ trợ phân tích. Ranh giới hành chính, XCO₂ demo và dự án rừng mô phỏng không thay thế dữ liệu/hồ sơ có giá trị pháp lý hoặc dữ liệu MRV đã được thẩm tra/xác minh.

## Giấy phép

- Mã CarbonVN: MIT.
- Vietflex additions: MIT.
- Leaflet-derived components: BSD-2-Clause.
- PMTiles: theo giấy phép/thông báo của upstream.
- Ranh giới hành chính tái sử dụng từ `Vietflexmap/anhmap` và giữ provenance/third-party notices tương ứng.
- OpenStreetMap: `© OpenStreetMap contributors`.
