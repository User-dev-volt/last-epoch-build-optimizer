# Icon Pipeline Research Spike — Findings

**Date:** 2026-05-08  
**Story:** 2.1  
**Researcher:** Claude (claude-sonnet-4-6)

---

## 1. Unity Install Path & Icon Location

**Steam installation root:**
```
C:\Program Files (x86)\Steam\steamapps\common\Last Epoch\
```

**Icon bundle location (confirmed):**
```
C:\Program Files (x86)\Steam\steamapps\common\Last Epoch\
  Last Epoch_Data\
    StreamingAssets\
      aa\
        StandaloneWindows64\
          skill_icons_assets_all.bundle   ← 16.07 MB
        catalog.bin                        ← 3.25 MB binary Addressables catalog
        settings.json                      ← Addressables 2.3.16 config
```

**No raw PNG files exist on the filesystem.** All skill icons are embedded inside the `skill_icons_assets_all.bundle` file. There are no loose `.png`, `.tex`, or `.sprite` files in any subfolder of the installation.

**Unity version confirmed:** `6000.0.42f1` (Unity 6.0.42f1), verified from both `globalgamemanagers` and `app.info`.

---

## 2. Asset Bundle Format

### System: Unity Addressables, not a raw AssetBundle

Last Epoch uses **Unity Addressables 2.3.16** — a higher-level abstraction on top of AssetBundles. The game's asset loading pipeline is:

1. At startup, load `catalog.bin` (binary Addressables catalog, 3.25 MB)
2. Resolve an Addressable address (e.g., `Paladin Skills/Smite`) to a bundle filename
3. Load the bundle (`skill_icons_assets_all.bundle`)
4. Extract the specific asset by name (e.g., `skillIcon-smite.png`)

### Bundle header analysis

The `skill_icons_assets_all.bundle` file begins with:
```
Magic:            UnityFS\0
File format ver:  8  (Unity 6 format — see critical note below)
Min reader ver:   5.x.x
Unity version:    6000.0.42f1
Bundle size:      16,851,998 bytes (16.07 MB)
Metadata flags:   0x43  → bits 0-5 = 3 (LZ4HC compression for metadata section)
                       → bit 6 = 1 (HasDirectoryInfo)
```

**UnityFS file format version 8** is the format introduced with Unity 6. It is a breaking change from version 7 (Unity 2020–2022 LTS).

### Internal asset naming

The bundle contains **1,193 skill-related icon textures** (buffs, skill VFX variants, main icons, etc.). They are named with the prefix `skillIcon-` followed by an inconsistently cased skill name:

| Our skillId (game data) | Internal bundle asset name |
|-------------------------|---------------------------|
| `acolyte-rip-blood`     | `skillIcon-rip blood.png` |
| `acolyte-harvest`       | `skillIcon-harvest.png` |
| `mage-fireball`         | `skillIcon-fireball.png` |
| `primalist-fury-leap`   | `skillIcon-fury-leap.png` |
| `rogue-puncture`        | `skillIcon-puncture.png` |
| `rogue-dancing-strikes` | `skillIcon-dancing-strikes.png` |
| `sentinel-anomaly`      | `skillIcon-anomaly.png` |

Each skill has multiple icon variants (e.g., `skillIcon-fireball.png`, `skillIcon-fireball alt.png`, `skillIcon-homing-fireballs.png`). There is **no algorithmic mapping** from our kebab-case skillId to the correct primary bundle asset name — a manual lookup table or secondary data source is required.

---

## 3. Rust Extraction Viability

### Candidate crates investigated

| Crate | Version | Status | Unity 6 / v8 Support |
|-------|---------|--------|----------------------|
| `unity-asset` (Latias94) | 0.3.0 | Active (2025) | ⚠️ Unconfirmed |
| `unity-asset-binary` | 0.2.0 | Active (2025) | ⚠️ Unconfirmed |
| `unity-asset-decode` | 0.2.0 | Active (2025) | ⚠️ Unconfirmed (needed for PNG) |
| `io_unity` (gameltb) | latest | Active | ⚠️ Requires TypeTree dumps |
| `RustyAssetBundleEXtractor` | WIP | "can do about nothing" | ❌ |

