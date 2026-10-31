# Lillskolan — Läsinlärning för barn

**Lillskolan** är en svenskt läsinlärningsspel för barn i tidig ålder. Målet är att hjälpa barn att förstå hur bokstäver binds samman till ord genom att öva fonemisk blandning (t.ex. /b/ + /il/ → "bil").

## 🎯 Pedagogik

Spelet använder en **onset+rim-först**-metodik:
1. **Pass 1 (2 delar):** onset + rim, t.ex. /b/ + /il/ → "bil"
2. **Pass 2 (3 delar):** onset + vokal + coda, t.ex. /b/ + /i/ + /l/ → "bil"

Genom att börja med färre chunkar får barnet öva själva blandningsrörelsen med mindre kognitiv belastning. När det sitter utökas till full fonemisk blandning.

**Startord (8 svenska CVC-ord):** bil, hus, sak, man, tid, nät, säl, sol

## 🏗️ Projektstruktur

```
lillskolan/
├── apps/
│   ├── hub/                    # Huvudapplikation (lektionsväljare, framsteg, stjärnor)
│   └── lessons/phonics-cvc/   # Foniklektion (ljudglidmekanik, WebAudio)
├── packages/
│   └── lesson-sdk/            # Delad postMessage-brygga mellan hub och lektioner
├── docs/                       # Dokumentation (ADR, changelog, PR-mallar)
└── test-results/              # Playwright E2E-testresultat
```

## 🚀 Komma igång

### Förutsättningar

- **Node.js** ≥ 20 (kontrollera med `node --version`)
- **pnpm** ≥ 11.4 (kontrollera med `pnpm --version`)
  - Installera: `npm install -g pnpm`
- **Git LFS** (för binära aktiviteter)
  - Installera: `brew install git-lfs` eller `sudo apt install git-lfs`
  - Kör: `git lfs install`

### Installation

```bash
# Klona repo:t
git clone https://github.com/seppaleinen/lillskolan.git
cd lillskolan

# Installera beroenden
pnpm install

# Pull Git LFS-filer
git lfs pull
```

### Utveckling

Starta både Hub och foniklektionen samtidigt:

```bash
pnpm dev
```

- **Hub:** http://localhost:5173 (innehåller en inbäddad iframe till lektionen)
- **Lektion (fristående):** http://localhost:5174

Öppna http://localhost:5173 i webbläsaren för att testa.

### Bygg och test

```bash
# Bygg alla paket
pnpm build

# Kör alla tester
pnpm test

# Full verification (typecheck + test + build)
pnpm verify
```

## 🎮 Hur det fungerar

1. **Hubben** visar ett rutnät med lektioner (just nu en: "CVC-ord").
2. När du klickar på en lektion öppnas den i en **sandboxed iframe** (`sandbox="allow-scripts allow-same-origin"`).
3. Lektionen skickar framstegsmeddelanden (`LESSON_PROGRESS`) och slutförandemeddelanden (`LESSON_COMPLETE`) till hubben via en **postMessage-brygga** (`LessonBridge`).
4. Hubben sparar framsteg (stjärnor, avslutade ord, noggrannhet) i **localStorage** och visar dem i lektionsrutnätet.
5. När du går tillbaka till hubben töms iframen (`iframe.src = 'about:blank'`) så att WebAudio-noder frigörs.

## 🎵 Ljudpipeline

Lektionen använder **WebAudio API** för att spela upp fonemklipp. Filer finns i `apps/lessons/phonics-cvc/public/phonemes/`:

- **7 onset-fonem:** b, h, s, m, t, n, d
- **5 vokaler:** i, u, a, ä, o
- **4 coda-fonem:** l, k, d, t (s och n återanvänds från onset)
- **8 rim-klipp:** il, us, ak, an, id, ät, äl, ol
- **Kontext-beroende onset:** b_i, b_a, b_u, b_ä, b_o, h_u, h_a, h_i, h_o, h_ä, h_o, s_a, s_i, s_o, s_u, s_ä, m_a, m_i, m_o, m_u, m_ä, t_a, t_i, t_o, t_u, t_ä, k_a, k_i, k_o, k_u, k_ä, d_a, d_ä, d_i, d_o, d_u

### Audiogenerering

För att generera eller uppdatera ljudfiler:

```bash
# Generera alla onset+vowel kombinationer
node scripts/generate-full-onset-set.mjs

# Validera ljudfiler (44.1 kHz mono 16-bit, ej-tysta)
node scripts/validate-audio.mjs --all
```

### Uppdatera manifest

När nya WAV-filer läggs till i `public/phonemes/`:

```bash
node scripts/update-manifest-from-clips.mjs
```

## 📦 Docker

### Tjänster

Docker Compose-setupen innehåller:

- **app** - Node.js-utvecklingsmiljö som kör `pnpm dev` för både Hub (port 5173) och lektionsappen (port 5174). Mönstrar källkoden och använder `.env`-filer genererade från miljövariabler via `docker-entrypoint.sh`.
- **Nginx** (produktion) - Statisk filserver som betjänar byggda tillgångar från `/usr/share/nginx/html/`. Hub servas på `/` och lektionen på `/lesson/` med SPA-fallback.

