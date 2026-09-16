# CarbonVN · CO₂ Monitor 34 tỉnh/thành

WebGIS tĩnh chạy trên GitHub Pages, dùng **Vietflex OpenMap Light** làm bản đồ nền và **PMTiles hành chính** để tra cứu tới xã/phường/đặc khu.

## Phiên bản mới

- Hiển thị 34 tỉnh/thành hiện hành và chỉ mục 3.321 xã/phường/đặc khu.
- Quy đổi dữ liệu CO₂ từ KML nguồn 63 tỉnh sang 34 tỉnh/thành mà không cộng trùng huyện/xã.
- Popup cấp tỉnh có KPI, biểu đồ cấu phần tỉnh cũ, công thức và mô tả ngắn.
- Popup cấp xã/phường/đặc khu có ước tính drill-down theo tỷ trọng diện tích bbox proxy và ghi rõ đây **không phải phép đo tại chỗ**.
- Bảng bên phải có biểu đồ cấu phần, công thức tính và so sánh 34 tỉnh/thành.
- Bản đồ nền lấy trực tiếp từ `https://vietflexmap.github.io/openmap/` với `basemap: "light"`.

## Dữ liệu CO₂ và giới hạn diễn giải

KML nguồn chứa **63 bản ghi tỉnh, 705 huyện và 10.643 xã cũ**. Các trường chính gồm `Dientich`, `TongCO2`, `TongCo2th`. Metadata trong chính KML ghi rõ dữ liệu là theo 63 tỉnh cũ, đơn vị/phương pháp CO₂ chưa được xác nhận và chỉ số từng được gọi “CO₂/tháng” thực chất khớp `TongCO2 / Dientich × 10000`; vì vậy giao diện mới không gọi đây là ppm hay số liệu theo tháng.

### 63 → 34 tỉnh/thành

```text
TongCO2_34 = Σ TongCO2_tỉnh_cũ
Dientich_34 = Σ Dientich_tỉnh_cũ
Index_34 = TongCO2_34 / Dientich_34 × 10.000
```

File kết quả: `data/co2-34.json`.

### Drill-down tới xã/phường/đặc khu hiện hành

Repo hiện chưa có crosswalk polygon đầy đủ 10.643 xã cũ → 3.321 đơn vị hiện hành, nên WebGIS dùng proxy có công thức minh bạch:

```text
share_i = AreaBBox_i / Σ AreaBBox_j trong tỉnh
TongCO2_i_est = TongCO2_tỉnh × share_i
Dientich_i_est = Dientich_tỉnh × share_i
```

Cách này bảo toàn tổng cấp tỉnh nhưng **không phải kiểm kê/quan trắc chính thức**. Khi có crosswalk polygon cũ → mới, nên thay bằng overlay/intersection có trọng số diện tích.

## Tái tạo dữ liệu

```bash
python tools/build_co2_34.py /path/to/source.kml -o data/co2-34.json
```

Script chỉ lấy `Placemark` có `layer_level=tinh` để tránh đếm trùng huyện/xã.

## Cấu trúc chính

```text
index.html
styles.css
assets/
  app.js
  admin-pmtiles.js
data/
  co2-34.json
  admin-data.json
  vietnam-admin.pmtiles
  anhmap-source.json
tools/
  build_co2_34.py
```

## Nâng cấp khoa học tiếp theo

Để chuyển từ visualization/monitoring của dataset sang MRV/quan trắc CO₂ dùng chuyên môn, cần bổ sung metadata đơn vị, timestamp, phương pháp đo/ước tính, uncertainty/QA-QC và crosswalk hình học 10.643 → 3.321 hoặc dữ liệu EO/trạm đo có geolocation + thời gian.
