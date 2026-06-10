/* ═══════════════════════════════════════════
   #NoWasteMakeTaste — National Foods
   App Logic
═══════════════════════════════════════════ */

'use strict';

// ── STATE ──────────────────────────────────
const DEFAULT_STATE = {
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
  onboardingDone: false,
  uploadedPhoto: false
};

let state = {};

function loadState() {
  try {
    const saved = localStorage.getItem('nflNoWasteState');
    state = saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
  } catch (e) {
    state = { ...DEFAULT_STATE };
  }
}

function saveState() {
  localStorage.setItem('nflNoWasteState', JSON.stringify(state));
}

function addPoints(pts, reason, icon = '⭐') {
  state.points += pts;
  state.pointsHistory.unshift({ pts, reason, icon, time: new Date().toISOString() });
  if (state.pointsHistory.length > 50) state.pointsHistory.pop();
  updateTier();
  saveState();
  updateUI();
  animatePoints(pts);
  if (pts > 0) showToast(`+${pts} pts — ${reason}`, 'gold');
}

function spendPoints(pts) {
  if (state.points < pts) return false;
  state.points -= pts;
  saveState();
  updateUI();
  return true;
}

// ── TIERS ─────────────────────────────────
const TIERS = [
  { id: 'starter',    name: 'Starter',               icon: '🌱', min: 0,    max: 499,  color: '#757575' },
  { id: 'explorer',   name: 'Kitchen Explorer',       icon: '🍳', min: 500,  max: 1499, color: '#0077B6' },
  { id: 'hero',       name: 'Taste Hero',             icon: '🦸', min: 1500, max: 2999, color: '#7B1FA2' },
  { id: 'champion',   name: 'Sustainability Champion',icon: '🌍', min: 3000, max: 4999, color: '#2E7D32' },
  { id: 'master',     name: 'NFL Master Creator',     icon: '👑', min: 5000, max: Infinity, color: '#E65100' }
];

const TIER_COLORS = {
  starter: '#757575', explorer: '#0077B6', hero: '#7B1FA2',
  champion: '#2E7D32', master: '#E65100'
};

function updateTier() {
  const pts = state.points;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (pts >= TIERS[i].min) {
      const newTier = TIERS[i].id;
      if (newTier !== state.tier) {
        state.tier = newTier;
        showToast(`🎉 Tier Up! You're now a ${TIERS[i].name}!`, 'gold');
      }
      break;
    }
  }
}

function getTierData(tierId) {
  return TIERS.find(t => t.id === tierId) || TIERS[0];
}

function getCurrentTier() { return getTierData(state.tier); }

function getNextTier() {
  const idx = TIERS.findIndex(t => t.id === state.tier);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

// ── SPLASH ────────────────────────────────
function runSplash() {
  const fill = document.getElementById('loaderFill');
  const text = document.getElementById('loaderText');
  const msgs = ['Loading your kitchen…', 'Preparing AI chef…', 'Warming up recipes…', 'Ready!'];
  let pct = 0;
  let mi = 0;

  const iv = setInterval(() => {
    pct += Math.random() * 15 + 5;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    fill.style.width = pct + '%';
    if (pct > 30 && mi < 1) { text.textContent = msgs[1]; mi = 1; }
    if (pct > 60 && mi < 2) { text.textContent = msgs[2]; mi = 2; }
    if (pct > 90 && mi < 3) { text.textContent = msgs[3]; mi = 3; }
    if (pct >= 100) {
      setTimeout(() => {
        if (state.onboardingDone) { showApp(); } else { showScreen('onboarding'); }
      }, 400);
    }
  }, 120);
}

// ── ONBOARDING ────────────────────────────
let obIdx = 0;

document.getElementById('obNext').addEventListener('click', () => {
  if (obIdx < 2) {
    obIdx++;
    document.querySelectorAll('.ob-slide').forEach((s, i) => s.classList.toggle('active', i === obIdx));
    document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i === obIdx));
    if (obIdx === 2) document.getElementById('obNext').textContent = 'Get Started 🚀';
  } else {
    finishOnboarding();
  }
});

document.getElementById('obSkip').addEventListener('click', finishOnboarding);

function finishOnboarding() {
  state.onboardingDone = true;
  saveState();
  showApp();
}

// ── SCREEN MANAGEMENT ─────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showApp() {
  showScreen('app');
  updateUI();
  initChallenges();
  initCommunity();
  initRewards();
  initAdminCharts();
  checkStreak();
  navigate('home');
}

// ── NAVIGATION ────────────────────────────
const PAGE_IDS = {
  home: 'pageHome', recipe: 'pageRecipe', challenges: 'pageChallenges',
  community: 'pageCommunity', wallet: 'pageWallet', recycle: 'pageRecycle',
  sustain: 'pageSustain', rewards: 'pageRewards', admin: 'pageAdmin', pitch: 'pagePitch'
};

let currentPage = 'home';

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageId = PAGE_IDS[page];
  if (pageId) document.getElementById(pageId).classList.add('active');
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // Close more menu
  document.getElementById('moreMenu').style.display = 'none';

  // Scroll to top
  document.getElementById('pageContainer').scrollTo(0, 0);

  // Page-specific refreshes
  if (page === 'wallet') renderWallet();
  if (page === 'sustain') renderSustain();
  if (page === 'recycle') renderRecycleStats();
  if (page === 'rewards') renderRewards();
}

