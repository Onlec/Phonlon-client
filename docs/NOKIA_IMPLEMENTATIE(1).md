# 📱 Nokia 3310 — Implementatiegids

> Samenvatting van de huidige staat, wat ontbreekt, en hoe verder te implementeren.
> Bedoeld als briefing voor VSCode / volgende AI-sessie.

---

## 1. Projectstructuur

Dit is een **aparte repo** van Chatlon desktop. Geen gedeelde components.
Wel gedeelde Gun relay (zelfde `REACT_APP_GUN_URL`).

```
nokia-3310/
├── public/
├── src/
│   ├── App.jsx               ← Nokia3310.jsx hernoemd, root component
│   ├── gun.js                ← Gun instantie (zelfde patroon als Chatlon)
│   ├── hooks/
│   │   ├── useNokiaAuth.js   ← Gun SEA login/registratie op basis van nummer+PIN
│   │   ├── useNokiaSMS.js    ← SMS sturen/ontvangen via Gun
│   │   ├── useNokiaCall.js   ← WebRTC bellen via Gun signaling
│   │   └── useNokiaPresence.js ← Heartbeat presence
│   └── utils/
│       ├── audio.js          ← Web Audio API: ringtones, beep, SMS geluid
│       ├── t9.js             ← T9 tekstinvoer engine
│       └── credits.js        ← Beltegoed logica
├── .env.local                ← REACT_APP_GUN_URL=http://localhost:5050/gun
├── .env                      ← REACT_APP_GUN_URL=https://chatlon-server.onrender.com/gun
└── package.json
```

---

## 2. Wat er nu al werkt (Nokia3310.jsx artifact)

| Feature | Status | Opmerking |
|---|---|---|
| Nokia 3310 CSS skin | ✅ Klaar | Pixel-perfect body, scherm, knoppen |
| Boot animatie | ✅ Klaar | Welkomsttekst + geluid |
| Setup flow (nummer + PIN) | ✅ Klaar | Lokaal, nog geen Gun |
| PIN lock scherm | ✅ Klaar | Lokaal |
| Menu navigatie | ✅ Klaar | Pijltjes + klikken + cijfersnelkoppelingen |
| SMS compose (160 tekens) | ✅ Klaar | Teller, kosten, sjablonen |
| SMS inbox/verzonden | ✅ Klaar | Demo data, nog geen Gun |
| Bellen UI | ✅ Klaar | Gesimuleerd, nog geen WebRTC |
| Inkomende oproep (demo) | ✅ Klaar | Na 12s auto-trigger voor demo |
| Beltegoed systeem | ✅ Klaar | Lokaal, oplaadcodes werken |
| Snake II | ✅ Klaar | Volledig speelbaar |
| Memory spelletje | ✅ Klaar | Volledig speelbaar |
| Rekenmachine | ✅ Klaar | Basis |
| Ringtones (Web Audio) | ✅ Klaar | Nokia tune, beep |
| Status bar (signaal/batterij/tijd) | ✅ Klaar | |
| Toestelinfo scherm | ✅ Klaar | |
| Keyboard support | ✅ Klaar | Pijltjes, Enter, Esc, cijfers |

---

## 3. Wat ontbreekt — gerangschikt op prioriteit

### 🔴 Fase 2 — Gun.js integratie (kern)

#### 3.1 `gun.js` aanmaken
Identiek aan Chatlon, maar in nokia-3310 repo:

```js
// src/gun.js
import Gun from 'gun';
import 'gun/sea';

const peers = [process.env.REACT_APP_GUN_URL].filter(Boolean);

export const gun = Gun({ peers, localStorage: true });
export const user = gun.user().recall({ storage: true });
export default gun;
```

#### 3.2 Gun Data Schema (Nokia-specifiek)

Volledig gescheiden namespace van Chatlon desktop — geen interferentie mogelijk.

