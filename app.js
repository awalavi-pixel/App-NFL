/* ==========================================
   #NoWasteMakeTaste - National Foods
   App Logic v2.0
   ========================================== */
'use strict';

/* ==========================================
   STATE
   ========================================== */
const DEFAULTS = {
  points: 0,
  tier: 'starter',
  recipesGenerated: 0,
  challengesJoined: [],
  challengePoints: 0,
  bottlesReturned: 0,
  mealsSaved: 0,
  postsCreated: 0,
  rewardsRedeemed: [],
  pointsHistory: [],
  streak: 0,
  lastVisit: null,
  onboardingDone: false
};

let S = {};

function loadState() {
  try {
    const raw = localStorage.getItem('nfl_nowaste_v2');
    S = raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  } catch (e) {
    S = Object.assign({}, DEFAULTS);
  }
}

function save() {
  try { localStorage.setItem('nfl_nowaste_v2', JSON.stringify(S)); } catch (e) {}
}

/* ==========================================
   TIERS
   ========================================== */
const TIERS = [
  { id: 'starter',   name: 'Starter',                icon: '🌱', min: 0,    max: 499,      color: '#9E9E9E' },
  { id: 'explorer',  name: 'Kitchen Explorer',        icon: '🍳', min: 500,  max: 1499,     color: '#0277BD' },
  { id: 'hero',      name: 'Taste Hero',              icon: '🦸', min: 1500, max: 2999,     color: '#6A1B9A' },
  { id: 'champion',  name: 'Sustainability Champion', icon: '🌍', min: 3000, max: 4999,     color: '#2E7D32' },
  { id: 'master',    name: 'NFL Master Creator',      icon: '👑', min: 5000, max: Infinity, color: '#C8960C' }
];

function currentTier() { return TIERS.find(t => t.id === S.tier) || TIERS[0]; }
function nextTier()    { const i = TIERS.findIndex(t => t.id === S.tier); return i < TIERS.length-1 ? TIERS[i+1] : null; }

function recalcTier() {
  const pts = S.points;
  for (let i = TIERS.length-1; i >= 0; i--) {
    if (pts >= TIERS[i].min) {
      if (TIERS[i].id !== S.tier) {
        S.tier = TIERS[i].id;
        setTimeout(() => showToast('🎉 Tier Up! You are now ' + TIERS[i].name + '!', 'gold'), 500);
      }
      return;
    }
  }
}

/* ==========================================
   POINTS
   ========================================== */
function addPoints(pts, reason, icon) {
  icon = icon || '⭐';
  S.points += pts;
  S.pointsHistory.unshift({ pts, reason, icon, time: new Date().toISOString() });
  if (S.pointsHistory.length > 60) S.pointsHistory.pop();
  recalcTier();
  save();
  refreshHeaderPts();
  refreshHomeStats();
  floatPoints(pts);
  if (pts > 0) showToast('+' + pts + ' pts — ' + reason, 'gold');
}

function spendPoints(pts) {
  if (S.points < pts) return false;
  S.points -= pts;
  recalcTier();
  save();
  refreshHeaderPts();
  return true;
}

function refreshHeaderPts() {
  const el = document.getElementById('hdrPts');
  if (el) el.textContent = S.points.toLocaleString();
}