function toggleMoreMenu() {
  const m = document.getElementById('moreMenu');
  m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  if (m.style.display === 'flex') {
    setTimeout(() => {
      document.addEventListener('click', closeMoreOnOutside, { once: true });
    }, 100);
  }
}

function closeMoreOnOutside(e) {
  const m = document.getElementById('moreMenu');
  if (!m.contains(e.target)) m.style.display = 'none';
}

// ── UI UPDATE ─────────────────────────────
function updateUI() {
  const t = getCurrentTier();
  // Header
  document.getElementById('hdrPts').textContent = state.points.toLocaleString();
  // Home
  document.getElementById('heroName').textContent = 'Chef';
  document.getElementById('heroBadgeIcon').textContent = t.icon;
  document.getElementById('heroBadgeTier').textContent = t.name;
  document.getElementById('qsPoints').textContent = state.points.toLocaleString();
  document.getElementById('qsMeals').textContent = state.mealsSaved;
  document.getElementById('qsBottles').textContent = state.bottlesReturned;
  document.getElementById('qsStreak').textContent = state.streak;
}

// ── STREAK ────────────────────────────────
function checkStreak() {
  const today = new Date().toDateString();
  const last = state.lastVisit;
  if (last === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last === yesterday) { state.streak++; } else if (last !== today) { state.streak = 1; }
  state.lastVisit = today;
  if (state.streak > 1) {
    setTimeout(() => showToast(`🔥 ${state.streak}-day streak! Keep cooking!`, 'success'), 1500);
    if (state.streak % 7 === 0) addPoints(100, `${state.streak}-day streak bonus!`, '🔥');
  }
  saveState();
  updateUI();
}

// ── INGREDIENTS ───────────────────────────
let ingredients = [];

function addIngredient() {
  const inp = document.getElementById('ingredientInput');
  const val = inp.value.trim();
  if (!val) return;
  const items = val.split(',').map(s => s.trim()).filter(Boolean);
  items.forEach(item => {
    if (!ingredients.includes(item.toLowerCase())) {
      ingredients.push(item.toLowerCase());
    }
  });
  inp.value = '';
  renderIngredientTags();
}

document.getElementById('ingredientInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addIngredient();
});

function removeIngredient(i) {
  ingredients.splice(i, 1);
  renderIngredientTags();
}

function renderIngredientTags() {
  const c = document.getElementById('ingredientTags');
  c.innerHTML = ingredients.map((ing, i) =>
    `<span class="ingr-tag">${ing} <button onclick="removeIngredient(${i})">✕</button></span>`
  ).join('');
}