```
NOKIA_PROFILES/{nummer}
  .nummer       — gsm-nummer (primaire identifier)
  .naam         — weergavenaam
  .beltegoed    — integer (credits)
  .ringtone     — string
  .welkomsttekst — string

NOKIA_CONTACTS/{nummer}/{contactNummer}
  .naam         — naam die de gebruiker heeft opgegeven
  .nummer       — gsm-nummer van het contact

NOKIA_SMS_{pairId}_{timestamp}
  .van          — gsm-nummer afzender
  .naar         — gsm-nummer ontvanger
  .tekst        — max 160 tekens
  .timestamp    — unix ms
  .gelezen      — boolean

NOKIA_PRESENCE/{nummer}
  .lastSeen     — unix ms heartbeat
  .status       — 'online' | 'offline'

NOKIA_CALLS/{pairId}
  .type         — 'offer' | 'answer' | 'reject' | 'hangup'
  .sdp          — WebRTC SDP
  .van          — nummer
  .timestamp    — unix ms

NOKIA_CALLS/{pairId}/ice/{candidateId}
  .candidate    — JSON ICE candidate
  .van          — nummer
  .timestamp    — unix ms
```

**pairId berekening:**
```js
// Zelfde patroon als Chatlon's getContactPairId
const getPairId = (a, b) => [a, b].sort().join('_');
```

#### 3.3 `useNokiaAuth.js`

```js
// Registreren
user.create(nummer, pin, (ack) => { ... });

// Inloggen
user.auth(nummer, pin, (ack) => { ... });

// Na login: profiel aanmaken/ophalen
gun.get('NOKIA_PROFILES').get(nummer).put({ nummer, naam, beltegoed: 500 });
```

Belangrijk: Gun SEA gebruikt `nummer` als username en `pin` als wachtwoord. Werkt exact hetzelfde als Chatlon's auth — alleen de identifier verschilt.

#### 3.4 `useNokiaSMS.js`

Sturen:
```js
const pairId = getPairId(vanNummer, naarNummer);
const sleutel = `NOKIA_SMS_${pairId}_${Date.now()}`;
gun.get(sleutel).put({ van, naar, tekst, timestamp: Date.now(), gelezen: false });

// Beltegoed aftrekken
gun.get('NOKIA_PROFILES').get(vanNummer).get('beltegoed').put(nieuwBedrag);
```

Ontvangen (listener):
```js
// Let op: filter op timestamp > loginMoment, anders oude berichten triggeren notificaties
gun.get(`NOKIA_SMS_${pairId}_`).map().on((data, key) => { ... });
```

Alternatief: gun.get('NOKIA_SMS').map() met filter op .naar === mijnNummer.

#### 3.5 `useNokiaCall.js`

Identiek aan Chatlon's `useWebRTC.js` — enkel andere Gun node:
- Signaling: `NOKIA_CALLS/{pairId}` i.p.v. `CALLS/{pairId}`
- ICE: `NOKIA_CALLS/{pairId}/ice/{id}`
- Cleanup na hangup verplicht (zet null)

Hergebruik dezelfde WebRTC peer connection logica uit Chatlon.

#### 3.6 `useNokiaPresence.js`

Heartbeat elke 5s:
```js
gun.get('NOKIA_PRESENCE').get(mijnNummer).put({ lastSeen: Date.now(), status: 'online' });
```

Cleanup bij unmount: zet status op 'offline'.

---

### 🟡 Fase 3 — Authenticiteit & UX

#### 3.7 T9 tekstinvoer (`utils/t9.js`)

Nokia 3310 had geen touchscreen. Tekst invoeren via cijfertoetsen:
- `2` = a, `22` = b, `222` = c
- `3` = d, `33` = e, `333` = f
- Timeout van ~800ms voor volgende letter

```js
// Mapping
const T9_MAP = {
  '2': ['a','b','c'], '3': ['d','e','f'],
  '4': ['g','h','i'], '5': ['j','k','l'],
  '6': ['m','n','o'], '7': ['p','q','r','s'],
  '8': ['t','u','v'], '9': ['w','x','y','z'],
  '0': [' '],
};

// State: { key: '2', count: 0, timer: null }
// Bij druk op '2': count++, toon T9_MAP['2'][count % 3]
// Bij timeout of andere toets: bevestig letter, reset state
```

Integreren in `SMSCompose` component — vervang de huidige `<textarea>` door een T9-gestuurde input.

#### 3.8 Contacten toevoegen via nummer

