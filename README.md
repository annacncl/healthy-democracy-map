# healthy-democracy-map

Automated pipeline that pulls organization data from Airtable, uploads it to a Mapbox tileset, and publishes an `orgs_index.json` file used by the WordPress-hosted map for search and filtering.

---

## What this repo does

1. **Fetches records** from Airtable (only the records visible in the view named by `AIRTABLE_VIEW_NAME`).
2. **Converts** those records to GeoJSON-LD and uploads them to the Mapbox tileset source `annacorn/healthy-democracy-orgs`.
3. **Publishes** the Mapbox tileset `annacorn.healthy-democracy-orgs` so the live map reflects the latest data.
4. **Writes** `orgs_index.json` — a flat JSON array used by the WordPress map embed for client-side search and filtering — and commits it back to this repo.

The workflow runs automatically **every Monday at 6:00 AM UTC** and can also be triggered manually at any time.

---

## Triggering a manual run

1. Go to the **Actions** tab of this repository on GitHub.
2. In the left sidebar, click **Weekly Map Update**.
3. Click the **Run workflow** dropdown on the right side of the page.
4. Select the branch (`main`) and click **Run workflow**.
5. Refresh the page — the run will appear within a few seconds.

---

## orgs_index.json — URL for WordPress

Once the workflow has run at least once, the index file is available at:

```
https://raw.githubusercontent.com/[YOUR_GITHUB_USERNAME]/healthy-democracy-map/main/orgs_index.json
```

Replace `[YOUR_GITHUB_USERNAME]` with your actual GitHub username. Fetch this URL from your WordPress map embed to power search and filtering.

---

## What is NOT managed by this repo

### networks_meta_from_csv.json

This file contains static metadata about networks (names, descriptions, logos, etc.). It is **not** generated or updated by this pipeline. It lives on WordPress and is fetched separately by the map embed. To update it, edit and re-upload the file on WordPress directly.

### Pin colors and map styling

All visual styling — pin colors, cluster styles, fonts, layer ordering — is configured in **Mapbox Studio** and is completely unaffected by this pipeline. Running this workflow will never change how the map looks, only what data is in it.

---

## Controlling which records appear on the map

Records are filtered by the Airtable **view** named in the `AIRTABLE_VIEW_NAME` secret. Only records visible in that view are pulled and published.

To show or hide an organization on the live map:
- **Show it:** Make sure the record is visible in the Airtable view (not hidden by a filter).
- **Hide it:** Filter the record out of the view, or hide it directly in Airtable.

No code changes are needed — just manage the view in Airtable, then wait for the next Monday run (or trigger one manually).

---

## Repository secrets required

| Secret | Description |
|---|---|
| `AIRTABLE_TOKEN` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Airtable base ID (e.g. `appXXXXXXXX`) |
| `AIRTABLE_TABLE_ID` | Airtable table ID or table name |
| `AIRTABLE_VIEW_NAME` | Name of the Airtable view to filter by (e.g. `Live Records`) |
| `MAPBOX_SK_TOKEN` | Mapbox secret token with tilesets:write scope |