function refreshHomeStats() {
  setText('qsPoints', S.points.toLocaleString());
  setText('qsMeals', S.mealsSaved);
  setText('qsStreak', S.streak);
  const t = currentTier();
  setText('heroBadgeIcon', t.icon);
  setText('heroBadgeTier', t.name);
  setText('hbTierIcon', t.icon);
  setText('hbTierName', t.name);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ==========================================
   STREAK
   ========================================== */
function checkStreak() {
  const today = new Date().toDateString();
  if (S.lastVisit === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  S.streak = (S.lastVisit === yesterday) ? S.streak + 1 : 1;
  S.lastVisit = today;
  if (S.streak > 1) {
    setTimeout(() => showToast('🔥 ' + S.streak + '-day streak! Keep cooking!', 'success'), 2000);
    if (S.streak % 7 === 0) addPoints(100, S.streak + '-day streak bonus!', '🔥');
  }
  save();
  refreshHomeStats();
}

/* ==========================================
   SPLASH
   ========================================== */
function runSplash() {
  const fill = document.getElementById('spFill');
  const txt  = document.getElementById('spText');
  const msgs = ['Preparing your kitchen…', 'Loading AI chef…', 'Almost ready…', 'Welcome! 🎉'];
  let pct = 0, mi = 0;

  const iv = setInterval(() => {
    pct += Math.random() * 12 + 4;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    if (fill) fill.style.width = pct + '%';
    if (pct > 25 && mi < 1) { mi = 1; if (txt) txt.textContent = msgs[1]; }
    if (pct > 55 && mi < 2) { mi = 2; if (txt) txt.textContent = msgs[2]; }
    if (pct > 85 && mi < 3) { mi = 3; if (txt) txt.textContent = msgs[3]; }
    if (pct >= 100) setTimeout(afterSplash, 500);
  }, 100);
}

function afterSplash() {
  if (S.onboardingDone) showApp();
  else showScreen('onboarding');
}

/* ==========================================
   ONBOARDING
   ========================================== */
let obIdx = 0;

document.addEventListener('DOMContentLoaded', () => {
  const next = document.getElementById('obNext');
  const skip = document.getElementById('obSkip');
  if (next) next.addEventListener('click', () => {
    if (obIdx < 2) {
      obIdx++;
      switchObSlide(obIdx);
      if (obIdx === 2) next.innerHTML = 'Get Started &#128640;';
    } else {
      finishOnboarding();
    }
  });
  if (skip) skip.addEventListener('click', finishOnboarding);

  loadState();
  checkStreak();
  setTimeout(runSplash, 200);
});

function switchObSlide(idx) {
  document.querySelectorAll('.ob-slide').forEach((s, i) => {
    s.style.display = i === idx ? 'block' : 'none';
    if (i === idx) s.style.animation = 'none', s.offsetHeight, s.style.animation = '';
  });
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function finishOnboarding() {
  S.onboardingDone = true;
  save();
  showApp();
}

/* ==========================================
   SCREEN / NAV
   ========================================== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.removeProperty('display');
  });
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

const PAGE_MAP = {
  home: 'pageHome', recipe: 'pageRecipe', challenges: 'pageChallenges',
  community: 'pageCommunity', wallet: 'pageWallet', recycle: 'pageRecycle',
  sustain: 'pageSustain', rewards: 'pageRewards', admin: 'pageAdmin', pitch: 'pagePitch'
};

let currentPage = 'home';

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  const pid = PAGE_MAP[page];
  if (!pid) return;
  const el = document.getElementById(pid);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  currentPage = page;

  document.querySelectorAll('.nav-btn[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));

  const pc = document.getElementById('pageContainer');
  if (pc) pc.scrollTo(0, 0);

  const mm = document.getElementById('moreMenu');
  if (mm) mm.style.display = 'none';

  if (page === 'wallet')     renderWallet();
  if (page === 'sustain')    renderSustain();
  if (page === 'recycle')    renderRecycleStats();
  if (page === 'rewards')    renderRewards();
  if (page === 'challenges') initChallenges();
}

function toggleMore() {
  const mm = document.getElementById('moreMenu');
  if (!mm) return;
  const isOpen = mm.style.display === 'flex';
  mm.style.display = isOpen ? 'none' : 'flex';
  mm.classList.toggle('open', !isOpen);
  if (!isOpen) {
    setTimeout(() => document.addEventListener('click', closeMoreOut, { once: true }), 100);
  }
}

function closeMoreOut(e) {
  const mm = document.getElementById('moreMenu');
  if (mm && !mm.contains(e.target)) { mm.style.display = 'none'; mm.classList.remove('open'); }
}

function showApp() {
  showScreen('app');
  refreshHeaderPts();
  refreshHomeStats();
  initChallenges();
  initCommunity();
  initRewards();
  initAdminCharts();
  document.getElementById('notifBtn').addEventListener('click', () => showToast('No new notifications', ''));
}

/* ==========================================
   INGREDIENTS
   ========================================== */
let ingredients = [];

document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('ingredientInput');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } });
});

function addIngredient() {
  const inp = document.getElementById('ingredientInput');
  if (!inp) return;
  const raw = inp.value.trim();
  if (!raw) return;
  raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(item => {
    if (!ingredients.includes(item)) ingredients.push(item);
  });
  inp.value = '';
  renderTags();
}

function quickAdd(item) {
  if (!ingredients.includes(item)) ingredients.push(item);
  renderTags();
}

function removeIngredient(i) {
  ingredients.splice(i, 1);
  renderTags();
}

function renderTags() {
  const c = document.getElementById('ingredientTags');
  if (!c) return;
  c.innerHTML = ingredients.map((ing, i) =>
    '<span class="ingr-tag">' + ing + ' <button onclick="removeIngredient(' + i + ')">&#10005;</button></span>'
  ).join('');
}

/* ==========================================
   AI RECIPE ENGINE
   ========================================== */
