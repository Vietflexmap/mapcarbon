#!/usr/bin/env python3
"""Tạo data/co2-34.json từ KML CO₂ nguồn 63 tỉnh.

Chỉ lấy Placemark layer_level=tinh để tránh cộng trùng huyện/xã.
Không gắn đơn vị khoa học cho TongCO2/TongCo2th khi metadata nguồn chưa xác nhận.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from lxml import etree

NS="{http://www.opengis.net/kml/2.2}"
MERGE={
"Hà Nội":["Hà Nội"],"Huế":["Thừa Thiên Huế"],"Lai Châu":["Lai Châu"],"Điện Biên":["Điện Biên"],"Sơn La":["Sơn La"],"Lạng Sơn":["Lạng Sơn"],"Cao Bằng":["Cao Bằng"],
"Tuyên Quang":["Tuyên Quang","Hà Giang"],"Lào Cai":["Lào Cai","Yên Bái"],"Thái Nguyên":["Thái Nguyên","Bắc Kạn"],"Phú Thọ":["Phú Thọ","Vĩnh Phúc","Hoà Bình"],
"Bắc Ninh":["Bắc Ninh","Bắc Giang"],"Hưng Yên":["Hưng Yên","Thái Bình"],"Hải Phòng":["Hải Phòng","Hải Dương"],"Quảng Ninh":["Quảng Ninh"],
"Ninh Bình":["Ninh Bình","Hà Nam","Nam Định"],"Thanh Hóa":["Thanh Hóa"],"Nghệ An":["Nghệ An"],"Hà Tĩnh":["Hà Tĩnh"],"Quảng Trị":["Quảng Trị","Quảng Bình"],
"Đà Nẵng":["Đà Nẵng","Quảng Nam"],"Quảng Ngãi":["Quảng Ngãi","Kon Tum"],"Gia Lai":["Gia Lai","Bình Định"],"Đắk Lắk":["Đắk Lắk","Phú Yên"],
"Khánh Hòa":["Khánh Hòa","Ninh Thuận"],"Lâm Đồng":["Lâm Đồng","Bình Thuận","Đắk Nông"],"Đồng Nai":["Đồng Nai","Bình Phước"],"Tây Ninh":["Tây Ninh","Long An"],
"Hồ Chí Minh":["Hồ Chí Minh","Bà Rịa - Vũng Tàu","Bình Dương"],"Đồng Tháp":["Đồng Tháp","Tiền Giang"],"Vĩnh Long":["Vĩnh Long","Bến Tre","Trà Vinh"],
"Cần Thơ":["Cần Thơ","Hậu Giang","Sóc Trăng"],"An Giang":["An Giang","Kiên Giang"],"Cà Mau":["Cà Mau","Bạc Liêu"]}
CENTERS={
"Hà Nội":[105.8542,21.0285],"Huế":[107.5909,16.4637],"Lai Châu":[103.4703,22.3862],"Điện Biên":[103.023,21.386],"Sơn La":[103.914,21.327],"Lạng Sơn":[106.761,21.8537],"Cao Bằng":[106.258,22.6666],"Tuyên Quang":[105.214,21.8236],"Lào Cai":[103.9707,22.4856],"Thái Nguyên":[105.8482,21.5942],"Phú Thọ":[105.4019,21.3227],"Bắc Ninh":[106.0763,21.1861],"Hưng Yên":[106.0511,20.6464],"Hải Phòng":[106.6881,20.8449],"Quảng Ninh":[107.2925,21.0064],"Ninh Bình":[105.9745,20.2506],"Thanh Hóa":[105.7852,19.8067],"Nghệ An":[105.6813,18.6796],"Hà Tĩnh":[105.8877,18.3559],"Quảng Trị":[107.1003,16.8163],"Đà Nẵng":[108.2022,16.0544],"Quảng Ngãi":[108.8044,15.1214],"Gia Lai":[108.0,13.9833],"Đắk Lắk":[108.05,12.6667],"Khánh Hòa":[109.1967,12.2388],"Lâm Đồng":[108.4583,11.9404],"Đồng Nai":[106.8427,10.9574],"Tây Ninh":[106.1099,11.3352],"Hồ Chí Minh":[106.7009,10.7769],"Đồng Tháp":[105.6882,10.4938],"Vĩnh Long":[105.9722,10.2537],"Cần Thơ":[105.7469,10.0452],"An Giang":[105.1259,10.5216],"Cà Mau":[105.1524,9.1769]}

def parse(path):
    counts={"tinh":0,"huyen":0,"xa":0}; old={}; meta={}
    for _,e in etree.iterparse(str(path),events=("end",),tag=NS+"Placemark"):
        d={n.get("name"):(n.findtext(NS+"value") or "").strip() for n in e.findall(".//"+NS+"Data")}
        lv=d.get("layer_level")
        if lv in counts: counts[lv]+=1
        if lv=="tinh":
            old[d["Tinh"]]={"name":d["Tinh"],"area":float(d["Dientich"]),"total":float(d["TongCO2"]),"index":float(d["TongCo2th"])}
            meta={k:d.get(k) for k in ("source_url","exported_at_utc","interpretation_note")}
        e.clear()
    return counts,old,meta

def build(path):
    counts,old,meta=parse(path); expected={x for xs in MERGE.values() for x in xs}
    if set(old)!=expected: raise SystemExit(f"Sai mapping: missing={sorted(expected-set(old))}, extra={sorted(set(old)-expected)}")
    rows=[]
    for new,names in MERGE.items():
        area=sum(old[n]["area"] for n in names); total=sum(old[n]["total"] for n in names)
        rows.append({"province":new,"source_provinces":names,"area_source":round(area,3),"total_co2":round(total,3),"normalized_index":round(total/area*10000,6),"center":CENTERS[new],"components":[old[n] for n in names]})
    area=sum(r["area_source"] for r in rows); total=sum(r["total_co2"] for r in rows)
    return {"schema":"carbonvn-co2-34-v1","source":{"title":"CO₂ Việt Nam — dữ liệu nguồn 63 tỉnh","kml_filename":path.name,"source_url":meta.get("source_url"),"exported_at_utc":meta.get("exported_at_utc"),"source_counts":{"province":counts["tinh"],"district":counts["huyen"],"commune":counts["xa"]},"interpretation_note":meta.get("interpretation_note"),"validated_units":False,"date_field_available":False},"method":{"province_34":"TongCO2 mới = tổng TongCO2 các tỉnh cũ; Dientich mới = tổng Dientich các tỉnh cũ; chỉ số chuẩn hóa = TongCO2 mới / Dientich mới × 10000.","commune_current":"Ước tính runtime theo tỷ trọng diện tích bbox proxy trong tỉnh.","warning":"Không diễn giải thành ppm, tấn CO2 hay CO2/tháng nếu chưa xác nhận metadata."},"national":{"area_source":round(area,3),"total_co2":round(total,3),"normalized_index":round(total/area*10000,6),"province_count":34},"provinces":rows}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("kml",type=Path); ap.add_argument("-o","--output",type=Path,default=Path("data/co2-34.json")); a=ap.parse_args()
    a.output.parent.mkdir(parents=True,exist_ok=True); a.output.write_text(json.dumps(build(a.kml),ensure_ascii=False,separators=(",",":")),encoding="utf-8"); print(a.output)
if __name__=="__main__": main()
