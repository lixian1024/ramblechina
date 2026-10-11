# Google Maps migration — 2026-10-11

## Implemented boundary

| Capability | Runtime service |
|---|---|
| Planner and destination basemaps | Google Maps JavaScript API |
| Landmark / hotel search | Places API (New) Text Search |
| Nearby meal candidates | Places API (New) Nearby Search |
| Place details / opening hours | Places API (New) Place Details |
| Photos and authors | Places API (New) Details + Photo media |
| Walking / driving | Routes API Compute Routes, WALK / DRIVE |
| Static map preview | Maps Static API, markers only |
| Weather | Amap `v3/weather/weatherInfo` |
| Bus / metro / public transit | Amap `v5/direction/transit/integrated` |

There is no Amap POI, walking, driving, static-image or JS SDK fallback. The former JS security proxy returns HTTP 410. `/api/amap` remains a compatibility URL for the Beijing gate pilot, but returns Google content and WGS84 coordinates. Pocket-card / guide / PDF map-search links open Google Maps.

Main adapters: `src/lib/travel/google-maps.ts`, `concierge-amap.ts` (mixed routing policy and the two allowed Amap services), `map-coordinates.ts`. Browser loader: `google-browser.ts`.

## Configuration

Keep `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Maps JavaScript API. It is public in browser bundles; keep website and API restrictions.

Create a **separate server key** in the same Google Cloud project with billing enabled. Enable Places API (New), Routes API and Maps Static API, restrict the key to those services and the server's outbound IP where applicable, and configure locally / in deployment secrets:

```dotenv
GOOGLE_MAPS_SERVER_API_KEY=your_server_key
AMAP_WEB_SERVICE_KEY=your_amap_web_service_key
```

The existing legacy spelling `AMAMP_API_KEY` continues to work. `AMAP_JS_API_KEY`, `AMAP_JS_API_SECRET`, and `AMAP_JS_ENGLISH_ENABLED` are no longer used by these map pages. Existing local secrets were not changed or copied.

Restart the dev server / rebuild after changing keys. The browser key is deliberately not used automatically for server REST calls. A website-restricted key generally cannot authorize server calls without a browser referrer; do not spoof a referrer or remove its restrictions.

Diagnostic command (prints only service status; no credential values or upstream messages):

```sh
node --import tsx scripts/check-google-access.ts
```

This probe prefers the server key. When only a browser key exists, it can check whether REST services reject it, but does not install it as a server credential.

## Data and product differences

- Google native coordinates pass through untouched. Amap transit request endpoints convert to GCJ-02; returned transit vertices convert back to WGS84 and are tagged. Conversion round trips are tested, **street alignment in mainland China is not yet visually verified**.
- Weather/transit administrative codes are an explicit application bridge from verified Google address components, not fields returned by Google. The bridge covers listed common cities; unmatched cities can still use Google places/roads but do not invent weather or transit codes. Shanghai requires recognized district evidence and bounding-box checks to keep the Pudong / other-district quality gate. Unknown district evidence is unresolved rather than presumed Puxi.
- Restaurant categories only support the specificity returned by Google. A `chinese_restaurant` is labelled “Chinese restaurant”; it does not establish Shanghai/Benbang cuisine. Names cannot promote unknown categories to restaurants. Dessert / coffee / bakery listings and dessert specialists, including Dorayaki, are excluded from meal candidates. Distances are calculated from coordinates and labelled as straight-line distances.
- All route alternatives retain their own provider. A taxi estimate is a driving route estimate, not a fare or booking. Missing geometry is dashed; static previews show markers, not invented street paths. Ferry walking results are rejected.
- Google photo authors are displayed with the photo from the same lookup. Photo resource names and transient image URIs are not saved in browser storage.
- Browser storage keeps planning choices / bookings and permitted place IDs. Places, hours, photos, route geometry/times, dining listings and weather are refreshed after restore. Legacy Amap place IDs are discarded, and the requested places are matched anew. Failed refresh preserves the draft and offers retry without an LLM rewrite. Earlier assistant responses containing Google map listings are not retained as cached provider facts.
- Maps / place attributions are shown next to the relevant content. Provider listings do not establish opening, access, ticket availability or suitability for dietary constraints.

## Verification and remaining gate

Passed: production build with `next build --webpack` (166 pages), TypeScript, changed-file ESLint, i18n/editorial/workbench, Beijing outdoor gate checks, concierge and all existing controlled Shanghai regressions, plus direct Google request/response and two-service Amap allowlist tests (`verify-map-providers.ts`). Historical synthetic fixtures are translated to Google schemas for replay; their responses are **controlled evidence**, not live Google coverage. Restaurant subtype and distance fixtures were adapted to actual Google fields without removing geography, source, category, failure or preference assertions.

The default Turbopack production build cannot bind its temporary CSS worker port in this environment, including on escalation; the official Webpack build option passes. SSR `/en/plan` responds with the Google-labelled workspace. This does not verify the browser map interaction.

Online key probe: only browser key is configured. Direct and system-proxy-enabled probes could not connect to Google (timeouts / unavailable network). API permissions and billing are therefore **unknown**, not confirmed invalid. The live application Evals E-001, E-002 and E-014 were executed and failed explicitly at the missing Google server-key gate; no itinerary was emitted. Evidence: `.loop/product-evals/2026-10-10T16-07-01-483Z-T-001/report.json`. Live coverage and browser map alignment remain pending until server credentials and connectivity work. The previous T-001 failure and Human Gate are not reset by this migration.

## Primary API references

- [Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Places Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Place Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Routes Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Google Maps policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Amap administrative/city-code downloads](https://lbs.amap.com/api/webservice/download)

Next verification: Shanghai mixed-bank route / meal sample, relaxed day and modern-only day; compare locations, English labels, transit geometry and actual opening-hour gaps on the map. Then rerun the existing live Evals and have an independent Critic review. Supplier migration does not validate the product hypothesis.

## Server-key follow-up — 2026-10-11

### Browser interaction check — 2026-10-11

The user reported unresponsive buttons and a blank map. The browser initially displayed server-rendered controls without reactive input state. Next.js 16.3.6 logged a rejected dev-resource request from `127.0.0.1`; `next.config.ts` now explicitly permits this loopback development hostname through `allowedDevOrigins`. No wildcard or production access setting was added. After restart and initialization, the original Turbopack mode responds to textarea changes, Assistant/Itinerary/Map switching, Day 2 selection, and New trip confirmation/cancel. The saved draft was preserved. A temporary Webpack comparison was performed; the final server uses the original `npm run dev -- --port 3001` with the process-scoped proxy documented below.

Google Maps JavaScript executes but rejects both `http://127.0.0.1:3001/en/plan` and `http://localhost:3001/en/plan` with `RefererNotAllowedMapError`. The browser key's website restriction must retain existing entries and include `http://127.0.0.1:3001/*` and `http://localhost:3001/*`. The server key is not involved. No credential or Cloud permission was changed. The existing loading timeout shows an explicit failure/retry state. Tiles and route alignment remain pending the user's Cloud configuration.