// ── AI RECIPE ENGINE ──────────────────────
const RECIPE_DB = [
  {
    keywords: ['chicken', 'murgh', 'poultry'],
    recipes: [
      {
        name: 'Creamy Mayo Chicken Wrap',
        emoji: '🥙',
        time: 10, diff: 'Easy', servings: 2,
        waste: '0.4 kg',
        ingredients: ['Leftover chicken (shredded)', '2 roti/tortillas', '3 tbsp National Mayo', 'Lettuce leaves', 'Tomato slices', 'Salt & pepper', 'National Chilli Garlic Sauce (optional)'],
        steps: ['Shred the leftover chicken into bite-sized pieces.', 'Mix chicken with 2 tbsp National Mayo, salt, and pepper in a bowl.', 'Spread remaining mayo on each roti.', 'Layer lettuce, tomato, and the mayo chicken mixture.', 'Roll tightly, slice diagonally, and serve immediately.'],
        product: 'National Mayo + National Chilli Garlic Sauce',
        pts: 35
      },
      {
        name: 'Spicy Mayo Chicken Bowl',
        emoji: '🍚',
        time: 15, diff: 'Easy', servings: 2,
        waste: '0.5 kg',
        ingredients: ['Leftover chicken', '1 cup cooked rice', '3 tbsp National Mayo', '1 tsp National Chilli Sauce', 'Spring onions', 'Sesame seeds', 'Soy sauce'],
        steps: ['Warm leftover chicken in a pan with a splash of water.', 'Whisk National Mayo with chilli sauce and soy sauce.', 'Place rice in a bowl, top with chicken.', 'Drizzle the spicy mayo sauce generously.', 'Garnish with spring onions and sesame seeds.'],
        product: 'National Mayo + National Chilli Sauce',
        pts: 40
      }
    ]
  },
  {
    keywords: ['bread', 'toast', 'sandwich', 'roti'],
    recipes: [
      {
        name: 'Pakistani Mayo Loaded Toast',
        emoji: '🍞',
        time: 8, diff: 'Easy', servings: 1,
        waste: '0.2 kg',
        ingredients: ['2 bread slices (leftover)', '2 tbsp National Mayo', 'Boiled egg (sliced)', 'Tomato slices', 'National Ketchup', 'Salt & chaat masala'],
        steps: ['Toast the bread slices until golden.', 'Spread National Mayo generously on each slice.', 'Layer sliced boiled egg and tomato.', 'Drizzle National Ketchup on top.', 'Sprinkle chaat masala and serve hot!'],
        product: 'National Mayo + National Ketchup',
        pts: 25
      },
      {
        name: 'Roti Roll-Up with Creamy Mayo',
        emoji: '🌮',
        time: 5, diff: 'Easy', servings: 1,
        waste: '0.2 kg',
        ingredients: ['1 leftover roti', '2 tbsp National Mayo', 'Any leftover sabzi or filling', 'Chaat masala', 'Fresh coriander'],
        steps: ['Warm the roti briefly on a tawa.', 'Spread National Mayo across the surface.', 'Add leftover filling down the centre.', 'Sprinkle chaat masala and coriander.', 'Roll tightly and enjoy as a quick snack!'],
        product: 'National Mayo',
        pts: 20
      }
    ]
  },
  {
    keywords: ['rice', 'chawal', 'biryani', 'pulao'],
    recipes: [
      {
        name: 'Mayo Fried Rice Delight',
        emoji: '🍳',
        time: 15, diff: 'Medium', servings: 2,
        waste: '0.5 kg',
        ingredients: ['2 cups leftover rice', '2 tbsp National Mayo', '2 eggs', 'Mixed vegetables', 'Soy sauce', 'Spring onions', 'Garlic'],
        steps: ['Heat oil in a wok over high heat.', 'Scramble eggs and set aside.', 'Stir-fry garlic and vegetables until tender.', 'Add leftover rice and mix well.', 'Stir in National Mayo and soy sauce.', 'Add eggs back in, garnish with spring onions.'],
        product: 'National Mayo',
        pts: 30
      }
    ]
  },
  {
    keywords: ['fries', 'chips', 'potato', 'aloo'],
    recipes: [
      {
        name: 'Spicy Mayo Loaded Fries',
        emoji: '🍟',
        time: 10, diff: 'Easy', servings: 2,
        waste: '0.3 kg',
        ingredients: ['Leftover fries/chips', '3 tbsp National Mayo', '1 tbsp National Chilli Sauce', 'Grated cheese', 'Jalapeños', 'Spring onions'],
        steps: ['Reheat fries in oven at 180°C for 5 mins until crispy.', 'Mix National Mayo with chilli sauce for the spicy drizzle.', 'Spread fries on a plate, add cheese.', 'Drizzle spicy mayo generously over top.', 'Top with jalapeños and spring onions. Serve immediately!'],
        product: 'National Mayo + National Chilli Sauce',
        pts: 25
      }
    ]
  },
  {
    keywords: ['egg', 'anda', 'eggs'],
    recipes: [
      {
        name: 'Classic Mayo Egg Salad Sandwich',
        emoji: '🥚',
        time: 10, diff: 'Easy', servings: 2,
        waste: '0.2 kg',
        ingredients: ['3 boiled eggs', '3 tbsp National Mayo', 'Bread slices', 'Mustard (optional)', 'Salt & pepper', 'Fresh parsley', 'Paprika'],
        steps: ['Chop boiled eggs into small pieces.', 'Mix with National Mayo, salt, pepper, and mustard.', 'Spread generously on bread slices.', 'Sprinkle paprika and fresh parsley on top.', 'Serve open-faced or as a sandwich.'],
        product: 'National Mayo',
        pts: 25
      }
    ]
  },
  {
    keywords: ['vegetable', 'sabzi', 'veggie', 'greens', 'salad'],
    recipes: [
      {
        name: 'Creamy Veggie Mayo Toast',
        emoji: '🥗',
        time: 8, diff: 'Easy', servings: 2,
        waste: '0.4 kg',
        ingredients: ['Any leftover cooked vegetables', '4 bread slices', '3 tbsp National Mayo', 'Cheese slice', 'Mixed herbs', 'National Ketchup'],
        steps: ['Mash or chop leftover vegetables into small pieces.', 'Mix well with 2 tbsp National Mayo and mixed herbs.', 'Toast bread slices until golden.', 'Spread veggie mayo mixture on toast.', 'Top with cheese slice and broil for 2 mins.', 'Drizzle National Ketchup and serve!'],
        product: 'National Mayo + National Ketchup',
        pts: 30
      }
    ]
  },
  {
    keywords: ['pasta', 'noodles', 'spaghetti', 'macaroni'],
    recipes: [
      {
        name: 'Pakistani Mayo Pasta Salad',
        emoji: '🍝',
        time: 12, diff: 'Easy', servings: 2,
        waste: '0.4 kg',
        ingredients: ['1 cup leftover pasta', '3 tbsp National Mayo', 'Sweet corn', 'Capsicum (diced)', 'Black olives', 'Salt & pepper', 'Mixed herbs'],
        steps: ['If cold, briefly warm the pasta with a splash of water.', 'In a large bowl, combine pasta with all vegetables.', 'Add National Mayo and mix thoroughly.', 'Season with salt, pepper, and mixed herbs.', 'Chill for 10 minutes or serve immediately.'],
        product: 'National Mayo',
        pts: 28
      }
    ]
  }
];

