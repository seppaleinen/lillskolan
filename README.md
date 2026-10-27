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

### Installation

```bash
# Klona repo:t
git clone https://github.com/seppaleinen/lillskolan.git
cd lillskolan

# Installera beroenden
pnpm install
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

# Kör alla tester (Vitest + Playwright E2E)
pnpm test
```

## 🎮 Hur det fungerar

1. **Hubben** visar ett rutnät med lektioner (just nu en: "CVC-ord").
2. När du klickar på en lektion öppnas den i en **sandboxed iframe** (`sandbox="allow-scripts allow-same-origin"`).
3. Lektionen skickar framstegsmeddelanden (`LESSON_PROGRESS`) och slutförandemeddelanden (`LESSON_COMPLETE`) till hubben via en **postMessage-brygga** (`LessonBridge`).
4. Hubben sparar framsteg (stjärnor, avslutade ord, noggrannhet) i **localStorage** och visar dem i lektionsrutnätet.
5. När du går tillbaka till hubben töms iframen (`iframe.src = 'about:blank'`) så att WebAudio-noder frigörs.

## 🎵 Ljudpipeline

Lektionen använder **WebAudio API** för att spela upp fonemklipp. Just nu är de 22 fonem-/rim-klippen syntetiska platshållare (genererade av `scripts/generate-placeholders.mjs`). För riktig produktion ska de ersättas med inspelade svenska fonem:

- **7 onset-fonem:** b, h, s, m, t, n, d
- **5 vokaler:** i, u, a, ä, o
- **4 coda-fonem:** l, k, d, t (s och n återanvänds från onset)
- **8 rim-klipp:** il, us, ak, an, id, ät, äl, ol

Se [issue #7](https://github.com/seppaleinen/lillskolan/issues/7) för att byta ut mot riktig TTS-genererade och handklippta fonem.

## 📦 Docker

### Utveckling

Starta utvecklingsmiljön med Docker Compose:

```bash
docker compose up
```

- **Hub:** http://localhost:5173 (innehåller en inbäddad iframe till lektionen)
- **Lektion (fristående):** http://localhost:5174

### Produktion

Bygg och starta produktionsmiljön:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Applikationen serveras via Nginx på port 80.

Se [issue #8](https://github.com/seppaleinen/lillskolan/issues/8) för detaljer om Docker-setupen.

## 🧪 Testning

- **Vitest:** 133 enhetstester (lesson-sdk, hub, phonics-cvc)
- **Playwright:** 7 E2E-tester (dragmekanik, felaktig ruta-skakning, framstegs-/slutförandehändelser, localStorage-persistens)

E2E-testerna körs i headless Chromium. Fysisk surfplattetestning (iPad + Android) återstår.

## 📝 Arkitekturbeslut

Se [`docs/adr/`](docs/adr/) för arkitekturbeslut:
- [001: Lesson Bridge-protokoll](docs/adr/001-lesson-bridge-protocol.md)
- [004: Hub lektionsrutnät + iframe](docs/adr/0004-hub-lesson-grid-iframe-progress.md)
- [005: Fonemmotor](docs/adr/005-phoneme-engine.md)

## 🛠️ Teknologier

- **Monorepo:** pnpm workspaces
- **Byggverktyg:** Vite (multi-page), TypeScript
- **Test:** Vitest (enheter), Playwright (E2E)
- **Ljud:** WebAudio API
- **Interaktion:** Pointer Events API + `setPointerCapture` (surfplattevänlig dragmekanik)

## 📄 Licens

[Ingen licens angiven än](LICENSE)

---

**Skapat av:** David Eriksson (seppaleinen)  
**Första commit:** 2026-10-25  
**MVP släppt:** 2026-10-26 (commit 21ed994)