Nu: hardcoded `DEMO_CONTACTS`. Vervangen door:
- Scherm "Nieuw contact": naam + nummer invoeren
- Opslaan in `NOKIA_CONTACTS/{mijnNummer}/{contactNummer}`
- Laden bij startup via Gun listener

#### 3.9 Meer ringtones (Web Audio)

Huidige `audio.js` heeft Nokia tune en beep. Toevoegen:
- "Ascending" (oplopende toonladder)
- "Beep once" (simpele beep)
- Alle tonen gebaseerd op Web Audio API oscillator — geen mp3 nodig

#### 3.10 Nim/Logica spelletje

Derde spelletje. Simpel: stapels lucifers, om beurten wegnemen. Volledig lokaal, geen netwerk nodig.

---

### 🟢 Fase 4 — Afwerking

#### 3.11 Welkomsttekst opslaan in Gun

Nu: lokale state. Opslaan in `NOKIA_PROFILES/{nummer}.welkomsttekst`.

#### 3.12 Oproeplijst bijhouden

Bij elke call: schrijf naar `NOKIA_CALLLOG/{nummer}/{timestamp}`:
```js
{ van, naar, richting: 'inkomend'|'uitgaand'|'gemist', duur, timestamp }
```

#### 3.13 PIN wijzigen

Gun SEA heeft geen native `changePassword`. Workaround:
1. Nieuw account aanmaken met zelfde nummer maar nieuwe PIN
2. Data migreren
Of: PIN hash lokaal bewaren en Gun password hetzelfde laten (simpelere aanpak).

#### 3.14 Beltegoed persistent in Gun

Nu: lokale state. Schrijven naar Gun zodat beltegoed tussen sessies bewaard blijft. Lezen bij login.

#### 3.15 SMS gelezen-status

Bij openen van bericht: `gun.get(sleutel).get('gelezen').put(true)`.
Unread count tonen in inbox menu label.

---

## 4. Bekende beperkingen & ontwerpkeuzes

**Optie A — Nokia-users communiceren enkel onderling**
Andere Gun namespace (`NOKIA_*`) garandeert automatisch isolatie van Chatlon desktop. Geen extra logica nodig.

**Gun SEA met gsm-nummer als username**
Werkt identiek aan Chatlon. Gun maakt geen onderscheid tussen `arne` en `+32477123456` als username.

**Beltegoed is fictief**
Wordt opgeslagen in Gun maar is niet cryptografisch beveiligd. Iedereen kan in theorie zijn eigen beltegoed verhogen. Dat is oké — dit is een nostalgisch project, geen betalingssysteem.

**WebRTC bellen deelt STUN servers met Chatlon**
Geen probleem — STUN is publiek en stateloos.

**Geen T9 woordenboek**
Alleen letter-per-letter invoer (multi-tap), geen predictive text. Dat is authentiek voor de 3310.

---

## 5. Setup in VSCode

```bash
npx create-react-app nokia-3310
cd nokia-3310
npm install gun
```

Bestanden aanmaken:
1. Vervang `src/App.js` door de inhoud van `Nokia3310.jsx` (hernoemd naar `Nokia3310` component, geëxporteerd als default)
2. Maak `src/gun.js` aan (zie §3.1)
3. Maak `.env.local` aan: `REACT_APP_GUN_URL=http://localhost:5050/gun`
4. Maak `.env` aan: `REACT_APP_GUN_URL=https://chatlon-server.onrender.com/gun`

Volgorde van implementatie:
1. `gun.js` + `useNokiaAuth.js` → login werkt echt
2. `useNokiaSMS.js` → SMS werkt tussen twee browsers
3. `useNokiaPresence.js` → online/offline zichtbaar
4. `useNokiaCall.js` → bellen werkt
5. T9 invoer
6. Contacten via Gun
7. Overige afwerking

---

## 6. Wat de volgende AI-sessie moet weten

- Lees `ARCHITECTURE.md` van de Chatlon repo — Nokia volgt dezelfde Gun-patronen
- `Nokia3310.jsx` is het startpunt — alle UI staat daar al in
- Gun listeners **altijd** cleanen in useEffect return
- Ref-backing verplicht binnen Gun callbacks (stale closure probleem)
- Filter berichten op `timestamp > loginTimestamp` om oude data te negeren bij eerste load
- Minimale diffs, geen volledige rewrites