const GENERIC_RECIPES = [
  {
    name: 'Mayo Magic Snack Platter',
    emoji: '🍽️',
    time: 10, diff: 'Easy', servings: 2,
    waste: '0.3 kg',
    ingredients: ['Any leftover ingredients you have', '3 tbsp National Mayo', 'Crackers or bread', 'Pickles', 'Any available vegetables', 'Salt & spices to taste'],
    steps: ['Arrange all leftovers on a large plate.', 'Mix National Mayo with your preferred spices.', 'Use mayo as a dipping sauce or spread.', 'Combine flavours creatively.', 'Enjoy your zero-waste snack platter!'],
    product: 'National Mayo',
    pts: 20
  },
  {
    name: 'Quick Mayo Quesadilla',
    emoji: '🫓',
    time: 12, diff: 'Easy', servings: 1,
    waste: '0.25 kg',
    ingredients: ['2 rotis or tortillas', '2 tbsp National Mayo', 'Any leftover filling', 'Cheese (optional)', 'National Ketchup for dipping'],
    steps: ['Spread National Mayo on one roti.', 'Add leftover filling and cheese on top.', 'Cover with second roti.', 'Cook on tawa over medium heat, 3 mins per side.', 'Slice into quarters and serve with National Ketchup.'],
    product: 'National Mayo + National Ketchup',
    pts: 25
  }
];

function getRecipeForIngredients(ingrs, mealType, spice, cookTime, diet) {
  let matched = null;
  for (const group of RECIPE_DB) {
    if (ingrs.some(i => group.keywords.some(k => i.includes(k)))) {
      const arr = group.recipes;
      matched = arr[Math.floor(Math.random() * arr.length)];
      break;
    }
  }
  if (!matched) matched = GENERIC_RECIPES[Math.floor(Math.random() * GENERIC_RECIPES.length)];

  // Personalise based on inputs
  const pts = matched.pts + (spice === 'hot' ? 5 : spice === 'extra-hot' ? 10 : 0);
  const rec = JSON.parse(JSON.stringify(matched));
  rec.pts = pts;

  // Adjust time label
  if (parseInt(cookTime) < rec.time) rec.time = parseInt(cookTime) + 2;

  return rec;
}

function generateRecipe() {
  if (ingredients.length === 0) {
    showToast('Please add at least one ingredient!', 'error');
    return;
  }

  document.getElementById('recipeResult').style.display = 'none';
  document.getElementById('aiThinking').style.display = 'block';
  document.getElementById('generateBtn').disabled = true;

  const mealType = document.getElementById('mealType').value;
  const spice = document.getElementById('spiceLevel').value;
  const cookTime = document.getElementById('cookTime').value;
  const diet = document.getElementById('dietPref').value;

  setTimeout(() => {
    document.getElementById('aiThinking').style.display = 'none';
    document.getElementById('generateBtn').disabled = false;

    const recipe = getRecipeForIngredients(ingredients, mealType, spice, cookTime, diet);

    document.getElementById('rrEmoji').textContent = recipe.emoji;
    document.getElementById('rrName').textContent = recipe.name;
    document.getElementById('rrTime').textContent = `⏱️ ${recipe.time} min`;
    document.getElementById('rrDiff').textContent = `👨‍🍳 ${recipe.diff}`;
    document.getElementById('rrServings').textContent = `👥 ${recipe.servings} servings`;
    document.getElementById('rrWaste').textContent = recipe.waste;
    document.getElementById('rrPts').textContent = recipe.pts;
    document.getElementById('rrProduct').textContent = recipe.product;

    const ingList = document.getElementById('rrIngredients');
    ingList.innerHTML = recipe.ingredients.map(i => `<li>${i}</li>`).join('');

    const stepList = document.getElementById('rrSteps');
    stepList.innerHTML = recipe.steps.map(s => `<li>${s}</li>`).join('');

    document.getElementById('recipeResult').style.display = 'block';
    document.getElementById('recipeResult').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Auto-earn points
    addPoints(recipe.pts, 'AI Recipe Generated', '🤖');
    state.recipesGenerated++;
    state.mealsSaved++;
    saveState();
    updateUI();
  }, 2200);
}

window._lastRecipe = null;

function saveRecipe() {
  showToast('Recipe saved to your collection! 📚', 'success');
}

function shareRecipe() {
  openPostModal();
}

// ── CHALLENGES ────────────────────────────
const CHALLENGES_DATA = [
  {
    id: 'roti-reinvention',
    emoji: '🫓',
    title: 'Roti Reinvention Challenge',
    desc: 'Transform leftover roti into something extraordinary using National Mayo. Most creative entry wins!',
    pts: 150,
    participants: 3240,
    deadline: '3 days',
    tag: '#RotiReinvention',
    color: '#FF7043'
  },
  {
    id: 'leftover-chicken',
    emoji: '🍗',
    title: 'Leftover Chicken Challenge',
    desc: 'Show us the tastiest way to reinvent yesterday\'s chicken using National Mayo products.',
    pts: 200,
    participants: 5810,
    deadline: '5 days',
    tag: '#LeftoverChicken',
    color: '#D32F2F'
  },
  {
    id: 'mayo-master',
    emoji: '🏅',
    title: 'Mayo Master Challenge',
    desc: 'Create the most creative recipe using only 5 ingredients with National Mayo as the star.',
    pts: 200,
    participants: 1247,
    deadline: '2 days',
    tag: '#MayoMaster',
    color: '#F9A825'
  },
  {
    id: '5-min-snack',
    emoji: '⚡',
    title: '5-Minute Snack Challenge',
    desc: 'Under 5 minutes, using leftovers and National Mayo — make something delicious and post it!',
    pts: 100,
    participants: 7650,
    deadline: '7 days',
    tag: '#5MinSnack',
    color: '#7B1FA2'
  },
  {
    id: 'ramadan-leftover',
    emoji: '🌙',
    title: 'Ramadan Leftover Challenge',
    desc: 'Give iftar leftovers new life at sehri time! Use National Mayo to create next-morning magic.',
    pts: 175,
    participants: 9230,
    deadline: '4 days',
    tag: '#RamadanLeftover',
    color: '#1A237E'
  }
];