### Utveckling

Starta utvecklingsmiljön med Docker Compose:

```bash
docker compose up
```

### Produktion

Bygg och starta produktionsmiljön:

```bash
docker compose -f docker-compose.prod.yml up --build
```

### Testning

Kör tester i Docker-miljön:

```bash
docker compose run --rm app pnpm test
```

## 🧪 Testning

### Enhetstester (Vitest)

```bash
# Kör alla enhetstester
pnpm test

# Kör med watch mode
pnpm --filter lillskolan-hub test -- --watch
pnpm --filter phonics-cvc test -- --watch

# Kör specifikt paket
pnpm --filter lesson-sdk test
```

**Testmönster:**
- **Namn:** `*.test.ts` (i samma katalog som källkoden)
- **Ramverk:** Vitest med jsdom-miljö
- **Struktur:** `describe()`/`it()` blocks, `expect()`-assertioner
- **Mockning:** Vitest-mocking (`vi.fn()`, `vi.spyOn()`)

**Testcount per paket:**
| Paket | Enhetstester | E2E-tester |
|-------|-------------|------------|
| `apps/hub` | 26 | 5 |
| `apps/lessons/phonics-cvc` | 160 | 7 |
| `packages/lesson-sdk` | 5 | - |
| **Totalt** | **191** | **7** |

### E2E-tester (Playwright)

```bash
# Kör E2E-tester
npx playwright test

# Kör med UI (debug)
npx playwright test --headed
```

**E2E-testområden:**
- Hub: lektionsrutnät, iframe-laddning, framsteg, stjärnor, localStorage
- Lektion: drag/glider-me kanik, felaktig ruta-skakning, framstegshändelser, WebbAudio integration

## 📝 Arkitekturbeslut

Se [`docs/adr/`](docs/adr/) för detaljerade arkitekturbeslut:

| ADR | Ämne |
|-----|------|
| 001 | Lesson Bridge-protokoll |
| 0004 | Hub lektionsrutnät + iframe |
| 0005 | Fonemmotor |
| 0006 | Docker Compose setup |
| 0007 | Fonems-CVC Audio Playback UX |
| 0008 | Manifest Onset Context |
| 0009 | Binary Asset Policy (Git LFS) |

## 🛠️ Teknologier

- **Monorepo:** pnpm workspaces
- **Byggverktyg:** Vite (multi-page), TypeScript
- **Test:** Vitest (enheter), Playwright (E2E)
- **Ljud:** WebAudio API
- **Interaktion:** Pointer Events API + `setPointerCapture` (surfplattevänlig dragmekanik)
- **Kommunikation:** postMessage via LessonBridge
- **Lagring:** localStorage (versionerad schema: `lillskolan.progress.v1`)

## 📄 Kodningsstandarder

### TypeScript

- `strict: true` i `tsconfig.base.json`
- ES2022 mål, ESNext-moduler, bundler-modulupplösning
- Inga `any` - använd strikta typer

### Komponentarkitektur

- **Fabriksfunktioner** (inte klasser): `createComponent()` → returnerar `{ element, update, destroy }`
- **Tillstånd:** Lokalt komponent-state, inga externa state-bibliotek
- **Stilning:** Globell CSS (`styles.css`, `lesson.css`) med CSS-aukontrakt
- **ARIAs:** Dekorativa SVG: `aria-hidden="true" role="img"`

### Null-säkerhet

- använd explicit kontroller: `if (value === null) return fallback;`
- undvik bara `??` som ensam skydd

### Timer-typ

```typescript
const timer: ReturnType<typeof setTimeout> = setTimeout(...)
```

### Kontrollflöde i lektioner

`showCompletion()` tömer `lessonRoot`-elementet. Nya komponenter som läggs till efter måste återanslutna om händelser.

## 🔌 API:er & Kontrakt

### LessonBridge (packages/lesson-sdk)

Ser dokumentationen i [`docs/lesson-bridge-usage.md`](docs/lesson-bridge-usage.md).

**Led upp:**
- `LESSON_PROGRESS` → steg-index, totala steg, noggrannhet
- `LESSON_COMPLETE` → stjärnor, tid, sammanfattning

### Hub ↔ Lektion

- **Iframe-sandbox:** `allow-scripts allow-same-origin`
- **Orsaker:** `HUB_ORIGIN` / `LESSON_ORIGIN` i konfiguration
- **Meddelandevalidering:** Kit inkluderar typsäkra gränser och ursprungskontroll

## 📦 Binär aktiva policy (Git LFS)

**Regel:**filer >10 MB måste trackas av Git LFS. Inga undantag.

**Setup (gång om):**
```bash
brew install git-lfs
git lfs install
```

**Ny fil:**
```bash
git lfs track '*.pt'
git add .gitattributes model.pt
```

**Piper TTS-modell:**`piper-voices/sv_SE-alma-medium.onnx` (60 MB)

## 📄 Licens

[Ingen licens angiven än](LICENSE)

---

**Skapat av:** David Eriksson (seppaleinen)
**Första commit:** 2026-10-25
**MVP släppt:** 2026-10-26 (commit 21ed994)