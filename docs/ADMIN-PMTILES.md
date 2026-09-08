# CarbonVN administrative PMTiles từ Vietflexmap/anhmap

## Mục tiêu

CarbonVN v2.4 dùng lại trực tiếp lớp ranh giới hành chính của `Vietflexmap/anhmap` để hiển thị trên Vietflex Map mà không cần tải GeoJSON rời cho từng tỉnh/xã.

Phạm vi hiện tại:

- 34 tỉnh/thành phố.
- 3.321 bản ghi phường/xã/đặc khu trong chỉ mục ẢnhMap.
- Vector PMTiles toàn quốc.
- Tra cứu theo tỉnh → phường/xã.
- Tìm nhanh tên có dấu/không dấu, mã và các alias/tên cũ nếu thuộc tính đó tồn tại trong `adminData`.
- Nhãn hành chính theo mức zoom.
- Highlight đơn vị được chọn.
- Click bản đồ để truy vấn feature hành chính.
- Offline-first sau lần tải thành công đầu tiên.

## Nguồn và provenance

Nguồn được đồng bộ từ:

- Repository: `Vietflexmap/anhmap`
- Ref mặc định: `main`
- Payload nhúng trong `index.html`:
  - `pmtilesData`: archive PMTiles dạng Base64.
  - `adminData`: chỉ mục đơn vị hành chính.
- Source layer MVT: `admin`.
- Native data zoom: 4–9.

Commit nguồn chính xác của bản đang deploy luôn được ghi vào `data/anhmap-source.json`; không cần sửa tài liệu khi ẢnhMap có commit mới.

Các file sinh tự động:

```text
data/vietnam-admin.pmtiles
data/admin-data.json
data/anhmap-source.json
```

Không sửa thủ công ba file trên nếu không có chủ đích thay nguồn dữ liệu.

## Workflow đồng bộ tự động

`.github/workflows/sync-anhmap-admin.yml` mặc định resolve commit mới nhất của `Vietflexmap/anhmap@main` và có thể chạy thủ công với branch/tag/SHA khác qua `source_ref`.

Pipeline:

1. resolve `source_ref` thành SHA cụ thể;
2. nếu SHA không đổi và file sinh hiện tại hợp lệ thì dừng, không tạo commit rác;
3. tải `anhmap/index.html` đúng SHA;
4. trích `pmtilesData` và giải mã Base64;
5. trích `adminData` thành JSON;
6. kiểm tra PMTiles magic và kích thước tối thiểu;
7. kiểm tra tối thiểu 3.000 bản ghi hành chính;
8. yêu cầu đúng 34 tỉnh/thành;
9. yêu cầu ít nhất 3.000 bản ghi có `bbox`;
10. tính SHA-256 cho PMTiles và `admin-data.json`;
11. ghi provenance vào `data/anhmap-source.json`;
12. chỉ commit khi dữ liệu sinh ra thực sự thay đổi.

Workflow vẫn chạy theo lịch hàng tuần và có `workflow_dispatch` để đồng bộ thủ công khi cần.

## Hiển thị vector PMTiles

`assets/admin-pmtiles.js` đọc archive bằng PMTiles JS và giải mã MVT bằng `@mapbox/vector-tile` + `pbf`, sau đó vẽ bằng `Vietflex.GridLayer`/Canvas.

- Tỉnh/thành: nét xanh đậm hơn.
- Phường/xã/đặc khu: hiện từ zoom 7 trở lên để tránh quá tải bản đồ toàn quốc.
- Đơn vị đang chọn: tô vàng.
- Dropdown hành chính dùng `data/admin-data.json`.
- Chọn xã: highlight theo `id` trong PMTiles và zoom tới `bbox`.
- Click bản đồ: point-in-polygon trên tile hiện hành để mở popup và đồng bộ lại dropdown.

## Tìm kiếm hành chính

CarbonVN tạo chuỗi tìm kiếm đã chuẩn hóa Unicode và bỏ dấu tiếng Việt. Search duyệt các thuộc tính chuỗi, số và mảng của từng record, ngoại trừ `bbox`.

Vì vậy có thể tìm theo:

- tên hiện tại;
- tên không dấu;
- mã/ID;
- tỉnh/thành;
- alias/tên cũ hoặc trường mô tả khác nếu ẢnhMap cung cấp trong `adminData`.

Kết quả được chấm điểm, giới hạn 12 gợi ý đầu và khi chọn sẽ tự:

```text
search result
   ↓
set tỉnh
   ↓
lọc danh sách xã
   ↓
set xã
   ↓
zoom bbox
   ↓
highlight PMTiles
```

## Nhãn hành chính thông minh

Để tránh tạo hàng nghìn DOM marker cùng lúc:

- zoom thấp / chưa chọn tỉnh: hiển thị nhãn 34 tỉnh/thành;
- zoom trung bình khi đã chọn tỉnh: chỉ giữ nhãn tỉnh đang xem;
- zoom sâu: chỉ dựng nhãn phường/xã thuộc tỉnh đang chọn;
- xã đang chọn có nhãn nổi bật.

Nhãn dùng `Vietflex.Marker` + `Vietflex.DivIcon`; ranh giới vẫn do GridLayer PMTiles render riêng.

## Cache theo phiên bản nguồn

Từ v2.4, URL archive được gắn:

```text
./data/vietnam-admin.pmtiles?v=<source_commit>
```

Điều này giải quyết lỗi trình duyệt giữ archive cũ sau khi ẢnhMap cập nhật.

`assets/admin-pmtiles.js`:

- cache toàn archive vào Cache Storage `carbonvn-anhmap-pmtiles-v2`;
- khi tải được phiên bản mới, xóa bản cũ cùng pathname;
- nếu đang offline và bản mới chưa tải được, cho phép fallback sang archive đã cache trước đó.

`assets/app.js` tải `anhmap-source.json` trước, lấy `source_commit`, sau đó mới yêu cầu `admin-data.json` và PMTiles theo phiên bản tương ứng.

Nút **Làm mới dữ liệu** xóa cache hành chính/localStorage liên quan và reload ứng dụng.

## Service Worker

`sw.js`:

- cache app shell, module, tài liệu và chỉ mục hành chính;
- dùng network-first cho `anhmap-source.json` và `admin-data.json` khi online;
- fallback cache khi offline;
- không intercept archive PMTiles vì module PMTiles quản lý cache theo source commit;
- không cache/prefetch hàng loạt tile công cộng OpenStreetMap.

## Tách biệt với MRV

Lớp hành chính chỉ là lớp tham chiếu không gian và không thay đổi logic TT31:

```text
OCO-2 / CAMS / XCO₂
        ↓
PMTiles hành chính
        ↓
polygon rừng / dự án
        ↓
hồ sơ MRV
        ↓
Qp / Qn / NDC
        ↓
Gc / Gs
        ↓
Điều 26
```

Kiến trúc này cho phép nâng dữ liệu ẢnhMap hoặc thay archive PMTiles mà không phải sửa calculator Carbon.

## Phạm vi pháp lý

Ranh giới dùng cho hiển thị, tra cứu, đào tạo và hỗ trợ phân tích. Khi dùng cho hồ sơ chính thức cần đối chiếu dữ liệu hành chính có hiệu lực, nguồn ban hành, thời điểm cập nhật, CRS và điều kiện sử dụng dữ liệu.