function initChallenges() {
  const joined = state.challengesJoined || [];
  const list = document.getElementById('challengesList');
  list.innerHTML = CHALLENGES_DATA.map(ch => {
    const isJoined = joined.includes(ch.id);
    return `
      <div class="challenge-card ${isJoined ? 'joined' : ''}" id="cc-${ch.id}">
        <div class="cc-header">
          <span class="cc-emoji">${ch.emoji}</span>
          <div class="cc-info">
            <div class="cc-title">${ch.title}</div>
            <div class="cc-desc">${ch.desc}</div>
          </div>
        </div>
        <div class="cc-meta">
          <span class="cc-chip pts">🏅 ${ch.pts} pts</span>
          <span class="cc-chip">👥 ${ch.participants.toLocaleString()}</span>
          <span class="cc-chip">⏰ ${ch.deadline}</span>
          <span class="cc-chip" style="background:#FFF3E0;color:#E65100">${ch.tag}</span>
          ${isJoined ? '<span class="cc-chip joined-chip">✅ Joined</span>' : ''}
        </div>
        <button class="btn-primary cc-join-btn ${isJoined ? 'joined-btn' : ''}"
          onclick="joinChallenge('${ch.id}', ${ch.pts})"
          ${isJoined ? 'disabled' : ''}>
          ${isJoined ? '✅ You\'re In!' : `🚀 Join — Earn ${ch.pts} pts`}
        </button>
      </div>
    `;
  }).join('');

  updateChallengeStats();
}

function joinChallenge(id, pts) {
  if (state.challengesJoined.includes(id)) {
    showToast('You already joined this challenge!', 'error');
    return;
  }
  state.challengesJoined.push(id);
  state.challengePoints = (state.challengePoints || 0) + pts;
  saveState();
  addPoints(pts, 'Joined challenge', '🏆');
  initChallenges();
  updateChallengeStats();
}

function updateChallengeStats() {
  document.getElementById('csJoined').textContent = state.challengesJoined.length;
  document.getElementById('csEarned').textContent = (state.challengePoints || 0).toLocaleString();
}

// ── COMMUNITY ─────────────────────────────
const DEMO_POSTS = [
  {
    id: 1, user: 'Zara K.', initial: 'Z', emoji: '🥙', time: '2 hours ago',
    recipe: 'Mayo Chicken Zinger Wrap', tag: '#LeftoverChicken', pts: 200,
    desc: 'Turned yesterday\'s leftover chicken into this amazing zinger wrap! National Mayo makes everything better 😍',
    likes: 342, comments: 28, trending: true, challenge: true
  },
  {
    id: 2, user: 'Ahmed R.', initial: 'A', emoji: '🍟', time: '4 hours ago',
    recipe: 'Spicy Mayo Loaded Fries', tag: '#MayoMaster', pts: 150,
    desc: 'My leftover fries were about to go to waste — then came the spicy mayo rescue! Game changer 🔥',
    likes: 218, comments: 15, trending: true, challenge: true
  },
  {
    id: 3, user: 'Sana M.', initial: 'S', emoji: '🌮', time: '6 hours ago',
    recipe: 'Roti Leftover Roll', tag: '#RotiReinvention', pts: 175,
    desc: 'Morning roti + leftover aloo + National Mayo = the best 5-minute breakfast ever! No waste kitchen ✨',
    likes: 156, comments: 22, trending: false, challenge: true
  },
  {
    id: 4, user: 'Bilal T.', initial: 'B', emoji: '🥗', time: '8 hours ago',
    recipe: 'Creamy Veggie Mayo Bowl', tag: '#5MinSnack', pts: 100,
    desc: 'Leftover veggies from yesterday\'s dinner became today\'s healthy bowl. Going green with National Foods!',
    likes: 94, comments: 11, trending: false, challenge: true
  },
  {
    id: 5, user: 'Hina F.', initial: 'H', emoji: '🍳', time: '12 hours ago',
    recipe: 'Mayo Egg Breakfast Toast', tag: '#MayoMaster', pts: 200,
    desc: 'Simple leftover eggs, a generous spread of National Mayo on toast — perfection! Who knew zero waste could taste this good?',
    likes: 276, comments: 19, trending: true, challenge: true
  },
  {
    id: 6, user: 'Usman L.', initial: 'U', emoji: '🍚', time: '1 day ago',
    recipe: 'Biryani Leftover Rice Bowl', tag: '#LeftoverChicken', pts: 150,
    desc: 'Leftover biryani rice + shredded chicken + National Mayo drizzle = FIRE. Don\'t sleep on this combo 🤤',
    likes: 389, comments: 44, trending: true, challenge: true
  }
];