Validation: `node --import tsx scripts/verify-planner-workbench.ts` and `npx eslint next.config.ts` passed. The npm test wrapper encountered the sandbox's tsx IPC socket restriction; the same script passed with Node's import loader. No itinerary, filtering, ordering, fallback policy or Eval standard changed, so live itinerary Evals were not rerun for this development-origin configuration. Browser authorization is a separate gate from the earlier server-side API successes.

### Server configuration and network history

### Model connection error follow-up

Exact-request follow-up (2026-10-11): the user supplied `10 days, chongqing, xi'an, chengdu, jiuzhaigou, 2 people, food & culture travel`. This request completed research in about 29 seconds, then hit the application's draft-model deadline at 75,003 ms; the full request failed after about 104 seconds. The safe diagnostic classified it as a timeout. This establishes the reproduced failure's cause; Google map authorization is unrelated. Evidence: `.loop/model-access/2026-10-10T17-58-25-373Z-ten-day-before/summary.json`.

Following D-012, draft and repair model calls now have a bounded 180-second deadline. The identical input subsequently returned a ten-day draft in 131,207 ms overall, with about 101 seconds in the model stage. Evidence: `.loop/model-access/2026-10-10T18-01-14-898Z-ten-day-after/summary.json` and the adjacent `plan.json`. The active development server picked up the change; the existing browser trip was not overwritten. Controlled concierge, trip-routing and planner-workbench regressions, TypeScript and concierge ESLint passed. No credentials, proxy settings, model selection, paid automatic retries or Eval assertions changed.

