# Vietnam PMTiles offline slot

Đặt archive **raster PMTiles** hợp pháp tại:

```text
data/vietnam.pmtiles
```

Repo hiện không kèm archive thật vì tệp nguồn ban đầu không chứa `vietnam.pmtiles` và dữ liệu nền cần nguồn/giấy phép rõ ràng.

Với Vietflex Map/Leaflet, raster PMTiles có thể được nối bằng `PMTiles` + `leafletRasterLayer`. Nếu archive là vector, nên dùng MapLibre GL hoặc `protomaps-leaflet`.

Không tạo PMTiles offline bằng cách bulk-download/prefetch từ `tile.openstreetmap.org`.