### Primary candidate: `unity-asset` v0.3.0

This is the most complete pure-Rust option. The `unity-asset-binary` + `unity-asset-decode` combination claims:
- UnityFS parsing with compression support: None, LZ4, LZ4HC, LZMA, Brotli ✅
- Texture2D complete parsing + best-effort decoding + PNG export ✅
- Pure Rust — no C/C++ native dependencies ✅
- Compiles on Windows MSVC target (standard Rust workspace, no platform exclusions) ✅

**Critical concern — UnityFS version 8:**  
The crate defines `UNITY_FS_CURRENT = 7` in its source, but the parser only validates `version != 0`. It will *attempt* to parse version 8 without rejecting it, but version 8 introduced structural changes (the block layout is different from v7). Whether the parse succeeds or fails silently requires **actual testing against our bundle**.

**Critical concern — stripped type trees:**  
Unity production builds typically strip type tree metadata from bundles to reduce file size. Without embedded type tree info, most Rust Unity parsers cannot determine the binary layout of assets (Texture2D, etc.). The `io_unity` crate mitigates this via external TypeTree dumps from the TypeTreeDumps repository, but `unity-asset` has no documented fallback for stripped type trees.

**To determine:** Load `skill_icons_assets_all.bundle` with `unity-asset-binary`, attempt to enumerate objects inside the serialized file, and check if Texture2D assets are readable. This one test would resolve the GO/NO-GO question definitively.

### Addressables catalog complexity

The binary catalog (`catalog.bin`) format is internal to Unity Addressables and changes between versions. **No Rust crate supports parsing it.** However, the bundle path is hardcoded as:

```
{RuntimePath}/StandaloneWindows64/skill_icons_assets_all.bundle
```

The bundle path can be hardcoded in Rust code, bypassing the need to parse the catalog at all. The catalog is only needed to discover which bundle contains which asset — we already know this.

---

## 4. CDN URL Pattern

### `assets.lastepochtools.com` — Does not exist

The URL pattern assumed in the epics (`https://assets.lastepochtools.com/skills/{skill_id}.png`) is **incorrect**. The subdomain `assets.lastepochtools.com` does not resolve.

### `www.lastepochtools.com` — Confirmed accessible, but uses sprite sheets (manual browser inspection 2026-05-08)

The domain is protected by Cloudflare WAF against automated access but loads normally in a real browser. Manual DevTools inspection reveals that **skill icons are not served as individual image files** — the site uses CSS sprite sheets.

**How it works:**
- A single large WebP image is downloaded containing many icons packed together
- CSS `background-position` offsets select the specific 64×64 region for each skill
- No per-skill URL exists that returns a single icon image

**Confirmed example — Abyssal Echoes (Acolyte/Lich):**
```
Sprite sheet URL:  https://www.lastepochtools.com/data/version145/planner/res/01a7d73f4d0c94422564bdc8e9a068e6.webp
Background offset: background-position: -130px -453px
Rendered size:     64px × 64px
```

**Mapping required:** `skillId → (sprite_sheet_url, x_offset, y_offset)`

This is not derivable from our game data. The `{hash}` in the sprite sheet URL is 32 hex characters (MD5 length) but does not match MD5 of any candidate string tested: skill name variants, kebab-case skillId, or bundle asset names (`skillIcon-{name}.png`). It is a lastepochtools.com internal identifier.

**What Story 2.2 would need for this CDN path:**
1. An API or data source from lastepochtools.com that maps each skill to its `(sprite_sheet_url, x, y)` tuple
2. Rust code to: fetch the sprite sheet WebP → decode WebP → crop the 64×64 region → encode as PNG → write to icon cache
3. A WebP decoding dependency in `Cargo.toml` (e.g., `image` crate with WebP feature)
4. Version tracking: `version145` changes with each game patch

**Compared to local game file extraction:** the CDN sprite sheet path is not simpler than the `unity-asset` bundle extraction path — both require image format decoding (WebP vs DXT) and pixel cropping. The CDN path additionally requires a live internet connection and a version-coupled external mapping.

### `tunklab.com` — Currently down (likely temporary)