const RECIPE_DB = [
  { keys: ['chicken','murgh','poultry','gosht'],
    recipes: [
      { name: 'Creamy Mayo Chicken Wrap', emoji: '🥙', time: 10, diff: 'Easy', servings: 2, waste: '0.4 kg', pts: 35,
        ingredients: ['Leftover chicken, shredded', '2 rotis or tortillas', '3 tbsp National Mayo', 'Lettuce leaves', 'Tomato slices', 'Salt & black pepper', 'National Chilli Garlic Sauce'],
        steps: ['Shred leftover chicken into bite-sized pieces.','Mix chicken with 2 tbsp National Mayo, season with salt and pepper.','Spread remaining mayo across each roti.','Layer lettuce, tomato, then the mayo chicken on top.','Roll tightly, slice on the diagonal, serve immediately.'],
        product: 'National Mayo + National Chilli Garlic Sauce' },
      { name: 'Spicy Chicken Mayo Bowl', emoji: '🍚', time: 15, diff: 'Easy', servings: 2, waste: '0.5 kg', pts: 40,
        ingredients: ['Leftover chicken pieces', '1 cup steamed rice', '3 tbsp National Mayo', '1 tsp National Chilli Sauce', 'Spring onions, sliced', 'Sesame seeds', 'Light soy sauce'],
        steps: ['Heat chicken in a pan with a splash of water until warmed through.','Whisk National Mayo with chilli sauce and soy sauce.','Serve rice in a bowl, arrange chicken on top.','Drizzle the spicy mayo sauce generously.','Finish with spring onions and sesame seeds.'],
        product: 'National Mayo + National Chilli Sauce' }
    ]
  },
  { keys: ['bread','toast','sandwich','bun','pao'],
    recipes: [
      { name: 'Loaded Mayo Egg Toast', emoji: '🍞', time: 8, diff: 'Easy', servings: 1, waste: '0.2 kg', pts: 25,
        ingredients: ['2 bread slices (leftover)', '2 tbsp National Mayo', '1 boiled egg, sliced', 'Tomato slices', 'National Ketchup', 'Salt & chaat masala', 'Fresh coriander'],
        steps: ['Toast the bread until golden and crispy.','Spread National Mayo generously on each slice.','Layer boiled egg slices and tomato.','Drizzle National Ketchup over the top.','Sprinkle chaat masala and fresh coriander to serve.'],
        product: 'National Mayo + National Ketchup' }
    ]
  },
  { keys: ['roti','chapati','paratha'],
    recipes: [
      { name: 'Mayo Roti Roll-Up', emoji: '🌮', time: 5, diff: 'Super Easy', servings: 1, waste: '0.2 kg', pts: 20,
        ingredients: ['1 leftover roti or paratha', '2 tbsp National Mayo', 'Any leftover sabzi or filling', 'Chaat masala', 'Fresh coriander', 'Green chilli, sliced'],
        steps: ['Warm the roti briefly on a tawa over low heat.','Spread National Mayo across the entire surface.','Add your leftover sabzi or filling down the centre.','Sprinkle chaat masala, coriander, and green chilli.','Roll firmly and enjoy as a quick snack or meal.'],
        product: 'National Mayo' }
    ]
  },
  { keys: ['rice','chawal','biryani','pulao','fried rice'],
    recipes: [
      { name: 'Mayo Fried Rice', emoji: '🍳', time: 15, diff: 'Medium', servings: 2, waste: '0.5 kg', pts: 30,
        ingredients: ['2 cups leftover rice', '2 tbsp National Mayo', '2 eggs', 'Mixed vegetables (carrot, peas, corn)', 'Soy sauce', 'Spring onions', '2 garlic cloves, minced'],
        steps: ['Heat oil in a wok on high heat until smoking.','Scramble the eggs, remove and set aside.','Stir-fry garlic and vegetables for 2 minutes.','Add cold leftover rice, break up any clumps.','Stir in National Mayo and soy sauce until evenly coated.','Mix in scrambled eggs, garnish with spring onions.'],
        product: 'National Mayo' }
    ]
  },
  { keys: ['fries','chips','potato','aloo','crispy'],
    recipes: [
      { name: 'Spicy Mayo Loaded Fries', emoji: '🍟', time: 10, diff: 'Easy', servings: 2, waste: '0.3 kg', pts: 25,
        ingredients: ['Leftover fries or chips', '3 tbsp National Mayo', '1 tbsp National Chilli Sauce', 'Grated cheese (optional)', 'Jalapeños', 'Spring onions, chopped', 'Paprika to taste'],
        steps: ['Crisp up leftover fries in oven at 200°C for 6 minutes.','Whisk National Mayo with chilli sauce and paprika.','Spread fries on a serving plate, add cheese if using.','Drizzle spicy mayo generously across the top.','Top with jalapeños and spring onions. Serve hot!'],
        product: 'National Mayo + National Chilli Sauce' }
    ]
  },
  { keys: ['egg','anda','eggs','boiled egg','omelette'],
    recipes: [
      { name: 'Classic Mayo Egg Salad', emoji: '🥚', time: 8, diff: 'Easy', servings: 2, waste: '0.2 kg', pts: 22,
        ingredients: ['3 boiled eggs', '3 tbsp National Mayo', '4 bread slices or crackers', 'Dijon mustard (optional)', 'Salt & white pepper', 'Paprika', 'Fresh parsley or coriander'],
        steps: ['Chop boiled eggs into small pieces in a bowl.','Mix thoroughly with National Mayo and mustard.','Season with salt, white pepper, and a pinch of paprika.','Spread generously on toast or serve with crackers.','Garnish with fresh herbs and a final sprinkle of paprika.'],
        product: 'National Mayo' }
    ]
  },
  { keys: ['vegetables','sabzi','veggie','greens','salad','mix veg','leftover veg'],
    recipes: [
      { name: 'Creamy Veggie Mayo Toast', emoji: '🥗', time: 8, diff: 'Easy', servings: 2, waste: '0.4 kg', pts: 28,
        ingredients: ['Any leftover cooked vegetables', '4 bread slices', '3 tbsp National Mayo', 'Cheese slices (optional)', 'Mixed herbs (oregano, basil)', 'National Ketchup'],
        steps: ['Roughly chop or mash leftover vegetables.','Mix with 2 tbsp National Mayo and mixed herbs.','Toast bread until golden.','Spread veggie mayo mixture generously on each slice.','Add cheese and broil for 2 minutes if desired.','Drizzle National Ketchup and serve warm.'],
        product: 'National Mayo + National Ketchup' }
    ]
  },
  { keys: ['pasta','noodles','spaghetti','macaroni','penne'],
    recipes: [
      { name: 'Cold Mayo Pasta Salad', emoji: '🍝', time: 10, diff: 'Easy', servings: 2, waste: '0.4 kg', pts: 28,
        ingredients: ['1 cup leftover pasta', '3 tbsp National Mayo', 'Sweet corn kernels', 'Capsicum, diced', 'Black olives, sliced', 'Salt & black pepper', 'Mixed Italian herbs'],
        steps: ['If pasta is cold from fridge, let it come to room temperature.','Combine pasta with corn, capsicum, and olives in a bowl.','Add National Mayo and fold through gently.','Season with salt, pepper, and herbs to taste.','Refrigerate 10 minutes for best flavour, or serve immediately.'],
        product: 'National Mayo' }
    ]
  }
];

