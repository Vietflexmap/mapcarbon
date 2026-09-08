# CarbonVN Monitor & Forest MRV Toolkit v2.4

WebGIS **Carbon/MRV offline-first** cho Việt Nam, sử dụng **Vietflex Map** làm lõi bản đồ và kết hợp:

- XCO₂ demo / adapter OCO-2, CAMS.
- 5 vùng dự án carbon rừng mô phỏng.
- Máy tính Điều 24–26 theo logic TT31 đã triển khai trong dự án.
- Ranh giới hành chính vector PMTiles tái sử dụng trực tiếp từ `Vietflexmap/anhmap`.
- 34 tỉnh/thành và chỉ mục 3.321 phường/xã/đặc khu.
- Tìm kiếm hành chính theo tên có dấu/không dấu, mã và các alias/tên cũ nếu trường đó có trong `adminData`.
- Nhãn hành chính thông minh theo mức zoom: tỉnh ở mức toàn quốc, phường/xã khi đi sâu vào một tỉnh.
- Click bản đồ → point-in-polygon trên vector tile → đồng bộ dropdown + highlight đơn vị.
- OSM khi online; dữ liệu nghiệp vụ + ranh giới hành chính tiếp tục hoạt động offline sau lần tải đầu.
- CSV XCO₂ → WebGIS → GeoJSON → polygon rừng → calculator Carbon/MRV.

## Chạy

GitHub Pages có thể deploy trực tiếp từ `main` / root. Với local server:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## PMTiles hành chính từ ẢnhMap

CarbonVN không dùng GeoJSON bên thứ ba làm lớp hành chính chính. Pipeline hiện tại:

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

`data/anhmap-source.json` là provenance chuẩn của bản đang deploy. Tại thời điểm v2.4, dữ liệu sinh ra có archive khoảng **2.09 MB**, **34 tỉnh/thành** và **3.321 bản ghi cấp xã**.

### Đồng bộ tự động

Workflow `.github/workflows/sync-anhmap-admin.yml` đã được nâng cấp để:

1. mặc định resolve **commit mới nhất của `Vietflexmap/anhmap@main`**;
2. có thể chạy thủ công với branch/tag/SHA khác qua `source_ref`;
3. bỏ qua rebuild nếu source commit không đổi;
4. kiểm tra PMTiles magic + kích thước tối thiểu;
5. yêu cầu đúng **34 tỉnh/thành** và tối thiểu 3.000 bản ghi có `bbox`;
6. ghi SHA-256 của PMTiles và `admin-data.json` vào provenance;
7. chỉ commit khi dữ liệu sinh ra thực sự thay đổi.

Nhờ vậy, khi ẢnhMap cập nhật dữ liệu hành chính, CarbonVN không cần sửa tay `ANHMAP_COMMIT` như bản v2.3.

### Hiển thị và tra cứu

- Ranh giới tỉnh/thành được hiển thị ở mức toàn quốc.
- Ranh giới phường/xã/đặc khu xuất hiện từ zoom 7 để giảm tải.
- Tìm kiếm không dấu sử dụng toàn bộ thuộc tính chuỗi/số trong từng record, nên mã, alias và tên cũ sẽ được tìm nếu ẢnhMap có cung cấp.
- Chọn tỉnh → lọc danh sách đơn vị trực thuộc.
- Chọn phường/xã → zoom theo `bbox` và highlight bằng `id` trong PMTiles.
- Click trực tiếp bản đồ → truy vấn point-in-polygon trong vector tile và mở popup.
- Nhãn tỉnh hiển thị ở zoom thấp; nhãn cấp xã chỉ dựng cho tỉnh đang chọn ở zoom sâu để tránh tạo hàng nghìn DOM marker cùng lúc.

Chi tiết: `docs/ADMIN-PMTILES.md`.

## Cache và offline-first

- `sw.js` cache shell ứng dụng, module, chỉ mục hành chính và tài liệu.
- `assets/admin-pmtiles.js` cache toàn bộ `data/vietnam-admin.pmtiles` trong Cache Storage sau lần tải đầu.
- URL PMTiles được gắn `?v=<source_commit>` để **tự vô hiệu cache cũ** khi ẢnhMap thay đổi.
- `anhmap-source.json` và `admin-data.json` dùng network-first khi online, fallback cache/localStorage khi offline.
- Nút **Làm mới dữ liệu** xóa cache hành chính nếu cần ép tải lại.
- OSM public tiles **không được prefetch/cache hàng loạt**.
- Các module CDN được runtime-cache sau khi tải thành công; để triển khai air-gapped tuyệt đối nên vendor thư viện vào repo.

## PMTiles JS

`assets/admin-pmtiles.js` dùng PMTiles JS 4.5.0 cùng `@mapbox/vector-tile` và `pbf` để đọc vector archive, vẽ lên `Vietflex.GridLayer` canvas và truy vấn feature tại vị trí click.

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
- PMTiles: BSD-3-Clause.
- Ranh giới hành chính tái sử dụng từ `Vietflexmap/anhmap` và giữ provenance/third-party notices tương ứng.
- OpenStreetMap: `© OpenStreetMap contributors`.
