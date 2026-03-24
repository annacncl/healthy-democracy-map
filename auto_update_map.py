import os
import json
import requests

AIRTABLE_TOKEN = os.environ["AIRTABLE_TOKEN"]
AIRTABLE_BASE_ID = os.environ["AIRTABLE_BASE_ID"]
AIRTABLE_TABLE_ID = os.environ["AIRTABLE_TABLE_ID"]
AIRTABLE_VIEW_NAME = os.environ["AIRTABLE_VIEW_NAME"]
MAPBOX_SK_TOKEN = os.environ["MAPBOX_SK_TOKEN"]

# Optional: ID of the table that "Network Membership" links to.
AIRTABLE_NETWORKS_TABLE_ID = os.environ.get("AIRTABLE_NETWORKS_TABLE_ID", "")
# Optional: ID of the table that "Category of Work" links to.
AIRTABLE_CATEGORIES_TABLE_ID = os.environ.get("AIRTABLE_CATEGORIES_TABLE_ID", "")

MAPBOX_USERNAME = "annacorn"
MAPBOX_TILESET_SOURCE_ID = "healthy-democracy-orgs"
MAPBOX_TILESET_ID = "annacorn.healthy-democracy-orgs"

INDEX_FILE = "orgs_index.json"


# ---------------------------------------------------------------------------
# Airtable helpers
# ---------------------------------------------------------------------------

def fetch_all_records(table_id, view_name=None):
    """Fetch every record from an Airtable table, handling pagination."""
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{table_id}"
    headers = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}
    params = {}
    if view_name:
        params["view"] = view_name

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

    return records


def build_network_lookup():
    """
    Return a dict mapping Airtable record ID -> network name.
    Falls back to an empty dict if AIRTABLE_NETWORKS_TABLE_ID is not set.
    """
    if not AIRTABLE_NETWORKS_TABLE_ID:
        print("AIRTABLE_NETWORKS_TABLE_ID not set — network names will be omitted.")
        return {}

    print(f"Fetching network records from table '{AIRTABLE_NETWORKS_TABLE_ID}'...")
    records = fetch_all_records(AIRTABLE_NETWORKS_TABLE_ID)
    lookup = {}
    for rec in records:
        name = rec.get("fields", {}).get("Network/Coalition", "").strip()
        if name:
            lookup[rec["id"]] = name
    print(f"  Loaded {len(lookup)} network names.")
    return lookup


def build_category_lookup():
    """Return a dict mapping Airtable record ID -> category name."""
    if not AIRTABLE_CATEGORIES_TABLE_ID:
        print("AIRTABLE_CATEGORIES_TABLE_ID not set — category names will be omitted.")
        return {}

    print(f"Fetching category records from table '{AIRTABLE_CATEGORIES_TABLE_ID}'...")
    records = fetch_all_records(AIRTABLE_CATEGORIES_TABLE_ID)
    lookup = {}
    for rec in records:
        name = rec.get("fields", {}).get("Name", "").strip()
        if name:
            lookup[rec["id"]] = name
    print(f"  Loaded {len(lookup)} category names.")
    return lookup


def resolve_linked_field(field_value, lookup):
    """
    Resolve a linked field value (record ID or list of IDs) to names using a lookup dict.
    Returns a list of resolved name strings.
    """
    if not field_value:
        return []
    if isinstance(field_value, str):
        if field_value.startswith("rec") and field_value in lookup:
            return [lookup[field_value]]
        elif not field_value.startswith("rec"):
            return [s.strip() for s in field_value.split(",") if s.strip()]
    if isinstance(field_value, list):
        names = []
        for item in field_value:
            if isinstance(item, str):
                if item.startswith("rec") and item in lookup:
                    names.append(lookup[item])
                elif not item.startswith("rec"):
                    names.append(item.strip())
        return names
    return []


def resolve_networks(field_value, network_lookup):
    """Resolve Network Membership linked field to a list of network name strings."""
    return resolve_linked_field(field_value, network_lookup)


# ---------------------------------------------------------------------------
# Conversion helpers
# ---------------------------------------------------------------------------