Critic result for the ten-day draft's executability: **fail**. Day nine contains an unresolved hotel-pickup placeholder rather than a real destination, some intercity transfers and Jiuzhaigou coordinates remain unverified, and the remote Chongqing day-two stop needs geographic review. The connection fix is validated for this request, but returning a ten-day JSON plan does not validate its trip quality or reliability across future requests. Retain the separate E-002 explanation gap described below, existing Loop state and Product Human Gate. Prior 75-second diagnostics below describe the earlier implementation and are superseded by this reproduction and D-012.

Live application verification after this diagnostic change: E-001 and E-014 passed; all three requests returned a model-generated itinerary without a transport error. E-002 failed its existing modern-architecture evidence assertion. Manual inspection found Shanghai World Financial Center in a compact Pudong itinerary, but its generated rationale/description omitted the explicit modern/contemporary/skyline/skyscraper/supertall wording required by that assertion. This is an unresolved explanation/validation gap, not a connection error or an accepted green result. Evidence: `.loop/product-evals/2026-10-10T17-52-12-157Z-T-001/report.json`. The failed assertion and generated response are retained; no quality standard was relaxed and no unrelated prompt change was made. The transport change leaves successful planning requests unchanged, and this run does not establish that it caused or resolved the explanation gap.

After map authorization was fixed, the user reported `The language model could not be reached. Please retry.` This string comes from the itinerary model's fetch exception handler, not Google Maps. It previously discarded the cause. Draft and repair calls each have a 75-second timeout; either a timeout or a connection failure could produce the same message, so the historical cause cannot be confirmed from the retained log. A small call to the configured Qwen model returned HTTP 200 in 567 ms. A direct real three-day request succeeded in 112,853 ms overall, including draft/repair response times of 44,505/37,207 ms; this does not prove the original error was a timeout. Diagnostic evidence: `.loop/model-access/2026-10-11-model-diagnostic.json`.

The draft/repair handler now records only stage, service hostname, model name, elapsed time, timeout/connection category and a bounded transport code. It never logs credentials, raw error messages, requests or model replies. Reading a response body that times out is classified as a transport failure rather than an empty itinerary. English and Chinese errors distinguish timeout from interruption and explain that the existing trip is unchanged. No timeout increase, automatic paid retry, model change, source fallback or quality-standard change was made. Controlled tests cover timeout, connection reset, interrupted response body, malformed JSON and log redaction; concierge/workbench regressions, TypeScript and changed-file ESLint passed. The exact original trip request is pending user clarification; avoid claiming a historical root cause or stable service availability from successful samples.

Browser authorization follow-up: after the user saved the website restrictions, a fresh `127.0.0.1:3001/en/plan` browser load rendered Google tiles, attribution, five confirmed stop markers and the provider walking polylines. The previously unmatched Sinan choice stays in the itinerary as unverified and has no invented map marker. Selecting Day 1 and clicking The Bund marker selected its detail card; selecting Day 3 and clicking Shanghai Tower synchronized the selected itinerary day and detail card. Zoom-in changed the map zoom from 14 to 15, and fitting the view worked. Narrow-screen and 1440×900 desktop layouts were exercised; the temporary viewport override was reset. Fresh captured warning/error logs were empty. Screenshot: `output/browser-checks/google-map-verified.jpg`. No runtime code, credentials, itinerary-generation logic or Eval standard changed in this follow-up. These observations establish working display and click interaction for this sample, not survey-level street alignment, all Chinese POIs or Amap transit geometry coverage.