const FALLBACK_RECIPES = [
  { name: 'Zero Waste Mayo Platter', emoji: '🍽️', time: 8, diff: 'Easy', servings: 2, waste: '0.3 kg', pts: 18,
    ingredients: ['Any available leftovers', '3 tbsp National Mayo', 'Crackers or bread', 'Pickles or olives', 'Any available vegetables', 'Salt & spices to taste'],
    steps: ['Arrange all your leftovers on a large plate.','Whisk National Mayo with your preferred spices for a dip.','Use mayo as both a dipping sauce and a spread.','Combine flavours creatively and enjoy!','Zero food wasted — champion move!'],
    product: 'National Mayo' },
  { name: 'Quick Mayo Quesadilla', emoji: '🫓', time: 10, diff: 'Easy', servings: 1, waste: '0.25 kg', pts: 22,
    ingredients: ['2 rotis or tortillas', '2 tbsp National Mayo', 'Any leftover filling', 'Cheese (optional)', 'National Ketchup for dipping'],
    steps: ['Spread National Mayo on one roti.','Add leftover filling and cheese on top.','Cover with second roti, press firmly.','Cook on tawa 3 minutes per side until golden.','Slice into quarters, serve with National Ketchup.'],
    product: 'National Mayo + National Ketchup' }
];

function matchRecipe(ingrs) {
  for (const group of RECIPE_DB) {
    if (ingrs.some(i => group.keys.some(k => i.includes(k) || k.includes(i)))) {
      return group.recipes[Math.floor(Math.random() * group.recipes.length)];
    }
  }
  return FALLBACK_RECIPES[Math.floor(Math.random() * FALLBACK_RECIPES.length)];
}

function generateRecipe() {
  if (ingredients.length === 0) { showToast('Please add at least one ingredient!', 'error'); return; }

  const btn = document.getElementById('generateBtn');
  if (btn) btn.disabled = true;
  document.getElementById('recipeResult').style.display = 'none';
  document.getElementById('aiThinking').style.display = 'block';

  const spice = document.getElementById('spiceLevel').value;
  const aiMsgs = ['Analysing your ingredients...', 'Cross-referencing 1,200+ recipes...', 'Matching National Mayo pairings...', 'Perfecting your zero-waste meal...'];
  let mi = 0;
  const msgEl = document.querySelector('.ai-msg');
  const msgIv = setInterval(() => {
    if (msgEl && mi < aiMsgs.length) {
      msgEl.style.opacity = 0;
      setTimeout(() => { if (msgEl) { msgEl.textContent = aiMsgs[mi]; msgEl.style.opacity = 1; } }, 200);
      mi++;
    }
  }, 600);

  setTimeout(() => {
    clearInterval(msgIv);
    document.getElementById('aiThinking').style.display = 'none';
    if (btn) btn.disabled = false;

    const r = JSON.parse(JSON.stringify(matchRecipe(ingredients)));
    if (spice === 'hot') r.pts += 5;
    if (spice === 'extra-hot') r.pts += 12;

    document.getElementById('rrEmoji').textContent = r.emoji;
    document.getElementById('rrName').textContent = r.name;
    document.getElementById('rrTime').textContent = '⏱ ' + r.time + ' min';
    document.getElementById('rrDiff').textContent = r.diff;
    document.getElementById('rrServings').textContent = r.servings + ' servings';
    document.getElementById('rrWaste').textContent = r.waste;
    document.getElementById('rrPts').textContent = r.pts;
    document.getElementById('rrTimeVal').textContent = r.time + ' min';
    document.getElementById('rrProduct').textContent = r.product;

    document.getElementById('rrIngredients').innerHTML = r.ingredients.map(i => '<li>' + i + '</li>').join('');
    document.getElementById('rrSteps').innerHTML = r.steps.map(s => '<li>' + s + '</li>').join('');

    document.getElementById('recipeResult').style.display = 'block';
    document.getElementById('recipeResult').scrollIntoView({ behavior: 'smooth', block: 'start' });

    addPoints(r.pts, 'AI Recipe Generated', '🤖');
    S.recipesGenerated++;
    S.mealsSaved++;
    save();
    refreshHomeStats();
    renderSustainIfOpen();
  }, 2800);
}

function saveRecipe() { showToast('Recipe saved! 📚', 'success'); }
function shareRecipe() { openPostModal(); }

/* ==========================================
   CHALLENGES
   ========================================== */
const CHALLENGES = [
  { id: 'roti',    emoji: '🫓', title: 'Roti Reinvention Challenge', desc: 'Transform leftover roti into something extraordinary with National Mayo. Most creative entry wins!', pts: 150, participants: 3240, deadline: '3 days', tag: '#RotiReinvention' },
  { id: 'chicken', emoji: '🍗', title: 'Leftover Chicken Challenge', desc: 'Show us the tastiest way to reinvent yesterday\'s chicken using National Mayo products.', pts: 200, participants: 5810, deadline: '5 days', tag: '#LeftoverChicken' },
  { id: 'mayo',    emoji: '🏅', title: 'Mayo Master Challenge', desc: 'Create the most creative recipe using only 5 ingredients with National Mayo as the star.', pts: 200, participants: 1247, deadline: '2 days', tag: '#MayoMaster' },
  { id: 'snack',   emoji: '⚡', title: '5-Minute Snack Challenge', desc: 'Under 5 minutes, with leftovers and National Mayo — make something amazing and post it!', pts: 100, participants: 7650, deadline: '7 days', tag: '#5MinSnack' },
  { id: 'ramadan', emoji: '🌙', title: 'Ramadan Leftover Challenge', desc: 'Give iftar leftovers new life at sehri time! National Mayo magic for next-morning meals.', pts: 175, participants: 9230, deadline: '4 days', tag: '#RamadanLeftover' }
];

