import json

input_file = "mergeFromCity_2.geojson"
output_file = "locators/content/shelters.json"

print("Processing shelter data... Please wait.")

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

optimized_features = []

# Mapping Japanese disaster flags to compact keys
disaster_keys = {
    "洪水": "flood",
    "崖崩れ、土石流及び地滑り": "landslide",
    "高潮": "surge",
    "地震": "quake",
    "津波": "tsunami",
    "大規模な火事": "fire",
    "内水氾濫": "inland_flood",
    "火山現象": "volcano"
}

for feature in data.get("features", []):
    props = feature.get("properties", {})
    geom = feature.get("geometry", {})
    coords = geom.get("coordinates", [])

    # Round coordinates to 5 decimal places (~1m accuracy)
    if coords and len(coords) >= 2:
        rounded_coords = [round(coords[0], 5), round(coords[1], 5)]
    else:
        rounded_coords = coords

    # Build compact property object
    compact_props = {
        "name": props.get("施設・場所名", ""),
        "address": props.get("住所", ""),
        "city": props.get("都道府県名及び市町村名", ""),
    }

    # Add disaster availability flags (1 = suitable, 0 = not suitable)
    disasters = []
    for jp_key, en_key in disaster_keys.items():
        if props.get(jp_key) == "1":
            disasters.append(en_key)
            
    compact_props["disasters"] = disasters

    optimized_features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": rounded_coords
        },
        "properties": compact_props
    })

optimized_geojson = {
    "type": "FeatureCollection",
    "features": optimized_features
}

# Save compact minified JSON
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(optimized_geojson, f, ensure_ascii=False, separators=(',', ':'))

print(f"Done! Optimized shelters saved to {output_file}")