let activeFeedFilter = 'all';

function initCommunity() {
  renderFeed(DEMO_POSTS);
}

function filterFeed(filter, el) {
  activeFeedFilter = filter;
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  let posts = [...DEMO_POSTS];
  if (filter === 'trending') posts = posts.filter(p => p.trending);
  if (filter === 'challenges') posts = posts.filter(p => p.challenge);
  renderFeed(posts);
}

function renderFeed(posts) {
  const feed = document.getElementById('communityFeed');
  feed.innerHTML = posts.map(p => `
    <div class="feed-card">
      <div class="fc-thumb">
        <span class="fc-tag">${p.tag}</span>
        <span class="fc-pts-badge">+${p.pts} pts</span>
        ${p.emoji}
      </div>
      <div class="fc-body">
        <div class="fc-user">
          <div class="fc-avatar">${p.initial}</div>
          <div>
            <div class="fc-username">${p.user}</div>
            <div class="fc-time">${p.time}</div>
          </div>
        </div>
        <div class="fc-recipe-name">${p.recipe}</div>
        <div class="fc-recipe-desc">${p.desc}</div>
        <div class="fc-actions">
          <button class="fc-action-btn" onclick="likePost(this, ${p.id})">
            ❤️ <span>${p.likes}</span>
          </button>
          <button class="fc-action-btn">💬 ${p.comments}</button>
          <button class="fc-action-btn" onclick="showToast('Recipe shared! 🚀', 'success')">📤 Share</button>
        </div>
      </div>
    </div>
  `).join('');
}

function likePost(btn, id) {
  const span = btn.querySelector('span');
  const current = parseInt(span.textContent);
  if (btn.classList.contains('liked')) {
    span.textContent = current - 1;
    btn.classList.remove('liked');
  } else {
    span.textContent = current + 1;
    btn.classList.add('liked');
    showToast('❤️ Liked!', 'success');
  }
}