def parse_coords(fields):
    """Return (lat, lng) floats or (None, None) if missing/invalid."""
    lat = fields.get("Latitude")
    lng = fields.get("Longitude")
    if lat is None or lng is None:
        return None, None
    try:
        return float(lat), float(lng)
    except (TypeError, ValueError):
        return None, None


def record_to_feature(record, network_lookup, category_lookup):
    """Convert an Airtable record to a GeoJSON Feature. Returns None if lat/lng missing."""
    fields = record.get("fields", {})
    lat, lng = parse_coords(fields)
    if lat is None:
        return None

    networks = resolve_networks(fields.get("Network Membership"), network_lookup)
    categories = resolve_linked_field(fields.get("Category of Work"), category_lookup)

    # Start with ALL Airtable fields so nothing is accidentally dropped from the tileset.
    # Skip linked fields that we'll overwrite with resolved names below.
    SKIP_FIELDS = {"Latitude", "Longitude", "Network Membership", "Category of Work"}
    properties = {
        k: (v if not isinstance(v, list) else ", ".join(str(i) for i in v))
        for k, v in fields.items()
        if k not in SKIP_FIELDS
    }

    # Write resolved human-readable values
    properties["Network Membership"] = ", ".join(networks) if networks else None
    properties["Category of Work"] = ", ".join(categories) if categories else None

    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": properties,
    }


def record_to_index_entry(record, network_lookup, category_lookup):
    """Convert an Airtable record to an orgs_index entry. Returns None if lat/lng missing."""
    fields = record.get("fields", {})
    lat, lng = parse_coords(fields)
    if lat is None:
        return None

    networks = resolve_networks(fields.get("Network Membership"), network_lookup)
    categories = resolve_linked_field(fields.get("Category of Work"), category_lookup)

    return {
        "name": fields.get("Name"),
        "city": fields.get("City"),
        "state": fields.get("State"),
        "category": ", ".join(categories) if categories else None,
        "mission": fields.get("Mission/Description"),
        "website": fields.get("Website"),
        "networks": networks,          # Array<string> — what the JS expects
        "email": fields.get("General Contact Email"),
        "latitude": lat,
        "longitude": lng,
    }


# ---------------------------------------------------------------------------
# Mapbox helpers
# ---------------------------------------------------------------------------

def build_geojsonld(features):
    """One JSON feature per line, no wrapping array."""
    return "\n".join(json.dumps(f) for f in features)


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
    print(f"Tileset source upload: {response.status_code} {response.text}")


def publish_tileset():
    """Publish the Mapbox tileset via POST request."""
    url = (
        f"https://api.mapbox.com/tilesets/v1/{MAPBOX_TILESET_ID}/publish"
        f"?access_token={MAPBOX_SK_TOKEN}"
    )
    response = requests.post(url)
    response.raise_for_status()
    print(f"Tileset publish: {response.status_code} {response.text}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Resolve linked field lookups before processing orgs
    network_lookup = build_network_lookup()
    category_lookup = build_category_lookup()

    # 2. Fetch org records filtered by the live view
    print(f"Fetching org records from view '{AIRTABLE_VIEW_NAME}'...")
    records = fetch_all_records(AIRTABLE_TABLE_ID, view_name=AIRTABLE_VIEW_NAME)
    print(f"  Fetched {len(records)} records.")

    # 3. Convert
    features = []
    index_entries = []
    for record in records:
        feature = record_to_feature(record, network_lookup, category_lookup)
        if feature:
            features.append(feature)

        entry = record_to_index_entry(record, network_lookup, category_lookup)
        if entry:
            index_entries.append(entry)

    print(f"  {len(features)} records have coordinates and will be uploaded to Mapbox.")

    # 4. Upload to Mapbox
    upload_to_mapbox(build_geojsonld(features))
    publish_tileset()

    # 5. Write orgs_index.json
    #    Shape: { "total": N, "records": [...] }
    #    The JS reads data.total for the stat and iterates data.records for filtering/search.
    index_payload = {
        "total": len(index_entries),
        "records": index_entries,
    }
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index_payload, f, indent=2, ensure_ascii=False)
    print(f"Wrote {INDEX_FILE} with {len(index_entries)} entries.")


if __name__ == "__main__":
    main()