function initChallenges() {
  const list = document.getElementById('challengesList');
  if (!list) return;
  const joined = S.challengesJoined || [];

  list.innerHTML = CHALLENGES.map(ch => {
    const isJoined = joined.includes(ch.id);
    return '<div class="chal-card ' + (isJoined ? 'ch-joined' : '') + '" id="cc-' + ch.id + '">' +
      '<div class="chal-top">' +
        '<div class="chal-emoji-wrap">' + ch.emoji + '</div>' +
        '<div class="chal-head">' +
          '<div class="chal-title">' + ch.title + '</div>' +
          '<div class="chal-hash">' + ch.tag + '</div>' +
        '</div>' +
        '<div class="chal-pts-badge">' + ch.pts + ' pts</div>' +
      '</div>' +
      '<div class="chal-body">' +
        '<div class="chal-desc">' + ch.desc + '</div>' +
        '<div class="chal-chips">' +
          '<span class="chal-chip">👥 ' + ch.participants.toLocaleString() + '</span>' +
          '<span class="chal-chip">⏰ ' + ch.deadline + ' left</span>' +
          (isJoined ? '<span class="chal-chip green">✅ Joined</span>' : '') +
        '</div>' +
        '<button class="btn-primary chal-join-btn ' + (isJoined ? 'chal-joined-btn' : '') + '" ' +
          'onclick="joinChallenge(\'' + ch.id + '\',' + ch.pts + ')" ' +
          (isJoined ? 'disabled' : '') + '>' +
          (isJoined ? '✅ You\'re In!' : '🚀 Join & Earn ' + ch.pts + ' pts') +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  updateChallengeStats();
}

function joinChallenge(id, pts) {
  if (S.challengesJoined.includes(id)) { showToast('You already joined this challenge!', 'error'); return; }
  S.challengesJoined.push(id);
  S.challengePoints = (S.challengePoints || 0) + pts;
  save();
  addPoints(pts, 'Joined a challenge', '🏆');
  initChallenges();
  updateChallengeStats();
}

function updateChallengeStats() {
  setText('csJoined', S.challengesJoined.length);
  setText('csEarned', (S.challengePoints || 0).toLocaleString());
}

/* ==========================================
   COMMUNITY
   ========================================== */
const DEMO_POSTS = [
  { id:1, user:'Zara K.', init:'Z', color:'#C62828', emoji:'🥙', time:'2 hours ago', name:'Mayo Chicken Zinger Wrap', tag:'#LeftoverChicken', pts:200, desc:'Turned yesterday\'s leftover chicken into this amazing zinger wrap! National Mayo makes everything better 😍', likes:342, comments:28, trending:true, challenge:true, gradient:'ft-gradient-1' },
  { id:2, user:'Ahmed R.', init:'A', color:'#1565C0', emoji:'🍟', time:'4 hours ago', name:'Spicy Mayo Loaded Fries', tag:'#MayoMaster', pts:150, desc:'My leftover fries were about to go to waste — then came the spicy mayo rescue! Game changer 🔥', likes:218, comments:15, trending:true, challenge:true, gradient:'ft-gradient-2' },
  { id:3, user:'Sana M.', init:'S', color:'#2E7D32', emoji:'🌮', time:'6 hours ago', name:'Roti Leftover Roll', tag:'#RotiReinvention', pts:175, desc:'Morning roti + leftover aloo + National Mayo = the best 5-min breakfast ever! No waste kitchen ✨', likes:156, comments:22, trending:false, challenge:true, gradient:'ft-gradient-3' },
  { id:4, user:'Bilal T.', init:'B', color:'#6A1B9A', emoji:'🥗', time:'8 hours ago', name:'Creamy Veggie Mayo Bowl', tag:'#5MinSnack', pts:100, desc:'Leftover veggies from dinner became today\'s healthy bowl. Going green with National Foods!', likes:94, comments:11, trending:false, challenge:true, gradient:'ft-gradient-4' },
  { id:5, user:'Hina F.', init:'H', color:'#00695C', emoji:'🍳', time:'12 hours ago', name:'Mayo Egg Breakfast Toast', tag:'#MayoMaster', pts:200, desc:'Simple leftover eggs, National Mayo on toast — perfection! Who knew zero waste tastes this good?', likes:276, comments:19, trending:true, challenge:true, gradient:'ft-gradient-5' },
  { id:6, user:'Usman L.', init:'U', color:'#E65100', emoji:'🍚', time:'1 day ago', name:'Biryani Leftover Rice Bowl', tag:'#LeftoverChicken', pts:150, desc:'Leftover biryani rice + shredded chicken + National Mayo drizzle = FIRE. Don\'t sleep on this 🤤', likes:389, comments:44, trending:true, challenge:true, gradient:'ft-gradient-6' }
];

function initCommunity() { renderFeed(DEMO_POSTS); }

function filterFeed(filter, el) {
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  let posts = [...DEMO_POSTS];
  if (filter === 'trending') posts = posts.filter(p => p.trending);
  if (filter === 'challenges') posts = posts.filter(p => p.challenge);
  renderFeed(posts);
}

function renderFeed(posts) {
  const feed = document.getElementById('communityFeed');
  if (!feed) return;
  feed.innerHTML = posts.map(p => '' +
    '<div class="feed-card">' +
      '<div class="feed-thumb ' + p.gradient + '">' +
        '<span class="feed-badge-tag">' + p.tag + '</span>' +
        '<span class="feed-pts-badge">+' + p.pts + ' pts</span>' +
        p.emoji +
        '<div class="feed-nfl-badge"><img src="assets/logo.svg" alt="NFL" onerror="this.src=\'assets/logo.png\';this.onerror=null"/></div>' +
      '</div>' +
      '<div class="feed-body">' +
        '<div class="feed-user">' +
          '<div class="feed-avatar" style="background:' + p.color + '">' + p.init + '</div>' +
          '<div class="feed-user-info">' +
            '<div class="feed-username">' + p.user + ' <span class="feed-verified">&#11088;</span></div>' +
            '<div class="feed-time">' + p.time + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="feed-recipe-name">' + p.name + '</div>' +
        '<div class="feed-desc">' + p.desc + '</div>' +
        '<div class="feed-actions">' +
          '<button class="feed-action" onclick="likePost(this,' + p.id + ')">❤️ <span>' + p.likes + '</span></button>' +
          '<button class="feed-action">💬 ' + p.comments + '</button>' +
          '<button class="feed-action" onclick="showToast(\'Recipe shared! 🚀\',\'success\')">📤 Share</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');
}

function likePost(btn, id) {
  const span = btn.querySelector('span');
  const n = parseInt(span ? span.textContent : 0);
  const liked = btn.classList.toggle('liked');
  if (span) span.textContent = liked ? n + 1 : n - 1;
  if (liked) showToast('❤️ Liked!', 'success');
}

/* ==========================================
   POST MODAL
   ========================================== */
function openPostModal() {
  const m = document.getElementById('postModal');
  if (m) m.style.display = 'flex';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

function simulateUpload() {
  document.getElementById('uploadIcon').textContent = '✅';
  document.getElementById('uploadText').textContent = 'Photo added!';
  const uz = document.getElementById('uploadZone');
  if (uz) uz.style.background = 'var(--green-light)';
}

function submitPost() {
  const name = (document.getElementById('postName').value || '').trim();
  if (!name) { showToast('Please add a recipe name!', 'error'); return; }
  const desc = (document.getElementById('postDesc').value || '').trim() || 'Shared from #NoWasteMakeTaste ✨';
  const tag  = document.getElementById('postChallenge').value || '#NoWasteMakeTaste';
  const emojis = ['🥙','🍳','🥗','🍟','🌮','🍚','🥚','🍝','🫓'];
  const grads = ['ft-gradient-1','ft-gradient-2','ft-gradient-3','ft-gradient-4','ft-gradient-5','ft-gradient-6'];
  const colors = ['#C62828','#1565C0','#2E7D32','#6A1B9A','#00695C','#E65100'];
  const rand = Math.floor(Math.random() * 6);

  DEMO_POSTS.unshift({
    id: Date.now(), user: 'You', init: 'Y', color: colors[rand],
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    time: 'Just now', name, tag, pts: 50, desc,
    likes: 0, comments: 0, trending: false, challenge: !!tag, gradient: grads[rand]
  });

  closeModal('postModal');
  renderFeed(DEMO_POSTS);
  document.getElementById('postName').value = '';
  document.getElementById('postDesc').value = '';
  document.getElementById('postChallenge').value = '';
  document.getElementById('uploadIcon').textContent = '📷';
  document.getElementById('uploadText').textContent = 'Tap to add your photo';
  const uz = document.getElementById('uploadZone');
  if (uz) uz.style.background = '';

  S.postsCreated++;
  save();
  addPoints(50, 'Posted a recipe', '📸');
  navigate('community');
}

/* ==========================================
   WALLET
   ========================================== */
function renderWallet() {
  const pts  = S.points;
  const tier = currentTier();
  const next = nextTier();

  setText('walletPts', pts.toLocaleString());
  setText('walletTierIcon', tier.icon);
  setText('walletTierName', tier.name);

  if (next) {
    const pct = Math.min(100, ((pts - tier.min) / (next.min - tier.min)) * 100);
    const fill = document.getElementById('tierProgressFill');
    if (fill) fill.style.width = Math.round(pct) + '%';
    setText('tpNext', next.name);
    setText('tpCurrent', pts.toLocaleString() + ' pts');
    setText('tpTarget', next.min.toLocaleString() + ' pts needed');
  } else {
    const fill = document.getElementById('tierProgressFill');
    if (fill) fill.style.width = '100%';
    setText('tpNext', 'MAX TIER 👑');
    setText('tpCurrent', pts.toLocaleString() + ' pts');
    setText('tpTarget', 'Legendary!');
  }

  const tl = document.getElementById('tiersList');
  if (tl) tl.innerHTML = TIERS.map(t => {
    const isActive = t.id === S.tier;
    const done = pts > t.max && t.max !== Infinity;
    return '<div class="tier-row ' + (isActive ? 'tr-active' : done ? 'tr-done' : '') + '">' +
      '<span class="tier-row-icon">' + t.icon + '</span>' +
      '<div class="tier-row-info">' +
        '<div class="tier-row-name">' + t.name + '</div>' +
        '<div class="tier-row-range">' + t.min.toLocaleString() + (t.max === Infinity ? '+ pts' : ' – ' + t.max.toLocaleString() + ' pts') + '</div>' +
      '</div>' +
      '<span class="tier-row-status ' + (isActive ? 'ts-current' : done ? 'ts-done' : 'ts-locked') + '">' +
        (isActive ? '● Current' : done ? '✓ Done' : '🔒') +
      '</span>' +
    '</div>';
  }).join('');

  const ph = document.getElementById('pointsHistory');
  if (ph) {
    if (!S.pointsHistory.length) {
      ph.innerHTML = '<div class="empty-msg"><span>⭐</span><p>No activity yet. Start cooking!</p></div>';
    } else {
      ph.innerHTML = S.pointsHistory.slice(0, 20).map(h =>
        '<div class="ph-row">' +
          '<span class="ph-ico">' + (h.icon || '⭐') + '</span>' +
          '<div class="ph-inf"><div class="ph-act">' + h.reason + '</div><div class="ph-t">' + fmtTime(h.time) + '</div></div>' +
          '<span class="ph-amt ' + (h.pts >= 0 ? 'pos' : 'neg') + '">' + (h.pts >= 0 ? '+' : '') + h.pts + '</span>' +
        '</div>'
      ).join('');
    }
  }
}

function fmtTime(iso) {
  if (!iso) return 'Just now';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return 'Just now';
  if (d < 60) return d + 'm ago';
  if (d < 1440) return Math.floor(d/60) + 'h ago';
  return Math.floor(d/1440) + 'd ago';
}

/* ==========================================
   RECYCLE
   ========================================== */
const recycleLog = [];

function scanBottle() {
  const btn = document.getElementById('scanBtn');
  const txt = document.getElementById('vmStatus');
  if (btn) btn.disabled = true;

  const steps = [
    { msg: 'SCANNING…', dot: '#FFC107' },
    { msg: 'VERIFYING…', dot: '#FF9800' },
    { msg: 'CALCULATING IMPACT…', dot: '#FF5722' },
    { msg: 'ACCEPTED! ✓', dot: '#00FF9F' }
  ];
  let i = 0;
  const dot = document.getElementById('vmDot');

  const iv = setInterval(() => {
    if (txt) txt.textContent = steps[i].msg;
    if (dot) dot.style.background = steps[i].color;
    i++;
    if (i >= steps.length) {
      clearInterval(iv);
      processReturn();
      setTimeout(() => {
        if (txt) txt.textContent = 'READY';
        if (dot) dot.style.background = '#00FF9F';
        if (btn) btn.disabled = false;
      }, 2200);
    }
  }, 650);
}

function processReturn() {
  S.bottlesReturned++;
  const pts = 25;
  recycleLog.unshift({
    type: 'National Mayo Bottle (500g)',
    date: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    pts
  });
  save();
  addPoints(pts, 'Bottle returned', '♻️');
  renderRecycleStats();
  refreshHomeStats();
}

function renderRecycleStats() {
  const b = S.bottlesReturned;
  setText('rsBottles', b);
  setText('rsPlastic', (b * 45).toLocaleString() + 'g');
  setText('rsCarbon',  (b * 120).toLocaleString() + 'g');
  setText('rsPoints',  (b * 25).toLocaleString());

  const rh = document.getElementById('recycleHistory');
  if (!rh) return;
  if (!recycleLog.length) {
    rh.innerHTML = '<div class="empty-msg"><span>♻️</span><p>No returns yet. Scan your first bottle!</p></div>';
  } else {
    rh.innerHTML = recycleLog.slice(0, 8).map(r =>
      '<div class="rh-row">' +
        '<span class="rh-row-type">♻️ ' + r.type + '</span>' +
        '<span class="rh-row-date">' + r.date + '</span>' +
        '<span class="rh-row-pts">+' + r.pts + ' pts</span>' +
      '</div>'
    ).join('');
  }
}

/* ==========================================
   SUSTAINABILITY
   ========================================== */
function renderSustain() {
  const b = S.bottlesReturned;
  const m = S.mealsSaved;
  const c = (S.challengesJoined || []).length;

  setText('siMeals',     m);
  setText('siFoodWaste', (m * 0.3).toFixed(1) + ' kg');
  setText('siBottlesR',  b);
  setText('siPlastic',   (b * 45) + 'g');
  setText('siCarbon',    (b * 120) + 'g');
  setText('goalMeals',      m + ' / 10');
  setText('goalBottles',    b + ' / 5');
  setText('goalChallenges', c + ' / 3');
  setText('certPts', S.points.toLocaleString());

  animWidth('pfMeals',      Math.min(100, (m/10)*100));
  animWidth('pfBottles',    Math.min(100, (b/5)*100));
  animWidth('pfChallenges', Math.min(100, (c/3)*100));
  animWidth('ccFill',       Math.min(100, (S.points/1000)*100));
}

function renderSustainIfOpen() {
  if (currentPage === 'sustain') renderSustain();
}

function animWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) setTimeout(() => { el.style.width = Math.round(pct) + '%'; }, 100);
}

/* ==========================================
   REWARDS
   ========================================== */
const REWARDS = [
  { id: 'mayo-disc',     emoji: '🫙', name: '15% Mayo Discount',    desc: 'Discount on your next National Mayo purchase',        pts: 200 },
  { id: 'bundle',        emoji: '🛒', name: 'Product Bundle',        desc: 'National Foods condiments bundle pack',               pts: 500 },
  { id: 'recipe-kit',    emoji: '👨‍🍳', name: 'Recipe Kit',           desc: 'Professional recipe kit with National products',       pts: 800 },
  { id: 'creator-badge', emoji: '🏆', name: 'Creator Badge',         desc: 'Exclusive NFL Master Creator digital badge',           pts: 1000 },
  { id: 'voucher',       emoji: '🎟️', name: 'Rs 500 Voucher',        desc: 'Shopping voucher for National Foods products',         pts: 350 },
  { id: 'premium-kit',   emoji: '✨', name: 'Premium Cooking Kit',   desc: 'Premium NFL branded cooking accessories & apron',      pts: 1500 }
];

function initRewards() { renderRewards(); }

function renderRewards() {
  const pts = S.points;
  setText('rewardsPts', pts.toLocaleString() + ' pts');

  const grid = document.getElementById('rewardsGrid');
  if (grid) grid.innerHTML = REWARDS.map(r => {
    const can = pts >= r.pts;
    const done = (S.rewardsRedeemed || []).some(d => d.id === r.id);
    return '<div class="rw-card">' +
      '<span class="rw-emoji">' + r.emoji + '</span>' +
      '<div class="rw-name">' + r.name + '</div>' +
      '<div class="rw-desc">' + r.desc + '</div>' +
      '<span class="rw-pts">' + r.pts.toLocaleString() + ' pts</span>' +
      '<button class="rw-btn" onclick="redeemReward(\'' + r.id + '\')" ' +
        (!can || done ? 'disabled' : '') + '>' +
        (done ? '✅ Redeemed' : can ? 'Redeem Now' : 'Need ' + (r.pts - pts).toLocaleString() + ' more pts') +
      '</button>' +
    '</div>';
  }).join('');

  const rl = document.getElementById('redeemedList');
  if (rl) {
    const red = S.rewardsRedeemed || [];
    rl.innerHTML = red.length ? red.map(r =>
      '<div class="rd-item">' +
        '<span class="rd-emoji">' + r.emoji + '</span>' +
        '<div class="rd-info"><div class="rd-name">' + r.name + '</div><div class="rd-date">' + r.date + '</div></div>' +
        '<span class="rd-pts">-' + r.pts + ' pts</span>' +
      '</div>'
    ).join('') : '<div class="empty-msg"><span>🎁</span><p>No rewards redeemed yet. Start earning points!</p></div>';
  }
}

function redeemReward(id) {
  const r = REWARDS.find(x => x.id === id);
  if (!r) return;
  if (S.points < r.pts) { showToast('Not enough points!', 'error'); return; }
  if ((S.rewardsRedeemed || []).some(d => d.id === id)) { showToast('Already redeemed!', 'error'); return; }

  if (spendPoints(r.pts)) {
    if (!S.rewardsRedeemed) S.rewardsRedeemed = [];
    S.rewardsRedeemed.push({ ...r, date: new Date().toLocaleDateString('en-PK') });
    S.pointsHistory.unshift({ pts: -r.pts, reason: 'Redeemed: ' + r.name, icon: r.emoji, time: new Date().toISOString() });
    save();
    renderRewards();
    showToast('🎉 ' + r.name + ' redeemed! Check your email.', 'success');
  }
}

/* ==========================================
   ADMIN CHARTS
   ========================================== */
function initAdminCharts() {
  setTimeout(() => {
    renderBarChart('ingredientChart', [
      { lbl: 'Chicken', pct: 85, num: '85,420' },
      { lbl: 'Rice',    pct: 72, num: '72,180' },
      { lbl: 'Roti',    pct: 68, num: '68,350' },
      { lbl: 'Eggs',    pct: 61, num: '61,290' },
      { lbl: 'Bread',   pct: 54, num: '54,100' },
      { lbl: 'Fries',   pct: 43, num: '43,760' }
    ]);
    renderBarChart('productChart', [
      { lbl: 'Natl Mayo',    pct: 100, num: '340,872' },
      { lbl: 'Ketchup',      pct: 62,  num: '211,350' },
      { lbl: 'Chilli Sauce', pct: 48,  num: '163,420' },
      { lbl: 'Mustard',      pct: 31,  num: '105,680' }
    ]);
    renderLineChart('engagementChart', [
      { day: 'Mon', pct: 78, num: '6,240' },
      { day: 'Tue', pct: 65, num: '5,200' },
      { day: 'Wed', pct: 82, num: '6,560' },
      { day: 'Thu', pct: 91, num: '7,280' },
      { day: 'Fri', pct: 100,num: '8,000' },
      { day: 'Sat', pct: 95, num: '7,600' },
      { day: 'Sun', pct: 88, num: '7,040' }
    ]);
  }, 300);
}

function renderBarChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.map(d =>
    '<div class="bc-row">' +
      '<span class="bc-lbl">' + d.lbl + '</span>' +
      '<div class="bc-track"><div class="bc-bar" data-w="' + d.pct + '%"></div></div>' +
      '<span class="bc-num">' + d.num + '</span>' +
    '</div>'
  ).join('');
  setTimeout(() => el.querySelectorAll('.bc-bar').forEach(b => { b.style.width = b.dataset.w; }), 100);
}

function renderLineChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.map(d =>
    '<div class="lc-row">' +
      '<span class="lc-day">' + d.day + '</span>' +
      '<div class="lc-track"><div class="lc-bar" data-w="' + d.pct + '%"></div></div>' +
      '<span class="lc-num">' + d.num + '</span>' +
    '</div>'
  ).join('');
  setTimeout(() => el.querySelectorAll('.lc-bar').forEach(b => { b.style.width = b.dataset.w; }), 150);
}

/* ==========================================
   TOAST
   ========================================== */
let toastTimer = null;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ==========================================
   FLOAT ANIMATION
   ========================================== */
function floatPoints(pts) {
  if (pts <= 0) return;
  const el = document.createElement('div');
  el.className = 'pts-float';
  el.textContent = '+' + pts + ' ⭐';
  el.style.cssText = 'left:' + (15 + Math.random()*60) + '%;top:40%;';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