The site returns Cloudflare error 526 (Invalid SSL certificate) — this is typically a temporary origin SSL misconfiguration, not a permanent closure. Revisit before Story 2.2 CDN scope is finalized.

### `tunklab.com` — Currently down (likely temporary)

The site returns Cloudflare error 526 (Invalid SSL certificate) — this is typically a temporary origin SSL misconfiguration, not a permanent closure. Revisit before Story 2.2 CDN scope is finalized.

---

## 5. GO / NO-GO Recommendation

### Game file extraction: **CONDITIONAL NO-GO**

> No Rust crate is confirmed to work with Unity 6 (UnityFS version 8) + LZ4HC compression + likely-stripped type trees. A quick empirical test of `unity-asset` v0.3.0 against our specific bundle would resolve this.

**Recommended test (30 min):**
```rust
// In a throwaway Rust binary (not in Tauri):
use unity_asset_binary::bundle::Bundle;
let bundle = Bundle::from_path("path/to/skill_icons_assets_all.bundle")?;
for file in bundle.files() {
    println!("{:?}", file.objects());
}
```
If this lists Texture2D objects, upgrade to **GO**. If it panics or returns empty, confirm **NO-GO**.

Additional blockers even if extraction works:
- No algorithmic skillId → bundle asset name mapping exists; a hand-curated lookup table (~50 rows for main skills) is required
- The Addressables binary catalog format is not parseable from Rust; the bundle path must be hardcoded per platform

### CDN path: **NOT RECOMMENDED — sprite sheet complexity equals local extraction complexity**

> `lastepochtools.com` uses CSS sprite sheets, not individual icon URLs. Fetching a single skill icon requires: discovering the sprite sheet mapping (skillId → sheet URL + pixel offset), downloading a multi-icon WebP, decoding WebP, cropping a 64×64 region, and encoding to PNG. This is comparable in complexity to local game file extraction and adds internet dependency plus version coupling (`version145` changes with patches).

**Revised assessment:** The CDN path is not the "easy fallback" originally anticipated. Both paths have similar implementation effort. The **local game file extraction path** (if `unity-asset` passes the empirical test) is actually preferable: no internet required, no external dependency, no version string maintenance.

**Recommended priority order for Story 2.2:**
1. Run the `unity-asset` v0.3.0 empirical test (30 min) — if GO, implement local extraction as the primary path
2. If NO-GO, reassess: either implement the sprite sheet CDN path (high complexity) or defer icon rendering until a better source is available
3. Contact lastepochtools.com maintainer (Dammitt, Last Epoch Discord) to ask if they offer a simpler per-skill icon API endpoint — that would change this calculus

---

## 6a. Passive Tree Node Icons — Supplemental Finding

**Investigated during code review (2026-05-08).**

No dedicated passive tree node icon bundle exists in `StreamingAssets/aa/StandaloneWindows64/`. The named bundle inventory contains only `skill_icons_assets_all.bundle` for icons. Passive node icons are almost certainly embedded in either:

- `defaultlocalgroup_assets_all.bundle` (390 MB — Unity's catch-all Addressables group)
- One or more of the 495 anonymous `duplicateassetssortedbylabel_assets_duplicatebundleN.bundle` files

Identifying which bundle contains passive node icons requires a Unity asset viewer tool (e.g., AssetRipper) to catalog bundle contents — substantially more work than the skill icon pipeline, which has a single known bundle path.

**Decision required for Story 2.4:** Either:
1. **Limit "icon-accurate" scope to active skill tree nodes only** — passive tree hexagons use colored/styled rendering (already implemented) with no per-node icon art. This is the recommended path unless CDN hosts passive icons.
2. **Source passive node icons from CDN** — only viable if D1 (CDN URL confirmation) confirms that `lastepochtools.com` also serves passive node icon images.

Until D1 is resolved and this scope decision is made, Story 2.4 should be written assuming option 1 (no passive node icons from local files).

---

## 7. Pre-Story 2.2 Action: One-Time Icon Extraction Script

**Decision (2026-05-08):** The CDN path (lastepochtools.com) uses sprite sheets — comparable complexity to local extraction and adds internet dependency + version coupling. The preferred approach is a **standalone Rust extraction script** that builds a static icon database once, bundled with the app.

### What to build

A throwaway Rust binary (NOT part of the Tauri app) at e.g. `tools/extract-icons/src/main.rs`:

```rust
// Cargo.toml deps needed:
// unity-asset-binary = "0.2.0"
// unity-asset-decode = "0.2.0"
// image = { version = "0.25", features = ["png"] }

use unity_asset_binary::bundle::Bundle;

fn main() {
    let bundle_path = r"C:\Program Files (x86)\Steam\steamapps\common\Last Epoch\Last Epoch_Data\StreamingAssets\aa\StandaloneWindows64\skill_icons_assets_all.bundle";
    let bundle = Bundle::from_path(bundle_path).expect("failed to open bundle");

    for file in bundle.files() {
        for obj in file.objects() {
            // Check if obj is Texture2D, decode to PNG, save as {name}.png
            println!("{:?}", obj);
        }
    }
}
```

**Step 1 — Empirical test (15 min):** Get the object list printing. If Texture2D objects appear → GO. If panic or empty → NO-GO, fall back to lastepochtools.com sprite sheet approach (see §4).

**Step 2 — Full extraction (if GO, ~30 min more):** Decode each Texture2D to PNG using `unity-asset-decode`. Save output to `lebo/src-tauri/resources/icons/skills/{bundle_asset_name}.png`.

**Step 3 — skillId mapping:** The bundle uses inconsistent naming (e.g. `skillIcon-rip blood.png`, not `acolyte-rip-blood`). After extraction, build a mapping file `lebo/src-tauri/resources/icons/skill-icon-map.json`:
```json
{ "acolyte-rip-blood": "skillIcon-rip blood.png", ... }
```
Start with the ~7 examples documented in §2 and extend from the extracted file list.

**Step 4 — Story 2.2 becomes simple:** With pre-extracted PNGs in `resources/icons/skills/`, Story 2.2's Rust commands just copy from resources to the icon cache on first launch. No runtime bundle parsing, no CDN calls.

### Fallback (if unity-asset fails v8 test)

Use the lastepochtools.com sprite sheet approach instead:
1. Find the XHR/Fetch data endpoint in browser DevTools on `lastepochtools.com/planner` — it will return a JSON file with skill data including sprite sheet URLs and offsets
2. Write a Node.js or Python script to download sprite sheets and crop 64×64 regions
3. Same output: `resources/icons/skills/{skillId}.png`

### Run this before starting Story 2.2

Story 2.2 (`2-2-rust-icon-pipeline-commands`) should NOT be started until this script has produced the icon files. When running `bmad-create-story` for Story 2.2, reference this section for context.

---

## 6. Impact on Story 2.2

Given the findings above, Story 2.2's implementation scope depends on which blockers are resolved:

**If both paths remain blocked:**
- Story 2.2 cannot be implemented yet
- Resolve the CDN URL blocker (manual browser inspection, 2 min) as first priority
- Optionally run the `unity-asset` empirical test to determine game-file path viability

**If CDN URL is confirmed (most likely short-term path):**
- Story 2.2 implements CDN fetch as the sole path
- Skips `detect_steam_path()` and bundle extraction entirely
- The `iconSource` field in the manifest is set to `"cdn"`
- Story 2.2 must translate our kebab-case skillId to whatever identifier the CDN uses (requires the confirmed URL to determine)

**If game file extraction is confirmed GO (via empirical test):**
- Story 2.2 implements:
  - `extract_skill_icons()` reading from hardcoded bundle path (`...\StreamingAssets\aa\StandaloneWindows64\skill_icons_assets_all.bundle`)
  - A hand-curated `skillId → bundle asset name` lookup table
  - CDN fetch as fallback (Path B) — only implementable once CDN URL is confirmed
- The `iconSource` field distinguishes `"local"` vs `"cdn"` in the manifest

**Regardless of GO/NO-GO:**
- The architecture decisions in Story Dev Notes remain valid (Rust command, TS hook, cache path, atomic writes)
- The `get_icon_cache_path(skillId)` command signature is correct
- The icon cache path `{app_data}/lebo/icons/skills/{skill_id}.png` is correct