The user configured `GOOGLE_MAPS_SERVER_API_KEY` in `.env.local`. The app was started on port 3001 and its status endpoint reports `configured: true`, Google, WGS84. `/en/plan` returns HTTP 200. No credential was printed, copied or changed.

Places API (New), Routes API and Maps Static API probes still time out, both directly and with Node's environment-proxy option. Key-free probes to all three Google API hosts also time out. No proxy environment or macOS HTTP/HTTPS/SOCKS/PAC proxy was enabled at the time of testing. No Google HTTP response was received, so API restrictions, billing and live data coverage remain unknown; a timeout is not evidence of an invalid key. Probe evidence: `.loop/google-access/2026-10-10T16-54-19-098Z.json`.

The configuration blocker is resolved; network access is the next integration gate. Browser map loading, China street alignment and live itinerary quality still need verification. Engineering Loop state and the Product Human Gate remain unchanged.

Live application E-001, E-002 and E-014 were rerun against the restarted app. All failed because the generated/repaired plans had no confirmed Google map locations; no final itinerary was emitted. E-014 also triggered the existing past-21:00 scheduling check. Restoring network access alone cannot be claimed to resolve this timing issue or validate trip quality. Evidence: `.loop/product-evals/2026-10-10T16-53-00-334Z-T-001/report.json`. No test assertions, Eval standards or runtime code were changed in this follow-up.

## User-provided proxy follow-up — 2026-10-11

The user supplied `http://127.0.0.1:7897`. Through that proxy, all three small Google probes returned HTTP 200: Places Text Search returned one place, Compute Routes returned one route, and Static Maps returned an image. Evidence: `.loop/google-access/2026-10-10T17-00-17-851Z-proxy.json`. The restarted Next.js app also returned a live Google match for the Beijing Palace Museum through its existing search endpoint. This confirms the server can reach Google and these sample requests are authorized; it does not establish all data coverage, quota or browser map availability.

The first proxy-backed live run passed E-002 and E-014; E-001 failed earlier at the AI research stage because no usable sources were returned. Evidence: `.loop/product-evals/2026-10-10T17-00-03-747Z-T-001/report.json`. This failed run is retained. The cause of the research failure is not established by the Google probe.

The app was then restarted with domestic services bypassing the proxy. For this local machine (Node v25.5.0), the current startup command is:

```sh
HTTPS_PROXY=http://127.0.0.1:7897 \
HTTP_PROXY=http://127.0.0.1:7897 \
NO_PROXY=localhost,127.0.0.1,::1,aliyuncs.com,restapi.amap.com \
NODE_USE_ENV_PROXY=1 npm run dev -- --port 3001
```

These settings apply only to the launched process and its children. System proxy settings and `.env.local` were not changed. `/en/plan` returns HTTP 200. This command configures server requests; browser requests for Maps JavaScript, tiles and images still depend on the browser's own network access. Production must use its own reachable network and authorized outbound IP. The local proxy address is not a deployment setting.

With the domestic bypass list, a subsequent live E-001/E-002/E-014 run passed the existing deterministic assertions (`.loop/product-evals/2026-10-10T17-03-07-628Z-T-001/report.json`). One research failure followed by a successful run does not establish that the proxy caused the missing sources or that research is stable.

Live application photos returned two entries, Static Maps returned a PNG, and route geometry returned a segment. Evidence: `.loop/google-access/2026-10-10T17-04-08-219Z-app-endpoints.json`. These are endpoint/data-presence checks; image content, browser rendering and street alignment were not visually certified.

Manual review of the generated three-day plan found gaps beyond the deterministic assertions: the Sinan Mansions landmark had been matched to a hotel, and Google restaurant classifications admitted a bread shop, a candy workshop, a food company and a factory retail outlet as meal candidates. The adapter now rejects an unsolicited lodging match for a landmark query, while allowing explicitly requested hotels and hotel searches. Meal filtering rejects these conflicting names even when Google reports a restaurant type. This applies the existing D-007/D-011 identity and meal-quality rules; it does not infer verified restaurant menus, hours or cuisine. Targeted controlled cases reproduce these conflicts and preserve normal hotel and restaurant matches. TypeScript, changed-file ESLint, direct provider contracts and all six controlled Shanghai suites pass. No Eval standard was relaxed.

