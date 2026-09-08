# CarbonVN Monitor & Forest Payment Toolkit v2.1.0

Hệ thống WebGIS **offline-first** kết hợp:

1. Giám sát/phân tích lớp **XCO₂** trên lãnh thổ Việt Nam.
2. Nền bản đồ mở **OpenStreetMap (OSM)** khi có Internet.
3. Lớp dự án/lô rừng GeoJSON liên kết trực tiếp với **Bảng tính thử nghiệm chi trả dịch vụ hấp thụ và lưu giữ các-bon của rừng**.
4. Máy tính Điều 24–26 theo **Thông tư số 31/2026/TT-BNNMT ngày 15/7/2026**.
5. Chế độ giảng dạy và đào tạo sau đại học, dữ liệu mẫu có gắn nhãn rõ ràng.

## Chạy nhanh

- Mở trực tiếp `index.html`: máy tính TT31 và bản đồ fallback hoạt động không cần server.
- Khi có Internet, Vietflex Map + OpenStreetMap tự hoạt động.
- Để dùng PWA/Service Worker: chạy `serve.bat` (Windows) hoặc `sh serve.sh` (macOS/Linux), sau đó mở `http://localhost:8080`.

## WebGIS OSM

Ứng dụng sử dụng **Vietflex Map 1.0.0** làm lõi hiển thị (Vietflex được xây trên Leaflet) và tile chuẩn OpenStreetMap:

```text
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Attribution được giữ trong giao diện. Service Worker **không cache/prefetch tile OSM**. Khi offline, ứng dụng dùng PMTiles cục bộ nếu có, nếu không thì dùng bản đồ tọa độ fallback.

## Dữ liệu XCO₂

Bản DEMO chứa 34 điểm đại diện cấp tỉnh. Giá trị là **mô phỏng phục vụ kiểm thử/giảng dạy**, không phải quan trắc thực.

CSV nhập vào có cấu trúc:

```text
time,province,lat,lon,xco2_ppm,quality,source
```

Có thể thay adapter bằng OCO-2, CAMS, trạm IoT hoặc API nội bộ. XCO₂ là nồng độ CO₂ trung bình theo cột khí quyển; không nên diễn giải trực tiếp như phát thải tại nguồn nếu chưa có mô hình suy luận/đồng hóa phù hợp.

## Thông tư 31/2026/TT-BNNMT

### Điều 24 — Phương pháp chi phí

```text
Gc = (Cxd + Cht + T) / Qc
Qc = Qp - Qn
```

`Cht` được giới hạn tối đa bằng 15% theo logic quy tắc của ứng dụng.

### Điều 25 — Phương pháp so sánh

- Tối thiểu 03 dự án tham chiếu hợp lệ.
- Giao dịch tại thời điểm xác định hoặc gần nhất trong 24 tháng trước đó.
- Kiểm tra tương đồng hoạt động, hệ tiêu chuẩn và mục đích sử dụng tín chỉ.
- K1: chất lượng; K2: rủi ro rò rỉ/đảo nghịch; K3: quy mô tín chỉ.

```text
Gsi = Gtci × (K1 + K2 + K3) / 3
Gs  = ΣGsi / n
```

### Điều 26 — Xác định/điều chỉnh

- Chọn mức cao hơn giữa Gc và Gs.
- Nếu không đủ 03 dự án tham chiếu hợp lệ thì dùng Gc.

## Liên kết GIS → bảng tính

1. Mở tab **WebGIS CO₂ & rừng**.
2. Chọn polygon dự án rừng.
3. Bấm **Nạp vào bảng tính TT31**.
4. Các trường diện tích, Qp, Qn, thời gian, tỷ lệ dự phòng, tiêu chuẩn... được đưa sang hồ sơ dự án.
5. Kiểm tra lại đầu vào thực tế rồi tính Gc/Gs.

## Cổng tích hợp cũ

Cấu hình tùy chọn vẫn được giữ tại `assets/js/config.js`:

```text
http://103.71.96.34:8880/assets/index-AboC7gkv.css
http://103.71.96.34:8880/assets/index-DtZXQAfN.js
```

Lõi ứng dụng không phụ thuộc cổng này. Nếu trang được triển khai qua HTTPS, trình duyệt có thể chặn asset HTTP do mixed content.

## Kiểm thử

```bash
npm test
```

Bộ kiểm thử hiện đạt **13/13**.

## Phạm vi sử dụng

Công cụ phục vụ **giảng dạy, đào tạo sau đại học, nghiên cứu và thử nghiệm**. Kết quả không thay thế hồ sơ thẩm định, quyết định của cơ quan nhà nước có thẩm quyền, xác minh tín chỉ, tư vấn pháp lý/tài chính hoặc dữ liệu quan trắc chính thức.

## PMTiles Việt Nam offline

Cấu hình mặc định trỏ tới `data/vietnam.pmtiles`. Repo không nhúng archive thật vì ZIP nguồn không có file này và dữ liệu nền phải có nguồn/giấy phép rõ ràng. Với **raster PMTiles**, adapter dùng `pmtiles.leafletRasterLayer()` để gắn vào Vietflex Map; nếu archive không tồn tại, hệ thống tiếp tục hoạt động bằng fallback tọa độ.

## Ranh giới 34 tỉnh

Bộ XCO₂ demo có 34 điểm đại diện. Repo không tự sinh polygon giả làm ranh giới hành chính. Khi tích hợp bộ GeoJSON 34 tỉnh thật, cần ghi nguồn, thời điểm hiệu lực và giấy phép dữ liệu.

## Giấy phép

- Mã ứng dụng: MIT.
- Vietflex additions: MIT.
- Leaflet-derived code: BSD-2-Clause.
- PMTiles JS: BSD-3-Clause.
- OpenStreetMap: giữ attribution `© OpenStreetMap contributors` và tuân thủ chính sách tile.
