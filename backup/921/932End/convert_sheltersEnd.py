import csv
import json
import re

# Dictionary for common Japanese municipal facility suffixes and administrative terms
SUFFIX_MAP = {
    "指定緊急避難場所": {
        "en": " Emergency Evacuation Site (Immediate)", 
        "zh": "指定紧急避难场所 (即刻避难)"
    },
    "指定避難所": {
        "en": " Designated Shelter (Overnight)", 
        "zh": "指定避难所 (长居/住宿)"
    },
    "広域避難場所": {
        "en": " Primary Evacuation Area (Wide-area)", 
        "zh": "广域避难场所"
    },
    "避難所": {
        "en": " Shelter", 
        "zh": "避难所"
    },
    "市民センター": {"en": " Civic Center", "zh": "市民中心"},
    "公民館": {"en": " Community Center", "zh": "公民馆"},
    "体育館": {"en": " Gymnasium", "zh": "体育馆"},
    "市役所": {"en": " City Hall", "zh": "市政府"},
    "役場": {"en": " Town Hall", "zh": "町役场"},
    "高等学校": {"en": " High School", "zh": "高中"},
    "小学校": {"en": " Elementary School", "zh": "小学"},
    "中学校": {"en": " Junior High School", "zh": "中学"},
    "高校": {"en": " High School", "zh": "高中"},
    "大学": {"en": " University", "zh": "大学"},
    "公園": {"en": " Park", "zh": "公园"},
    "広場": {"en": " Plaza", "zh": "广场"}
}

def translate_jp_name(jp_name):
    """
    Translates Japanese shelter names and pairs them side-by-side with the original Japanese text.
    """
    if not jp_name:
        return "", ""

    en_translated = jp_name
    zh_translated = jp_name

    for jp_term, trans in SUFFIX_MAP.items():
        if jp_term in jp_name:
            en_translated = re.sub(jp_term, trans["en"], en_translated)
            zh_translated = re.sub(jp_term, trans["zh"], zh_translated)

    en_side_by_side = f"{en_translated.strip()} ({jp_name})"
    zh_side_by_side = f"{zh_translated.strip()} / {jp_name}"

    return en_side_by_side, zh_side_by_side

def get_row_value(row, possible_keys):
    """
    Searches a CSV row dictionary for matching keys, ignoring whitespace/BOM issues.
    """
    for key, value in row.items():
        if not key:
            continue
        clean_key = key.strip().replace('\ufeff', '')
        if clean_key in possible_keys:
            return value.strip() if value else ""
    return ""

def convert_japanese_csv_to_geojson(csv_file_path, output_geojson_path):
    features = []
    rows = []

    # Try encodings commonly used by Japanese government open data
    encodings_to_try = ['utf-8-sig', 'shift_jis', 'cp932', 'utf-8']
    
    for encoding in encodings_to_try:
        try:
            with open(csv_file_path, mode='r', encoding=encoding) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                if rows:
                    print(f"Successfully read CSV using encoding: '{encoding}'")
                    break
        except (UnicodeDecodeError, Exception):
            continue

    if not rows:
        print("Error: Could not read CSV file with any standard Japanese encoding.")
        return

    # Process records
    for idx, row in enumerate(rows):
        lat_str = get_row_value(row, ['緯度', 'Latitude', 'lat'])
        lng_str = get_row_value(row, ['経度', 'Longitude', 'lng'])

        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except (ValueError, TypeError):
            continue  # Skip rows without valid numeric coordinates

        jp_name = get_row_value(row, ['施設・場所名', '名称', '避難所名']) or f"Shelter {idx+1}"
        address = get_row_value(row, ['住所', '所在地'])
        raw_type = get_row_value(row, ['指定緊急避難場所', '避難所_分類', '種別']) or "指定緊急避難場所"

        en_name, zh_name = translate_jp_name(jp_name)
        en_type, zh_type = translate_jp_name(raw_type)

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]  # GeoJSON format: [longitude, latitude]
            },
            "properties": {
                "id": f"shelter_{idx+1}",
                "jp_name": jp_name,
                "name": {
                    "en": en_name,
                    "zh": zh_name
                },
                "type": {
                    "en": en_type,
                    "zh": zh_type
                },
                "address": address
            }
        }
        features.append(feature)

    geojson_data = {
        "type": "FeatureCollection",
        "features": features
    }

    # Ensure output directory exists and write file
    import os
    os.makedirs(os.path.dirname(output_geojson_path), exist_ok=True)

    with open(output_geojson_path, mode='w', encoding='utf-8') as out_f:
        json.dump(geojson_data, out_f, ensure_ascii=False, indent=2)

    print(f"Successfully converted {len(features)} records into {output_geojson_path}")

if __name__ == "__main__":
    convert_japanese_csv_to_geojson('shelters_raw.csv', 'locators/content/shelters.json')