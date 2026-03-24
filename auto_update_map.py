import os
import json
import requests

AIRTABLE_TOKEN = os.environ["AIRTABLE_TOKEN"]
AIRTABLE_BASE_ID = os.environ["AIRTABLE_BASE_ID"]
AIRTABLE_TABLE_ID = os.environ["AIRTABLE_TABLE_ID"]
AIRTABLE_VIEW_NAME = os.environ["AIRTABLE_VIEW_NAME"]
MAPBOX_SK_TOKEN = os.environ["MAPBOX_SK_TOKEN"]

MAPBOX_USERNAME = "annacorn"
MAPBOX_TILESET_SOURCE_ID = "healthy-democracy-orgs"
MAPBOX_TILESET_ID = "annacorn.healthy-democracy-orgs"

GEOJSONLD_FILE = "orgs.geojsonld"
INDEX_FILE = "orgs_index.json"


def fetch_airtable_records():
    """Fetch all records from Airtable with pagination."""
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
    headers = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}
    params = {"view": AIRTABLE_VIEW_NAME}

    records = []
    while True:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        params["offset"] = offset

    print(f"Fetched {len(records)} records from Airtable.")
    return records


def record_to_feature(record):
    """Convert an Airtable record to a GeoJSON Feature. Returns None if lat/lng missing."""
    fields = record.get("fields", {})

    lat = fields.get("Latitude")
    lng = fields.get("Longitude")
    if lat is None and lng is None:
        return None

    # Coerce to float in case they're stored as strings
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None

    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat],
        },
        "properties": {
            "name": fields.get("Name"),
            "city": fields.get("City"),
            "state": fields.get("State"),
            "category": fields.get("Category of Work"),
            "mission": fields.get("Mission"),
            "website": fields.get("Website"),
            "networks": fields.get("Network Membership"),
            "email": fields.get("General Contact Email"),
        },
    }
    return feature


def record_to_index_entry(record):
    """Convert an Airtable record to an orgs_index entry. Returns None if lat/lng missing."""
    fields = record.get("fields", {})

    lat = fields.get("Latitude")
    lng = fields.get("Longitude")
    if lat is None and lng is None:
        return None

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None

    return {
        "name": fields.get("Name"),
        "city": fields.get("City"),
        "state": fields.get("State"),
        "category": fields.get("Category of Work"),
        "mission": fields.get("Mission"),
        "website": fields.get("Website"),
        "networks": fields.get("Network Membership"),
        "email": fields.get("General Contact Email"),
        "latitude": lat,
        "longitude": lng,
    }


def build_geojsonld(features):
    """Write GeoJSON-LD: one JSON feature per line, no wrapping array."""
    lines = [json.dumps(feature) for feature in features]
    return "\n".join(lines)


def upload_to_mapbox(geojsonld_content):
    """Upload GeoJSON-LD to Mapbox tileset source via PUT request."""
    url = (
        f"https://api.mapbox.com/tilesets/v1/sources/{MAPBOX_USERNAME}/"
        f"{MAPBOX_TILESET_SOURCE_ID}?access_token={MAPBOX_SK_TOKEN}"
    )
    files = {
        "file": ("orgs.geojsonld", geojsonld_content.encode("utf-8"), "application/x-ndjson")
    }
    response = requests.put(url, files=files)
    response.raise_for_status()
    print(f"Tileset source upload response: {response.status_code} {response.text}")


def publish_tileset():
    """Publish the Mapbox tileset via POST request."""
    url = (
        f"https://api.mapbox.com/tilesets/v1/{MAPBOX_TILESET_ID}/publish"
        f"?access_token={MAPBOX_SK_TOKEN}"
    )
    response = requests.post(url)
    response.raise_for_status()
    print(f"Tileset publish response: {response.status_code} {response.text}")


def main():
    records = fetch_airtable_records()

    features = []
    index_entries = []

    for record in records:
        feature = record_to_feature(record)
        if feature:
            features.append(feature)

        entry = record_to_index_entry(record)
        if entry:
            index_entries.append(entry)

    print(f"{len(features)} records with coordinates will be uploaded to Mapbox.")

    # Write GeoJSON-LD and upload to Mapbox
    geojsonld_content = build_geojsonld(features)
    upload_to_mapbox(geojsonld_content)
    publish_tileset()

    # Write orgs_index.json (committed back to repo by the workflow)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index_entries, f, indent=2, ensure_ascii=False)
    print(f"Wrote {INDEX_FILE} with {len(index_entries)} entries.")


if __name__ == "__main__":
    main()