// ── POST MODAL ────────────────────────────
function openPostModal() {
  document.getElementById('postModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function simulateUpload() {
  state.uploadedPhoto = true;
  document.getElementById('uploadIcon').textContent = '✅';
  document.getElementById('uploadText').textContent = 'Photo added!';
}

function submitPost() {
  const name = document.getElementById('postName').value.trim();
  if (!name) { showToast('Please enter a recipe name!', 'error'); return; }

  const tag = document.getElementById('postChallenge').value;
  const desc = document.getElementById('postDesc').value.trim() || 'Shared from #NoWasteMakeTaste ✨';
  const emojis = ['🥙', '🍳', '🥗', '🍟', '🌮', '🍚', '🥚', '🍝'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  const newPost = {
    id: Date.now(), user: 'You', initial: 'Y', emoji,
    time: 'Just now', recipe: name,
    tag: tag || '#NoWasteMakeTaste', pts: 50,
    desc, likes: 0, comments: 0, trending: false, challenge: !!tag
  };

  DEMO_POSTS.unshift(newPost);
  closeModal('postModal');
  renderFeed(DEMO_POSTS);

  state.postsCreated++;
  saveState();
  addPoints(50, 'Posted a recipe', '📸');

  // Reset form
  document.getElementById('postName').value = '';
  document.getElementById('postDesc').value = '';
  document.getElementById('postChallenge').value = '';
  document.getElementById('uploadIcon').textContent = '📷';
  document.getElementById('uploadText').textContent = 'Tap to add photo';
}

// ── WALLET ────────────────────────────────
function renderWallet() {
  const pts = state.points;
  const tier = getCurrentTier();
  const next = getNextTier();

  document.getElementById('walletPts').textContent = pts.toLocaleString();
  document.getElementById('walletTierIcon').textContent = tier.icon;
  document.getElementById('walletTierName').textContent = tier.name;

  // Progress bar
  if (next) {
    const pct = Math.min(100, ((pts - tier.min) / (next.min - tier.min)) * 100);
    document.getElementById('tierProgressFill').style.width = pct + '%';
    document.getElementById('tpNext').textContent = next.name;
    document.getElementById('tpCurrent').textContent = `${pts.toLocaleString()} pts`;
    document.getElementById('tpTarget').textContent = `${next.min.toLocaleString()} pts`;
  } else {
    document.getElementById('tierProgressFill').style.width = '100%';
    document.getElementById('tpNext').textContent = 'Max Tier Reached!';
    document.getElementById('tpCurrent').textContent = `${pts.toLocaleString()} pts`;
    document.getElementById('tpTarget').textContent = '∞';
  }

  // Tiers list
  const tl = document.getElementById('tiersList');
  tl.innerHTML = TIERS.map(t => {
    const isActive = t.id === state.tier;
    const isCompleted = pts >= t.max && t.max !== Infinity;
    return `
      <div class="tier-item ${isActive ? 'active-tier' : ''} ${isCompleted ? 'completed' : ''}">
        <span class="tier-icon">${t.icon}</span>
        <div class="tier-info">
          <div class="tier-name">${t.name}</div>
          <div class="tier-range">${t.min.toLocaleString()} – ${t.max === Infinity ? '∞' : t.max.toLocaleString()} pts</div>
        </div>
        <span class="tier-status ${isActive ? 'current' : isCompleted ? 'done' : 'locked'}">
          ${isActive ? '● Current' : isCompleted ? '✓ Done' : '🔒 Locked'}
        </span>
      </div>
    `;
  }).join('');

  // History
  const ph = document.getElementById('pointsHistory');
  if (state.pointsHistory.length === 0) {
    ph.innerHTML = '<p class="empty-state">No activity yet. Start cooking!</p>';
  } else {
    ph.innerHTML = state.pointsHistory.slice(0, 15).map(h => `
      <div class="ph-item">
        <span class="ph-icon">${h.icon || '⭐'}</span>
        <div class="ph-info">
          <div class="ph-action">${h.reason}</div>
          <div class="ph-time">${formatTime(h.time)}</div>
        </div>
        <span class="ph-pts ${h.pts < 0 ? 'neg' : ''}">${h.pts > 0 ? '+' : ''}${h.pts}</span>
      </div>
    `).join('');
  }
}

function formatTime(iso) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── RECYCLE ───────────────────────────────
let recycleHistory = [];

function scanBottle() {
  const btn = document.getElementById('scanBtn');
  const status = document.getElementById('vmStatus');
  btn.disabled = true;

  const steps = ['Scanning QR code…', 'Verifying bottle…', 'Calculating impact…', '✅ Bottle accepted!'];
  let i = 0;
  const iv = setInterval(() => {
    status.textContent = steps[i];
    i++;
    if (i >= steps.length) {
      clearInterval(iv);
      processBottleReturn();
      setTimeout(() => {
        status.textContent = 'Ready to scan';
        btn.disabled = false;
      }, 2000);
    }
  }, 700);
}

function processBottleReturn() {
  state.bottlesReturned++;
  const pts = 25;
  recycleHistory.unshift({
    date: new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
    type: 'National Mayo Bottle (500g)',
    pts
  });

  saveState();
  addPoints(pts, 'Bottle returned ♻️', '♻️');
  renderRecycleStats();
}

function renderRecycleStats() {
  const b = state.bottlesReturned;
  document.getElementById('rsBottles').textContent = b;
  document.getElementById('rsPlastic').textContent = `${(b * 45).toLocaleString()}g`;
  document.getElementById('rsCarbon').textContent = `${(b * 120).toLocaleString()}g`;
  document.getElementById('rsPoints').textContent = (b * 25).toLocaleString();

  const rh = document.getElementById('recycleHistory');
  if (recycleHistory.length === 0 && b === 0) {
    rh.innerHTML = '<p class="empty-state">No returns yet. Scan your first bottle!</p>';
  } else {
    const hist = recycleHistory.slice(0, 10);
    rh.innerHTML = hist.map(h => `
      <div class="rh-item">
        <span>♻️ ${h.type}</span>
        <span>${h.date}</span>
        <span class="rh-pts">+${h.pts} pts</span>
      </div>
    `).join('');
    if (hist.length === 0) rh.innerHTML = '<p class="empty-state">Start returning bottles to see history!</p>';
  }
}

// ── SUSTAINABILITY ────────────────────────
function renderSustain() {
  const b = state.bottlesReturned;
  const m = state.mealsSaved;
  const fw = (m * 0.3).toFixed(1);
  const plastic = b * 45;
  const carbon = b * 120;
  const c = state.challengesJoined.length;

  document.getElementById('siMeals').textContent = m;
  document.getElementById('siFoodWaste').textContent = `${fw} kg`;
  document.getElementById('siBottlesR').textContent = b;
  document.getElementById('siPlastic').textContent = `${plastic}g`;
  document.getElementById('siCarbon').textContent = `${carbon}g`;

  // Goals
  document.getElementById('goalMeals').textContent = `${m} / 10`;
  document.getElementById('goalBottles').textContent = `${b} / 5`;
  document.getElementById('goalChallenges').textContent = `${c} / 3`;

  document.getElementById('pfMeals').style.width = `${Math.min(100, (m / 10) * 100)}%`;
  document.getElementById('pfBottles').style.width = `${Math.min(100, (b / 5) * 100)}%`;
  document.getElementById('pfChallenges').style.width = `${Math.min(100, (c / 3) * 100)}%`;

  document.getElementById('certPts').textContent = state.points.toLocaleString();
}

// ── REWARDS ───────────────────────────────
const REWARDS_DATA = [
  { id: 'mayo-discount', emoji: '🫙', name: '15% Mayo Discount', desc: 'Discount on your next National Mayo purchase', pts: 200 },
  { id: 'product-bundle', emoji: '🛒', name: 'Product Bundle', desc: 'National Foods condiments bundle pack', pts: 500 },
  { id: 'recipe-kit', emoji: '👨‍🍳', name: 'Recipe Kit', desc: 'Professional recipe kit with National products', pts: 800 },
  { id: 'creator-badge', emoji: '🏆', name: 'Creator Badge', desc: 'Exclusive NFL Master Creator digital badge', pts: 1000 },
  { id: 'shopping-voucher', emoji: '🎟️', name: 'Rs 500 Voucher', desc: 'Shopping voucher for National Foods products', pts: 350 },
  { id: 'premium-kit', emoji: '✨', name: 'Premium Cooking Kit', desc: 'Premium NFL branded cooking accessories', pts: 1500 }
];

function initRewards() { renderRewards(); }

function renderRewards() {
  const pts = state.points;
  document.getElementById('rewardsPts').textContent = `${pts.toLocaleString()} pts`;

  const grid = document.getElementById('rewardsGrid');
  grid.innerHTML = REWARDS_DATA.map(r => {
    const canAfford = pts >= r.pts;
    const redeemed = state.rewardsRedeemed.some(rd => rd.id === r.id);
    return `
      <div class="reward-card">
        <span class="rc-emoji">${r.emoji}</span>
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${r.desc}</div>
        <span class="rc-pts">${r.pts.toLocaleString()} pts</span>
        <button class="rc-redeem-btn" onclick="redeemReward('${r.id}')"
          ${!canAfford || redeemed ? 'disabled' : ''}>
          ${redeemed ? '✅ Redeemed' : canAfford ? 'Redeem Now' : `Need ${(r.pts - pts).toLocaleString()} more pts`}
        </button>
      </div>
    `;
  }).join('');

  const rl = document.getElementById('redeemedList');
  if (state.rewardsRedeemed.length === 0) {
    rl.innerHTML = '<p class="empty-state">No rewards redeemed yet. Start earning!</p>';
  } else {
    rl.innerHTML = state.rewardsRedeemed.map(r => `
      <div class="redeemed-item">
        <span class="ri-emoji">${r.emoji}</span>
        <div class="ri-info">
          <div class="ri-name">${r.name}</div>
          <div class="ri-date">${r.date}</div>
        </div>
        <span class="ri-pts">-${r.pts} pts</span>
      </div>
    `).join('');
  }
}

function redeemReward(id) {
  const reward = REWARDS_DATA.find(r => r.id === id);
  if (!reward) return;
  if (state.points < reward.pts) { showToast('Not enough points!', 'error'); return; }
  if (state.rewardsRedeemed.some(r => r.id === id)) { showToast('Already redeemed!', 'error'); return; }

  if (spendPoints(reward.pts)) {
    state.rewardsRedeemed.push({
      ...reward,
      date: new Date().toLocaleDateString('en-PK')
    });
    state.pointsHistory.unshift({ pts: -reward.pts, reason: `Redeemed: ${reward.name}`, icon: reward.emoji, time: new Date().toISOString() });
    saveState();
    renderRewards();
    showToast(`🎉 ${reward.name} redeemed! Check your email.`, 'success');
  }
}

// ── ADMIN CHARTS ──────────────────────────
function initAdminCharts() {
  const ingData = [
    { label: 'Chicken', val: 85, raw: '85,420' },
    { label: 'Rice', val: 72, raw: '72,180' },
    { label: 'Roti', val: 68, raw: '68,350' },
    { label: 'Eggs', val: 61, raw: '61,290' },
    { label: 'Bread', val: 54, raw: '54,100' },
    { label: 'Fries', val: 43, raw: '43,760' }
  ];

  const prodData = [
    { label: 'National Mayo', val: 100, raw: '340,872' },
    { label: 'Ketchup', val: 62, raw: '211,350' },
    { label: 'Chilli Sauce', val: 48, raw: '163,420' },
    { label: 'Mustard', val: 31, raw: '105,680' }
  ];

  const engData = [
    { label: 'Mon', val: 78, raw: '6,240' },
    { label: 'Tue', val: 65, raw: '5,200' },
    { label: 'Wed', val: 82, raw: '6,560' },
    { label: 'Thu', val: 91, raw: '7,280' },
    { label: 'Fri', val: 100, raw: '8,000' },
    { label: 'Sat', val: 95, raw: '7,600' },
    { label: 'Sun', val: 88, raw: '7,040' }
  ];

  renderBarChart('ingredientChart', ingData);
  renderBarChart('productChart', prodData);
  renderLineChart('engagementChart', engData);
}

function renderBarChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.map(d => `
    <div class="bc-item">
      <span class="bc-label">${d.label}</span>
      <div class="bc-bar-wrap"><div class="bc-bar" style="width:0%" data-w="${d.val}%"></div></div>
      <span class="bc-val">${d.raw}</span>
    </div>
  `).join('');
  setTimeout(() => {
    el.querySelectorAll('.bc-bar').forEach(b => b.style.width = b.dataset.w);
  }, 200);
}

function renderLineChart(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.map(d => `
    <div class="lc-row">
      <span class="lc-day">${d.label}</span>
      <div class="lc-bar-wrap"><div class="lc-bar" style="width:0%" data-w="${d.val}%"></div></div>
      <span class="lc-val">${d.raw}</span>
    </div>
  `).join('');
  setTimeout(() => {
    el.querySelectorAll('.lc-bar').forEach(b => b.style.width = b.dataset.w);
  }, 300);
}

// ── TOAST ─────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3000);
}

// ── POINTS ANIMATION ──────────────────────
function animatePoints(pts) {
  if (pts <= 0) return;
  const el = document.createElement('div');
  el.className = 'pts-float';
  el.textContent = `+${pts} ⭐`;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.top = '40%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ── NOTIFICATIONS ─────────────────────────
document.getElementById('notifBtn').addEventListener('click', () => {
  showToast('🔔 No new notifications', '');
});

// ── INIT ──────────────────────────────────
loadState();
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(runSplash, 300);
});
