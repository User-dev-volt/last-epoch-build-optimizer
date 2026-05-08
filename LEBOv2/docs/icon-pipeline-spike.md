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

The URL pattern assumed in the epics (`https://assets.lastepochtools.com/skills/{skill_id}.png`) is **incorrect**. The subdomain `assets.lastepochtools.com` does not resolve — DNS lookup fails with `ERR_NAME_NOT_RESOLVED`. This URL pattern cannot be used.

### `www.lastepochtools.com` — Cloudflare-protected

The main domain is protected by Cloudflare WAF and returns HTTP 403 to all automated access, including headless Playwright (real Chrome). The actual icon URL pattern for lastepochtools.com **could not be confirmed** via automated research.

From search results, skill pages use underscore-delimited identifiers in their URLs (e.g., `/skills/mirror_image`), suggesting CDN icon URLs might also use underscores. This is unconfirmed.

### `tunklab.com` — Down

The site returns Cloudflare error 526 (Invalid SSL certificate). The service is unavailable and cannot be used.

### Confirmed CDN URLs: None

No CDN URL that resolves to an actual skill icon image could be confirmed during this spike. **3–5 example working URLs cannot be provided.** This is a hard blocker for Story 2.2's CDN path.

### Manual investigation required

The only way to confirm the CDN URL pattern is:

1. **Human browser inspection:** Open `https://www.lastepochtools.com/skills` in a regular (non-headless) browser, navigate to any skill page, open DevTools → Network tab, filter by `.png`, and copy the image request URL. This takes ~2 minutes and is blocked for automated tools.
2. **Community contact:** Contact Dammitt (lastepochtools.com maintainer) on the Last Epoch Discord server to request the CDN URL template. The server can be found at the link in the site footer.

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

### CDN path: **BLOCKED (unconfirmed)**

> Neither CDN source is accessible. The URL in the epics (`assets.lastepochtools.com/skills/...`) does not exist. Manual browser inspection or community contact is required before Story 2.2 can implement CDN fetching.

**Story 2.2 is blocked** until the CDN URL pattern is manually confirmed. See Section 4 for the 2-minute manual investigation steps.

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
