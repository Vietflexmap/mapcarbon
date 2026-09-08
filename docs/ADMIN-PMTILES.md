# CarbonVN administrative boundaries & PMTiles

## Mục tiêu

CarbonVN v2.2 bổ sung lớp hành chính hậu sắp xếp theo hai cấp cần cho WebGIS Carbon/MRV:

- `province`: 34 tỉnh/thành phố.
- `ward`: phường, xã và đặc khu trực thuộc tỉnh/thành.

Luồng UI/tra cứu được tái sử dụng theo hướng của `Vietflexmap/anhmap`: chọn tỉnh trước, sau đó lọc đơn vị cấp xã theo mã/tên và chỉ nạp geometry cần xem. `anhmap` hiện đóng dữ liệu/logic trong một `index.html` lớn, không công bố một archive `.pmtiles` tách riêng; vì vậy CarbonVN không giả định rằng `anhmap` đã có PMTiles.

## Nguồn geometry

Geometry + mã hành chính được lấy từ dự án MIT:

`thanglequoc/vietnamese-provinces-database`

Bộ `json/geojson/` có cấu trúc:

```text
{province_code}_{province_code_name}/
  {province_code}_{province_code_name}.geojson
  wards/
    {ward_code}_{ward_code_name}.geojson
```

Bộ dữ liệu cung cấp 34 tỉnh và 3.321 đơn vị cấp xã. CarbonVN tải từng polygon theo nhu cầu để giảm RAM và thời gian khởi động.

## Offline theo hai tầng

### Tầng 1 — cache theo nhu cầu

Khi người dùng mở một tỉnh hoặc phường/xã lần đầu, GeoJSON được lưu vào Cache Storage `carbonvn-admin-v1`. Sau đó geometry đó dùng được khi mất mạng.

Đây là chế độ đang hoạt động ngay trên GitHub Pages và không cần build.

### Tầng 2 — PMTiles toàn quốc

`tools/build-admin-pmtiles.sh` tạo một vector archive:

```text
data/vietnam-admin.pmtiles
```

Archive có hai source-layer:

```text
province
ward
```

Quy trình:

```text
GeoJSON 34 tỉnh + 3.321 xã/phường
        ↓
NDJSON province / ward
        ↓
Tippecanoe → vector MBTiles
        ↓
pmtiles convert
        ↓
vietnam-admin.pmtiles
```

Chạy local:

```bash
bash tools/build-admin-pmtiles.sh
```

Yêu cầu: `curl`, `unzip`, `jq`, `tippecanoe`, `pmtiles` CLI.

## Vì sao không tải tất cả GeoJSON lúc mở trang

3.321 polygon cấp xã có thể rất nặng nếu parse đồng thời. CarbonVN dùng chiến lược lazy-load theo tỉnh/xã; PMTiles là gói phân phối tối ưu khi cần toàn quốc offline hoặc zoom liên tục.

## Hiển thị PMTiles trong Vietflex/Leaflet

PMTiles vector trên Leaflet cần một vector-tile renderer. PMTiles JS chỉ có adapter Leaflet trực tiếp cho raster; vector PMTiles được khuyến nghị dùng `protomaps-leaflet` hoặc MapLibre. CarbonVN giữ Vietflex Map làm lõi và dành `CFG.admin.pmtiles = './data/vietnam-admin.pmtiles'` cho adapter vector riêng.

Trong v2.2, lớp tương tác/click chính vẫn dùng GeoJSON lazy-load vì popup và lựa chọn đơn vị hành chính cần feature-level interaction ổn định. PMTiles được dùng như gói offline toàn quốc/overview, còn GeoJSON chọn lọc dùng cho tương tác chi tiết.

## Lưu ý pháp lý dữ liệu

Dữ liệu ranh giới GIS trong ứng dụng là dữ liệu kỹ thuật tham khảo. Với hồ sơ nhà nước, MRV chính thức, chi trả dịch vụ môi trường rừng hoặc xác định diện tích pháp lý, phải đối chiếu bộ địa giới được cơ quan có thẩm quyền công bố và thời điểm hiệu lực tương ứng.
