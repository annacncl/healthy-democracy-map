# healthy-democracy-map

Automated pipeline that pulls organization data from Airtable, uploads it to a Mapbox tileset, and publishes an `orgs_index.json` file used by the WordPress-hosted map for search and filtering.

---

## What this repo does

1. **Fetches records** from Airtable (only the records visible in the view named by `AIRTABLE_VIEW_NAME`).
2. **Converts** those records to GeoJSON-LD and uploads them to the Mapbox tileset source `annacorn/healthy-democracy-orgs`.
3. **Publishes** the Mapbox tileset `annacorn.healthy-democracy-orgs` so the live map reflects the latest data.
4. **Writes** `orgs_index.json` — a flat JSON array used by the WordPress map embed for client-side search and filtering — and commits it back to this repo.
5. **Writes** `networks_meta.json` — Geography/Website/Description for every network referenced by an org, pulled fresh from the Airtable Networks table (`AIRTABLE_NETWORKS_TABLE_ID`) each run — and commits it back to this repo. This drives the map's National/Local network filter dropdowns.

`map.js` — the map's front-end code (filters, popups, legend, search) — also lives in this repo and is served the same way. It isn't touched by the weekly pipeline; you edit it directly (see below).

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
https://cdn.jsdelivr.net/gh/[YOUR_GITHUB_USERNAME]/healthy-democracy-map@main/orgs_index.json
```

Replace `[YOUR_GITHUB_USERNAME]` with your actual GitHub username. Fetch this URL from your WordPress map embed to power search and filtering.

Use the jsDelivr URL, not `raw.githubusercontent.com` — GitHub's raw-content host isn't meant for production website traffic and will intermittently 429/503 under real visitor load, especially as the file has grown past several MB. jsDelivr is a CDN built for exactly this and won't fall over the same way. The workflow's "Purge jsDelivr cache" step keeps it in sync — jsDelivr otherwise caches for up to ~24h.

---

## networks_meta.json — URL for WordPress

Same pattern as above, generated fresh from the Airtable Networks table every run:

```
https://cdn.jsdelivr.net/gh/[YOUR_GITHUB_USERNAME]/healthy-democracy-map@main/networks_meta.json
```

This replaces the old hand-maintained `networks_meta_from_csv.json` that lived on WordPress — that file had to be manually kept in sync with Airtable and had drifted out of date (missing networks that existed in Airtable but never got added to the file, so they were invisible in the map's filter dropdowns despite showing correctly on individual org popups). Now any network added or edited in the Airtable Networks table (`AIRTABLE_NETWORKS_TABLE_ID`) shows up automatically on the next run — no manual file maintenance needed.

To control what shows in the filter dropdown / tooltips for a network, edit its `Geography`, `Website`, and `Description` fields directly in the Airtable Networks table.

---

## map.js — the map's front-end script

The entire map application (Mapbox init, filters, search, popups, legend, category colors) lives in [`map.js`](map.js) and is served from:

```
https://cdn.jsdelivr.net/gh/[YOUR_GITHUB_USERNAME]/healthy-democracy-map@main/map.js
```

WordPress no longer holds this code — it just loads it. This replaces the old approach of pasting the entire script into a WPCode PHP snippet as a giant inline block, which was fragile (a stray character could break the whole `wp_add_inline_script` heredoc, and there was no diff/rollback history).

**To edit the map's behavior:** edit `map.js` in this repo, commit, and push to `main`. A workflow (`purge-map-js-cache.yml`) automatically purges the jsDelivr cache for `map.js` on every push, so changes go live within roughly a minute — no manual cache-purge step needed.

**The WordPress snippet is now just a loader.** In WPCode, the entire map PHP function should be:

```php
add_action('wp_enqueue_scripts', function () {
    if (!is_page('healthy-democracy-map')) {
        return;
    }

    wp_enqueue_style(
        'mapbox-gl',
        'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.css',
        [],
        '3.17.0'
    );

    wp_enqueue_script(
        'mapbox-gl',
        'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.js',
        [],
        '3.17.0',
        true
    );

    wp_enqueue_script(
        'hd-map',
        'https://cdn.jsdelivr.net/gh/[YOUR_GITHUB_USERNAME]/healthy-democracy-map@main/map.js',
        ['mapbox-gl'],
        null,
        true
    );
});
```

Replace `[YOUR_GITHUB_USERNAME]` with your actual GitHub username/org, and confirm `healthy-democracy-map` is the real slug of the map page (check the Page's URL slug in the WordPress editor) before saving.

Passing `null` as the version argument tells WordPress not to append its own `?ver=` query string — jsDelivr serves `map.js` at a single URL, and the purge workflow above keeps that URL's cache fresh after every push, so a version query string isn't needed here (unlike normal WP-hosted assets).

---

## What is NOT managed by this repo

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