The first hotel guard depended on a lodging type, but Google returned the conflicting hotel as a generic establishment. The intermediate live run (`.loop/product-evals/2026-10-10T17-06-43-270Z-T-001/report.json`) passed the deterministic checks while still containing that mismatch; it is not accepted as proof of identity quality. A controlled generic-establishment response reproduced the failure before the final guard removed the type dependency. A direct live query then returned no confirmed landmark match, correctly rejecting the hotel. An unresolved landmark remains unresolved; the app must choose another confirmed stop or disclose failure rather than borrowing the hotel's identity.

Final live E-001/E-002/E-014 passed after the complete guard: `.loop/product-evals/2026-10-10T17-10-47-734Z-T-001/report.json`. Manual inspection confirmed the three-day sample omitted the unconfirmed Sinan stop rather than using its hotel; day two retains Wukang and regional meal breaks. The observed bread/candy/company/factory candidates no longer appear. This is a deliberately sparse day, not proof that travellers find the itinerary valuable. Nearby restaurant presence, opening hours, menus and dietary suitability still need confirmation. All six controlled Shanghai suites, direct provider regression, TypeScript and changed-file ESLint passed after the final code change. Browser map rendering/alignment, local-edit stability and real-user value remain separate gates. Previous failed runs and Engineering Loop/Human Gate state are retained.
## Photo identity follow-up — 2026-10-11 (D-023)

Photo source: Places API (New), Place Details `photos[]`, then `GET /v1/places/{place_id}/photos/{resource}/media`. Google business/user contributions are not guaranteed representative images. Official API documentation: https://developers.google.com/maps/documentation/places/web-service/place-photos.

`/api/trip-place-photos` now accepts one public identity context, `{places:[{id,query,city}]}`. It refetches the place in zh-CN, verifies name/city/type/known bounds and photo-resource ownership, obtains up to three transient media URLs and screens actual pixels with the already-configured multimodal Qwen model. The legacy IDs input retains the same fresh supplier identity/content screen. Current supported model check is Qwen 3.5–3.8 plus/flash/max family; missing/unsupported configuration deliberately returns no photo. Model settings are shared with concierge; no new key is required. Multimodal format reference: https://help.aliyun.com/zh/model-studio/vision.

Selection requires a well-formed match, concrete visible evidence and model confidence >=0.95. This number is a conservative filter, not calibrated accuracy or human certification. Uncertain/no-match/model/image/service failure never falls back to photos[0]. Memory-only image reads are capped at 2MB each, three candidates, with timeouts and a per-process 24-screens/minute cap. No photo resource names/URIs or pixels are added to persistent plan storage. Only public supplier identity and candidate pixels go to the existing model service. Production should measure extra image/model charges, latency and aggregate quotas before scaling.

Observed: Jiuzhaigou's record is Jiuzhai Valley National Park; Meixin's is Mexin Wine Town, after two ticket-office search results. Meixin's correct record still supplied only a parking scene and an unrelated Mecca visitor photo; both are suppressed. Yu Garden initially matched an administrative district; its reviewed official-address fallback obtains the botanical garden. Aliases/bounds are source-linked in place-identity.ts. The current three-candidate policy may withhold valid later photos; do not weaken rejection or substitute untraceable imagery to improve coverage.

UI always starts with a fresh photo lookup and does not trust draft photos. Identity-keyed state and request cancellation prevent previous-place images from leaking across selection changes. Browser evidence is in `output/browser-checks/photo-screening-*.png`. `npm run test:place-identity` includes the new failure/identity/selection regression and is in the product/Loop gate. Six Shanghai suites and core controlled checks pass. Live sample checks validate only these public places, not a complete multi-city itinerary or national photo accuracy. Next useful experiment: manually label photos for a small popular-attraction sample and record acceptance/mismatch/missing rates.
