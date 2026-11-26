# Mahi's Coin Trunk: setup and admin guide

Plain HTML/CSS/JS. Firebase (Firestore + Email/Password Auth) only. Deploy the folder to Netlify.

## 1. One-time setup
1. Firebase Console, then Project settings, then your web app: copy the config into `site-config.js`.
2. Authentication, then Sign-in method: enable Email/Password. Add one admin user.
3. Copy that user's UID (it is shown in the admin page header after login: `email · UID: ...`).
4. Paste the UID into `firestore.rules` (replace `PASTE_YOUR_ADMIN_UID_HERE`), then Firestore, then Rules, then **Publish**.
5. Authentication, then Settings, then Authorized domains: add your Netlify domain.
6. Open `/admin.html` on your Netlify site (for example `https://yoursite.netlify.app/admin.html`).

"Missing or insufficient permissions" means the UID in the published rules is not the logged-in UID.

## What is new in this version
- **Frame off** now only removes the round frame. Zooming, glow and shadows work the same.
- **Trunk timeline:** name the groups in *Site text → Trunk timeline (groups)* (no years needed), then pick a group on each coin. A coin with no group stays in the group of the coin before it. The timeline is a border that runs around the open trunk: it fills as you scroll, the group chips (I, II, III…) sit on it, the current group name shows on a tab at the top, and tapping a dot jumps to that coin.
- **Coin details** are shown in one even grid, so short and long values line up.
- **Treasure game** is now a vintage 3D map. The visitor taps 3 of the 5 places, then an explorer walks the route and leaves a dotted trail. At the end the visitor's own teal trunk shows every saved coin with its details, story and explanation.
- **Line-sketch map** (British India → Pakistan → Bangladesh) sits above the "Why does a coin matter?" title. The ending coin shows Bangladesh on one side and British India on the other. All their words are editable in *Site text → History map*.

## 2. Coins (admin, Coins tab)
- **Timeline group**: which group of the trunk timeline this coin belongs to.
- **Photos**: Google Drive share link (Anyone with the link: Viewer), one for front and one for back.
- **Show olive circular frame**: checkbox per coin. Turn it off for a clean, frameless coin.
- **Optional details**: Material, Year on coin, Denomination, Condition, Collection ID. Values you have used before appear as suggestions in later coins. Collection ID shows the highest used so far.
- **Where it appears** (`use`):
  - *Showcase*: appears in the trunk reveal (your special coins).
  - *Quest coin*: hidden from the showcase and used in the "Fill your trunk" game.

### Setting up a quest coin
Choose "Quest coin", then fill in:
- **Hidden location**: concrete wall, old tree, rusty trunk, wooden box in a farm, or old empty house. Locations with no coin show "Tell the villagers a story, and run!".
- **Correct decision**: Leave as it is, or Restore it.
- **Explanation**: shown in a card after every answer, right or wrong.
- **Damage text** (optional): shown on a wrong answer. If empty, a realistic message is generated from the material (for example, scrubbing a copper coin removes its protective patina and leaves hairline scratches; polishing silver strips its toning; active "bronze disease" is progressive and needs a conservator).

The visitor picks 3 of 5 places. Each coin found opens a lab (zoom, drag, flip), and a correct choice puts the coin in their mini trunk. If no quest coins are published, the whole game section hides itself.

## 3. Site text tab
Every word on the site is editable and saved to `settings/site`. The ↺ button resets one field to its default.

## 4. Preview without Firebase
Set `firebase: null` in `site-config.js` to see sample coins and the full game locally.

## About section: photo and interests
In *Site text → About*, paste your photo's Google Drive link (Anyone with the link: Viewer) and list your interests, one per line. Both are optional; leave them empty to hide them.
