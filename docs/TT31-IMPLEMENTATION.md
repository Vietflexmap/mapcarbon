# TT31-IMPLEMENTATION — CarbonVN / Vietflex Map

## Phạm vi

CarbonVN ánh xạ Điều 24–26 Thông tư 31/2026/TT-BNNMT vào luồng WebGIS → polygon rừng → hồ sơ dự án → mức chi trả. Công cụ phục vụ nghiên cứu, đào tạo và thử nghiệm; không thay thế hồ sơ thẩm định hoặc quyết định của cơ quan có thẩm quyền.

## Điều 24 — phương pháp chi phí

```text
Qc = Qp - Qn
Gc = (Cxd + Cht + T) / Qc
```

Trong bản demo:

- `Cht_applied = min(Cht nhập, 15% kinh phí bảo vệ rừng nền)`.
- `Qn` là đầu vào pháp lý do người dùng xác nhận; phần mềm không tự suy đoán trạng thái NDC.
- Nếu `Qc <= 0`, kết quả `Gc` bị coi là không hợp lệ.

## Điều 25 — phương pháp so sánh

Kiến trúc đầy đủ phải kiểm tra đồng thời:

1. tối thiểu 03 dự án tham chiếu;
2. giao dịch tại thời điểm xác định hoặc trong 24 tháng trước đó;
3. tương đồng hoạt động tạo tín chỉ;
4. cùng nhóm tiêu chuẩn trong nước/quốc tế;
5. cùng mục đích sử dụng tín chỉ của bên mua;
6. hệ số K1 — chất lượng;
7. K2 — rò rỉ/đảo nghịch;
8. K3 — quy mô tín chỉ.

Bản GitHub Pages hiện cung cấp 03 dự án DEMO đã được giả định là vượt qua bộ lọc để minh họa công thức:

```text
Gsi = Gtci × (K1 + K2 + K3) / 3
Gs  = ΣGsi / n
```

Khi nối dữ liệu thật, cần thay lớp DEMO bằng adapter có đủ metadata kiểm chứng Điều 25.

## Điều 26

```text
G = max(Gc, Gs)
```

Nếu không đủ 03 dự án tham chiếu hợp lệ thì dùng `Gc` và phải ghi rõ nguyên nhân.

## GIS → bảng tính carbon rừng

Luồng nghiệp vụ:

```text
OCO-2 / CAMS
      ↓
    XCO₂
      ↓
Vietflex WebGIS
      ↓
Polygon rừng / MRV
      ↓
Tên dự án · tỉnh · diện tích · Qp · Qn · buffer · standard
      ↓
Điều 24 / Điều 25
      ↓
Điều 26
```

Bấm polygon rừng trên bản đồ rồi chọn **Nạp sang TT31** để chuyển `expectedCredits` (Qp) và `ndcCredits` (Qn) vào calculator.

## MRV rừng

Adapter dữ liệu thật nên quản lý tối thiểu:

- ranh giới dự án/lô rừng;
- nguồn kiểm kê rừng và ngày hiệu lực;
- baseline;
- lượng hấp thụ/lưu giữ và giảm phát thải;
- leakage;
- permanence / reversal risk;
- uncertainty;
- buffer;
- kỳ giám sát;
- QA/QC;
- bằng chứng nguồn;
- kết quả tCO₂e.

## OCO-2 / CAMS

XCO₂ là nồng độ CO₂ trung bình theo cột khí quyển. Không được diễn giải trực tiếp một điểm XCO₂ cao thành một nguồn phát thải địa phương nếu chưa có mô hình vận chuyển khí quyển, đồng hóa, gió, nền và phân tích nghịch đảo phù hợp.

## Bản đồ nền

### Online

```text
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Ứng dụng giữ attribution `© OpenStreetMap contributors` và Service Worker không cache/prefetch tile OSM công cộng.

### Offline

Cấu hình dự kiến:

```text
data/vietnam.pmtiles
```

Với Vietflex/Leaflet, adapter trực tiếp phù hợp nhất cho **raster PMTiles**. Repo không kèm archive Việt Nam thật vì tệp nguồn người dùng cung cấp không có `vietnam.pmtiles` và dữ liệu nền cần giấy phép rõ ràng. Nếu PMTiles là vector, nên dùng MapLibre GL hoặc protomaps-leaflet.

## 34 tỉnh/thành

Bản demo chứa 34 điểm đại diện để đào tạo. Không được biến centroid hoặc polygon mô phỏng thành “ranh giới hành chính chính thức”. Khi thêm `provinces-34.geojson`, cần ghi:

- nguồn dữ liệu;
- ngày hiệu lực;
- CRS;
- giấy phép;
- phiên bản đơn vị hành chính.

## Cổng cũ

Hai asset cũ vẫn được lưu trong cấu hình ứng dụng:

```text
http://103.71.96.34:8880/assets/index-AboC7gkv.css
http://103.71.96.34:8880/assets/index-DtZXQAfN.js
```

Lõi CarbonVN không phụ thuộc các asset này. Trên GitHub Pages HTTPS, HTTP asset có thể bị trình duyệt chặn vì mixed content.
