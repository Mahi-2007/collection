/* Every piece of editable text on the site: its label in the admin page and its default.
   The admin page edits these and saves them to Firestore (settings/site); the site reads them from there.
   To add a new editable text later: add a field here and put data-t="key" on the element in index.html. */
(function () {
  'use strict';
  const G = [
    { id: 'you', title: 'You and your contact details', items: [
      { k: 'name', label: 'Full name', def: 'Ashraful Islam Mahi' },
      { k: 'brand', label: 'Short name (top-left corner)', def: 'Mahi' },
      { k: 'email', label: 'Email address', def: 'ai7mahi@gmail.com' },
      { k: 'whatsapp', label: 'WhatsApp number', def: '', hint: 'Digits only, with country code, e.g. 8801712345678. Leave empty to hide the WhatsApp button.' },
      { k: 'coinsCount', label: 'Number of coins restored', def: '217' },
      { k: 'districtsCount', label: 'Number of districts', def: '25' },
      { k: 'pageTitle', label: 'Browser tab title', def: 'Ashraful Islam Mahi · Forgotten history, kept in coins' }
    ] },
    { id: 'menu', title: 'Menu and loading screen', items: [
      { k: 'navStory', label: 'Menu: story', def: 'Story' },
      { k: 'navCollection', label: 'Menu: collection', def: 'Collection' },
      { k: 'navAbout', label: 'Menu: about', def: 'About' },
      { k: 'navHello', label: 'Menu: contact', def: 'Say hello' },
      { k: 'navStart', label: 'Side dots: first dot label', def: 'Start' },
      { k: 'navQuest', label: 'Side dots: the treasure game', def: 'Your trunk' },
      { k: 'preloadLine', label: 'Loading screen line', def: 'dusting off the past' }
    ] },
    { id: 'hero', title: 'Opening screen', items: [
      { k: 'heroEyebrow', label: 'Small line above the headline', def: 'A personal archive of forgotten history' },
      { k: 'heroLine1', label: 'Headline, line 1', def: 'I see history in' },
      { k: 'heroLine2', label: 'Headline, line 2', def: 'objects most people' },
      { k: 'heroLine3', label: 'Headline, line 3 (shown in gold)', def: 'overlook.' },
      { k: 'heroSub', label: 'Line under the headline', def: '…and I bring those histories to life.' },
      { k: 'heroNote', label: 'Handwritten note under the coin', def: 'psst, just keep scrolling' },
      { k: 'chipCoins', label: 'Badge after the coin number', def: 'coins restored', hint: 'Shows as: 217 coins restored' },
      { k: 'chipDistricts', label: 'Badge after the district number', def: 'districts' },
      { k: 'scrollCue', label: 'Scroll hint at the bottom', def: 'Scroll' }
    ] },
    { id: 'story', title: 'Story (the three tags)', items: [
      { k: 'storyNote', label: 'Handwritten line above the title', def: 'three small questions' },
      { k: 'storyTitle', label: 'Section title', def: 'Why does a coin matter?' },
      { k: 'chapters', label: 'The tags', type: 'chapters', def: [
        { tag: '01 · why coins?', title: 'Small things carry stories nobody noticed.', text: 'A coin is a story you can hold in your palm.' },
        { tag: '02 · where did they go?', title: 'Britain, then Pakistan, then Bangladesh.', text: 'Each change retired a currency. The old coins went into drawers.' },
        { tag: '03 · who kept them?', title: 'Our grandparents, in their trunks.', text: 'I started with my own family’s. Now I help other families restore theirs.' }
      ], hint: 'Keep every tag short. Visitors skim. Between 1 and 5 tags.' }
    ] },
    { id: 'trunk', title: 'The trunk (collection)', items: [
      { k: 'trunkNote', label: 'Handwritten line above the title', def: 'the collection' },
      { k: 'trunkTitle', label: 'Title', def: 'Every family has a [[trunk.]]', hint: 'Put [[double square brackets]] around words you want in gold.' },
      { k: 'trunkLine', label: 'Line under the title', def: 'This one is mine. Open it and see what is inside.' },
      { k: 'unlockLabel', label: 'Unlock button', def: 'Unlock the trunk' },
      { k: 'unlockNote', label: 'Handwritten line under the button', def: 'just one tap' },
      { k: 'cntWord', label: 'Coin counter: word before the number', def: 'coin', hint: 'Shows as: coin 03 of 08' },
      { k: 'ofWord', label: 'Coin counter: word between the numbers', def: 'of' },
      { k: 'hintMore', label: 'Hint while more coins are left', def: 'keep scrolling' },
      { k: 'hintLast', label: 'Hint on the last coin', def: 'that was the last one' }
    ] },
    { id: 'timeline', title: 'Trunk timeline (groups)', items: [
      { k: 'phases', label: 'Timeline groups', type: 'phases', def: [
        { id: 'p1', tag: 'I', title: 'The Company’s shadow' },
        { id: 'p2', tag: 'II', title: 'The Crown' },
        { id: 'p3', tag: 'III', title: 'The split' },
        { id: 'p4', tag: 'IV', title: 'Our own money' }
      ], hint: 'Names only, no years needed. Each coin picks its group in the Coins tab. A coin with no group stays in the same group as the coin before it. Groups with no coins are not shown.' }
    ] },
    { id: 'map', title: 'History map (above the story title)', items: [
      { k: 'mapA', label: 'Map 1: name', def: 'British India' },
      { k: 'mapASub', label: 'Map 1: small line', def: 'one country, one currency' },
      { k: 'mapArrowA', label: 'First arrow: word', def: '1947' },
      { k: 'mapB', label: 'Map 2: name', def: 'Pakistan' },
      { k: 'mapBSub', label: 'Map 2: small line', def: 'two wings, one state' },
      { k: 'mapWest', label: 'Map 2: west label', def: 'West' },
      { k: 'mapEast', label: 'Map 2: east label', def: 'East' },
      { k: 'mapArrowB', label: 'Second arrow: word', def: '1971' },
      { k: 'mapC', label: 'Map 3: name', def: 'Bangladesh' },
      { k: 'mapCSub', label: 'Map 3: small line', def: 'a new coin of its own' }
    ] },
    { id: 'labels', title: 'Coin detail labels', items: [
      { k: 'lblTheme', label: 'Label: theme', def: 'Theme' },
      { k: 'lblEra', label: 'Label: era', def: 'Era' },
      { k: 'lblPlace', label: 'Label: place found', def: 'Found in' },
      { k: 'lblDate', label: 'Label: date found', def: 'Date found' },
      { k: 'lblMaterial', label: 'Label: material', def: 'Material' },
      { k: 'lblYear', label: 'Label: year written on the coin', def: 'Year on coin' },
      { k: 'lblDenomination', label: 'Label: denomination', def: 'Denomination' },
      { k: 'lblCondition', label: 'Label: condition', def: 'Condition' },
      { k: 'lblId', label: 'Label: collection ID', def: 'Collection ID' }
    ] },
    { id: 'quest', title: 'Fill-your-trunk game', items: [
      { k: 'questNote', label: 'Handwritten line above the question', def: 'one more thing' },
      { k: 'questTitle', label: 'Question', def: 'Have 2 minutes to fill your trunk too?' },
      { k: 'questSub', label: 'Line under the question', def: 'Search three places where old coins like to hide. Choose wisely.' },
      { k: 'questYes', label: 'Yes button', def: 'Yes, let’s go' },
      { k: 'questSkip', label: 'Skip button', def: 'Skip' },
      { k: 'trunkLabel', label: 'Label above the visitor’s trunk', def: 'Your trunk' },
      { k: 'pickNote', label: 'Step 1: handwritten line', def: 'step one' },
      { k: 'pickTitle', label: 'Step 1: title', def: 'Pick 3 places to search' },
      { k: 'pickSub', label: 'Step 1: line under the title', def: 'Tap three spots on the old map. You will walk to them in the order you pick.' },
      { k: 'mapTitle', label: 'Map: title on the ribbon', def: 'Map of Hidden Corners' },
      { k: 'mapStart', label: 'Map: starting camp label', def: 'Start' },
      { k: 'travelTo', label: 'While walking', def: 'Walking to', hint: 'Shows as: Walking to An old rusty trunk…' },
      { k: 'runTo', label: 'While running away from an empty place', def: 'Running to' },
      { k: 'pickCount', label: 'Step 1: counter', def: '{n} of 3 chosen', hint: '{n} becomes the number of places picked.' },
      { k: 'pickGo', label: 'Step 1: start button', def: 'Start the journey' },
      { k: 'locConcrete', label: 'Place 1', def: 'A concrete basement wall' },
      { k: 'locTree', label: 'Place 2', def: 'Inside an old big tree' },
      { k: 'locTrunk', label: 'Place 3', def: 'An old rusty trunk' },
      { k: 'locBox', label: 'Place 4', def: 'A wooden box beneath a farm' },
      { k: 'locHome', label: 'Place 5', def: 'An old empty house' },
      { k: 'searching', label: 'While searching', def: 'Searching', hint: 'Shows as: Searching an old rusty trunk…' },
      { k: 'emptyTitle', label: 'Empty place: title', def: 'Nothing but dust.' },
      { k: 'emptyText', label: 'Empty place: message', def: 'Tell the villagers (or the owners) a story, and run!' },
      { k: 'nextPlace', label: 'Button: next place', def: 'Next place' },
      { k: 'finishBtn', label: 'Button: after the last place', def: 'See my trunk' },
      { k: 'labNote', label: 'Lab: handwritten line', def: 'in the lab' },
      { k: 'foundTitle', label: 'Lab: title', def: 'You found a coin!' },
      { k: 'zoomHint', label: 'Lab: hint', def: 'Zoom in and look closely before you decide.' },
      { k: 'labQuestion', label: 'Lab: question', def: 'What will you do with it?' },
      { k: 'restoreLabel', label: 'Lab: restore button', def: 'Restore it' },
      { k: 'leaveLabel', label: 'Lab: leave button', def: 'Leave it as it is' },
      { k: 'flipLabel', label: 'Lab: flip button', def: 'Flip' },
      { k: 'okTitle', label: 'Right answer: title', def: 'Well done! Into your trunk it goes.' },
      { k: 'collectedNote', label: 'Right answer: small tag', def: 'added to your trunk' },
      { k: 'failTitle', label: 'Wrong answer: title', def: 'Oh nooo…' },
      { k: 'lostNote', label: 'Wrong answer: small tag', def: 'not collected' },
      { k: 'whyLabel', label: 'Label before the explanation', def: 'Why?' },
      { k: 'endTitle', label: 'End: title', def: 'Your trunk holds {n} of 3 coins.', hint: '{n} becomes the number of coins collected.' },
      { k: 'endText', label: 'End: message', def: 'Every coin you saved is a story kept. Every one you lost is a lesson every collector learns the hard way.', type: 'long' },
      { k: 'trunkEmpty', label: 'End: message when the trunk is empty', def: 'Nothing in your trunk this time. Every collector starts with an empty one.' },
      { k: 'endContinue', label: 'End: continue button', def: 'Meet the collector' },
      { k: 'retryLabel', label: 'End: play again button', def: 'Search different places' }
    ] },
    { id: 'about', title: 'About', items: [
      { k: 'aboutNote', label: 'Handwritten line above your name', def: 'who is this?' },
      { k: 'about', label: 'About text', type: 'long', def: 'I restore and study pre-colonial and colonial-era coins found across 25 districts, and I use them to teach local history. A coin is small enough to hold and old enough to remember.' },
      { k: 'histHash', label: 'Small line about Hist-Hash', def: 'I also chair Hist-Hash, a collector network.', hint: 'Leave empty to remove it completely.' },
      { k: 'factCoins', label: 'Fact label: coins', def: 'Coins restored' },
      { k: 'factDistricts', label: 'Fact label: districts', def: 'Districts explored' },
      { k: 'factEraValue', label: 'Third fact: big text', def: 'Pre-colonial & colonial' },
      { k: 'factEraLabel', label: 'Third fact: small label', def: 'Eras of the collection' }
    ] },
    { id: 'thanks', title: 'The ending (thank you and contact)', items: [
      { k: 'thxNote', label: 'Handwritten line above the title', def: 'one last thing' },
      { k: 'thxTitle', label: 'Thank-you title', def: 'Thank you for looking at old things with me.' },
      { k: 'thxText', label: 'Thank-you message', type: 'long', def: 'Every coin here was once in someone’s pocket on an ordinary day. If your family keeps a drawer of old things, look at the smallest one first.', hint: 'Write this in your own voice. It is the last thing the visitor reads.' },
      { k: 'thxSign', label: 'Sign-off', def: '— Mahi' },
      { k: 'coinNote', label: 'Line under the ending coin', def: 'one side shows Bangladesh. The other shows the land it came from. Maybe a coin like this is in your drawer?' },
      { k: 'emailLabel', label: 'Email button', def: 'Email me' },
      { k: 'whatsappLabel', label: 'WhatsApp button', def: 'WhatsApp' }
    ] },
    { id: 'groups', title: 'Coin groups', items: [
      { k: 'themes', label: 'Group names offered when adding a coin', type: 'list', def: ['Before Bangladesh', 'Changing Powers', 'Forgotten Circulation', 'Stories in Design', 'Beyond Borders'], hint: 'One per line. You can still type a new group name on any coin.' }
    ] }
  ];

  const defaults = {};
  G.forEach((g) => g.items.forEach((it) => { defaults[it.k] = it.def; }));

  function merge(over) {
    const out = JSON.parse(JSON.stringify(defaults));
    if (!over || typeof over !== 'object') return out;
    Object.keys(defaults).forEach((k) => {
      if (!(k in over)) return;
      const v = over[k];
      if (k === 'chapters') {
        if (Array.isArray(v) && v.length) out.chapters = v.filter((c) => c && typeof c === 'object').map((c) => ({ tag: String(c.tag || ''), title: String(c.title || ''), text: String(c.text || '') }));
      } else if (k === 'phases') {
        if (Array.isArray(v) && v.length) out.phases = v.filter((c) => c && typeof c === 'object').map((c, i) => ({ id: String(c.id || 'p' + (i + 1)), tag: String(c.tag || ''), title: String(c.title || '') }));
      } else if (k === 'themes') {
        if (Array.isArray(v)) out.themes = v.map(String).map((s) => s.trim()).filter(Boolean);
      } else if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
    });
    return out;
  }

  /* The five places of the treasure game (ids are stored on the coins; names are editable text above) */
  const LOCS = [
    { id: 'concrete', k: 'locConcrete' }, { id: 'tree', k: 'locTree' }, { id: 'trunk', k: 'locTrunk' },
    { id: 'box', k: 'locBox' }, { id: 'home', k: 'locHome' }
  ];

  /* Realistic "what went wrong" messages, used when a game coin has no custom one.
     Grounded in conservation guidance: stripping the protective patina and abrasive cleaning leave hairline scratches
     and raw, unnatural-looking metal; active chloride corrosion ("bronze disease") spreads and crumbles the coin if neglected. */
  function metalGroup(m) {
    m = String(m || '').toLowerCase();
    if (/copper|bronze|brass|cupro|pice|paisa/.test(m)) return 'cu';
    if (/silver|billon|rupee/.test(m)) return 'ag';
    if (/gold|mohur/.test(m)) return 'au';
    if (/iron|steel/.test(m)) return 'fe';
    return 'other';
  }
  const DAMAGE = {
    over: {
      cu: 'You scrubbed off the protective green-brown patina. The surface is now raw orange, covered in fine hairline scratches, and a layer of the coin’s history is gone for good.',
      ag: 'The polish stripped the natural toning and left a dull surface full of hairline scratches. Old silver can be brittle too, and the fine details have gone soft.',
      au: 'Gold barely corrodes, so there was nothing to remove. All the rubbing did was scratch the surface and rub away the fine detail.',
      fe: 'The rust crust was holding the coin together. When you scraped it, flakes came away with the design underneath.',
      other: 'Scrubbing removed the natural surface and left fine scratches that can never be undone.'
    },
    neglect: {
      cu: 'Those light green powdery spots were active corrosion ("bronze disease"). It keeps spreading, even to coins stored nearby, and now the coin is pitted and crumbling.',
      ag: 'The crust and corrosion stayed on and kept working into the metal. The silver is now pitted, and the design is eaten away in places.',
      au: 'The dirt hid damage you could have caught. Left as it was, the surface collected grime and grit that scratched it every time it was handled.',
      fe: 'Active rust kept flaking away, layer after layer. Left alone, the coin crumbled.',
      other: 'Left as it was, the corrosion kept working. The coin is now too damaged to collect.'
    }
  };
  function damageText(coin) {
    const dir = coin.qAnswer === 'restore' ? 'neglect' : 'over';
    return coin.qDamage || DAMAGE[dir][metalGroup(coin.material)];
  }

  window.CONTENT = { groups: G, defaults: defaults, merge: merge, locs: LOCS, damageText: damageText };
})();
