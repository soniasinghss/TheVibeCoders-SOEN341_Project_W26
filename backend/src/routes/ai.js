import express from 'express';
import mongoose from 'mongoose';
import Recipe from '../models/Recipe.js';
import MealPlanEntry from '../models/Mealplan.js';

const router = express.Router();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const ALLERGEN_PATTERNS = {
  peanuts: /\b(peanut|peanuts|groundnut|groundnuts)\b/i,
  treeNuts: /\b(tree nut|tree nuts|almond|almonds|cashew|cashews|walnut|walnuts|pecan|pecans|pistachio|pistachios|hazelnut|hazelnuts)\b/i,
  dairy: /\b(dairy|milk|cheese|butter|cream|yogurt|yoghurt|lactose)\b/i,
  eggs: /\b(egg|eggs)\b/i,
  gluten: /\b(gluten|wheat|barley|rye|flour|bread|pasta|noodle|noodles)\b/i,
  soy: /\b(soy|soya|tofu|tempeh|edamame)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
  fish: /\b(fish|salmon|tuna|cod|anchovy|anchovies|sardine|sardines)\b/i,
  shellfish: /\b(shellfish|shrimp|prawn|prawns|crab|lobster|mussel|mussels|clam|clams|oyster|oysters)\b/i,
};

const MEAT_TERMS = /\b(beef|pork|bacon|ham|chicken|turkey|lamb|duck|sausage|pepperoni|salami|meat|steak|fish|salmon|tuna|shrimp|prawn|crab|lobster|anchovy|anchovies)\b/i;

function normalizeText(value) {
  return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}

function ingredientText(recipe) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  return ingredients
      .map((ing) => normalizeText(ing?.name || ''))
      .filter(Boolean)
      .join(' ');
}

function hasAllergenConflict(recipe, allergenKey) {
  const text = normalizeText(`${recipe?.name || ''} ${ingredientText(recipe)} ${(Array.isArray(recipe?.dietaryTags) ? recipe.dietaryTags.join(' ') : '')}`);

  if (allergenKey === 'vegetarian') {
    return MEAT_TERMS.test(text);
  }

  if (allergenKey === 'vegan') {
    return /\b(meat|beef|pork|bacon|ham|chicken|turkey|lamb|duck|sausage|pepperoni|salami|fish|salmon|tuna|shrimp|prawn|crab|lobster|anchovy|milk|cheese|butter|cream|yogurt|egg|eggs|honey)\b/i.test(text);
  }

  if (allergenKey === 'glutenFree') {
    return /\b(gluten|wheat|barley|rye|flour|bread|pasta|noodle|noodles)\b/i.test(text);
  }

  if (allergenKey === 'halal') {
    return /\b(pork|bacon|ham|alcohol|wine|beer)\b/i.test(text);
  }

  const pattern = ALLERGEN_PATTERNS[allergenKey];
  return pattern ? pattern.test(text) : false;
}

function extractAllergiesFromPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  const allergies = new Set();

  if (/\b(vegetarian|no meat|meat free|meat-free)\b/.test(text)) allergies.add('vegetarian');
  if (/\b(vegan|plant based|plant-based)\b/.test(text)) allergies.add('vegan');
  if (/\b(gluten[ -]?free|celiac|coeliac|wheat allergy)\b/.test(text)) allergies.add('glutenFree');
  if (/\b(halal)\b/.test(text)) allergies.add('halal');

  for (const [key, pattern] of Object.entries(ALLERGEN_PATTERNS)) {
    if (pattern.test(text)) allergies.add(key);
  }

  if (/\bnut allergy|allergic to nuts|allergic to nut|no nuts\b/.test(text)) {
    allergies.add('peanuts');
    allergies.add('treeNuts');
  }

  return Array.from(allergies);
}

function isRecipeOnlyPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  const asksRecipe = /\b(recipe for|give me the recipe|ingredients for|how to make|how do i make|steps for)\b/.test(text);
  const hasAssignVerb = /\b(add|assign|plan|fill|put|set|schedule|generate)\b/.test(text);
  const hasDayOrMeal = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|breakfast|lunch|dinner|snack)\b/.test(text);
  return asksRecipe && !(hasAssignVerb && hasDayOrMeal);
}

function isAssignmentPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  return /\b(add|assign|plan|fill|put|set|schedule)\b/.test(text);
}

function isRemovePrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  return /\b(remove|clear|delete)\b/.test(text);
}

function isRemoveAllPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  return /\b(everything|entire week|full week|whole week|all meals|all entries|all slots|entire planner)\b/.test(text);
}

function extractAssignmentRecipeName(prompt) {
  const text = String(prompt || '').trim();
  const dayPattern = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
  const mealPattern = '(?:breakfast|lunch|dinner|snack)';
  const patterns = [
    /add\s+(.+?)\s+as\s+the\s+recipe\s+for/i,
    new RegExp(`add\\s+(.+?)\\s+for\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
    new RegExp(`add\\s+(.+?)\\s+as\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
    new RegExp(`assign\\s+(.+?)\\s+to\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
    new RegExp(`use\\s+(.+?)\\s+for\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
    new RegExp(`put\\s+(.+?)\\s+for\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
    new RegExp(`set\\s+(.+?)\\s+for\\s+(?:${dayPattern}\\s+)?${mealPattern}`, 'i'),
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      return m[1].replace(/[?.!]+$/g, '').trim();
    }
  }

  return null;
}

function extractRecipeNameFromPrompt(prompt) {
  const text = String(prompt || '').trim();
  const patterns = [
    /recipe for\s+(.+)$/i,
    /ingredients for\s+(.+)$/i,
    /how to make\s+(.+)$/i,
    /how do i make\s+(.+)$/i,
    /steps for\s+(.+)$/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      return m[1].replace(/[?.!]+$/g, '').trim();
    }
  }

  return text.replace(/[?.!]+$/g, '').trim();
}

function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function parsePrompt(prompt) {
  const text = String(prompt || '').toLowerCase();

  const dayMap = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const days = Object.keys(dayMap)
      .filter((d) => new RegExp(`\\b${d}\\b`, 'i').test(text))
      .map((d) => dayMap[d]);

  const meals = MEAL_TYPES.filter((m) => new RegExp(`\\b${m}\\b`, 'i').test(text));

  const keywords = {
    cheap: /\b(cheap|budget|affordable)\b/i.test(text),
    quick: /\b(quick|fast)\b/i.test(text),
    vegan: /\bvegan\b/i.test(text),
    vegetarian: /\bvegetarian\b/i.test(text),
    glutenFree: /\bgluten[ -]?free\b/i.test(text),
    halal: /\bhalal\b/i.test(text),
    easy: /\beasy\b/i.test(text),
    medium: /\bmedium\b/i.test(text),
    hard: /\b(hard|challenging)\b/i.test(text),
  };

  const allergies = extractAllergiesFromPrompt(text);

  return {
    daysMentioned: days,
    mealTypesMentioned: meals,
    hasAnyDay: days.length > 0,
    hasAnyMealType: meals.length > 0,
    daysToUse: days.length > 0 ? days : DAYS,
    mealsToUse: meals.length > 0 ? meals : MEAL_TYPES,
    keywords,
    allergies,
  };
}

function filterAndSortRecipes(recipes, parsed) {
  let filtered = [...recipes];

  const keywords = parsed?.keywords || {};
  const allergies = Array.isArray(parsed?.allergies) ? parsed.allergies : [];

  if (keywords.vegan) {
    filtered = filtered.filter((r) => Array.isArray(r.dietaryTags) && r.dietaryTags.includes('vegan') && !hasAllergenConflict(r, 'vegan'));
  }
  if (keywords.vegetarian) {
    filtered = filtered.filter((r) => {
      const hasVegTag = Array.isArray(r.dietaryTags) && r.dietaryTags.includes('vegetarian');
      return hasVegTag || !hasAllergenConflict(r, 'vegetarian');
    });
  }
  if (keywords.glutenFree) {
    filtered = filtered.filter((r) => {
      const hasTag = Array.isArray(r.dietaryTags) && r.dietaryTags.includes('gluten-free');
      return hasTag || !hasAllergenConflict(r, 'glutenFree');
    });
  }
  if (keywords.halal) {
    filtered = filtered.filter((r) => {
      const hasTag = Array.isArray(r.dietaryTags) && r.dietaryTags.includes('halal');
      return hasTag || !hasAllergenConflict(r, 'halal');
    });
  }

  for (const allergy of allergies) {
    filtered = filtered.filter((r) => !hasAllergenConflict(r, allergy));
  }

  const diff = [];
  if (keywords.easy) diff.push('easy');
  if (keywords.medium) diff.push('medium');
  if (keywords.hard) diff.push('hard');
  if (diff.length > 0) {
    filtered = filtered.filter((r) => diff.includes((r.difficulty || 'easy').toLowerCase()));
  }

  if (keywords.cheap) {
    filtered.sort((a, b) => (a.cost ?? Number.MAX_SAFE_INTEGER) - (b.cost ?? Number.MAX_SAFE_INTEGER));
  } else if (keywords.quick) {
    filtered.sort((a, b) => (a.prepTime ?? Number.MAX_SAFE_INTEGER) - (b.prepTime ?? Number.MAX_SAFE_INTEGER));
  }

  return filtered;
}

function sanitizeRecipeName(name) {
  return String(name || '')
      .replace(/^\d+[\.)-]\s*/, '')
      .replace(/\s+\d+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
}

function normalizeRecipeKey(name) {
  return sanitizeRecipeName(name).toLowerCase();
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];

  for (const candidate of candidates || []) {
    const key = normalizeRecipeKey(candidate?.name || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }

  return out;
}

function toRecipeCandidate(raw) {
  const name = sanitizeRecipeName(String(raw?.name || '').trim());
  const steps = String(raw?.steps || '').trim();
  if (!name || !steps) return null;

  let ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients : [];
  ingredients = ingredients
      .map((ing) => {
        const ingName = String(ing?.name || '').trim();
        if (!ingName) return null;
        const unit = String(ing?.unit || 'item').trim() || 'item';
        const quantity = Number(ing?.quantity);
        return {
          name: ingName,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          unit,
        };
      })
      .filter(Boolean);

  if (ingredients.length === 0) return null;

  const difficultyRaw = String(raw?.difficulty || 'easy').toLowerCase();
  const difficulty = ['easy', 'medium', 'hard'].includes(difficultyRaw) ? difficultyRaw : 'easy';

  const dietaryTags = Array.isArray(raw?.dietaryTags) ?
    raw.dietaryTags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) :
    [];

  const prepTime = Number(raw?.prepTime);
  const cost = raw?.cost === null || raw?.cost === undefined || raw?.cost === '' ? null : Number(raw.cost);

  return {
    name,
    ingredients,
    prepTime: Number.isFinite(prepTime) && prepTime > 0 ? prepTime : 30,
    steps,
    cost: Number.isFinite(cost) && cost >= 0 ? cost : null,
    difficulty,
    dietaryTags,
  };
}

function extractJsonArray(text) {
  const trimmed = String(text || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = trimmed.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

async function fetchCodexRecipes(prompt, count) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const model = process.env.OPENAI_MODEL || 'codex-mini-latest';

  const systemInstruction = [
    'You are a professional culinary assistant for a meal-planning website.',
    'Generate realistic recipes with authentic dish names and plausible ingredients.',
    'Do not create numbered variants (e.g., \'Dish 2\', \'Dish 3\') or placeholder names.',
    'Ensure all recipe names are distinct.',
    'Output must be valid JSON only: a single JSON array and nothing else.',
  ].join(' ');

  const instruction = `Create ${count} cooking recipes for this request: "${prompt}".\nReturn ONLY a JSON array, no markdown.\nEach item must be: {\n  "name": string,\n  "ingredients": [{"name": string, "quantity": number, "unit": string}],\n  "prepTime": number,\n  "steps": string,\n  "cost": number|null,\n  "difficulty": "easy"|"medium"|"hard",\n  "dietaryTags": string[]\n}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          {role: 'system', content: systemInstruction},
          {role: 'user', content: instruction},
        ],
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error('OpenAI/Codex API error:', res.status, bodyText);
      return [];
    }

    const data = await res.json();
    const contentText = data?.choices?.[0]?.message?.content || '';

    const arr = extractJsonArray(contentText) || [];
    return dedupeCandidates(arr.map(toRecipeCandidate).filter(Boolean));
  } catch (err) {
    console.error('OpenAI/Codex fetch failed:', err);
    return [];
  }
}

function parseMealDbIngredients(meal) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const ingName = String(meal?.[`strIngredient${i}`] || '').trim();
    const measure = String(meal?.[`strMeasure${i}`] || '').trim();
    if (!ingName) continue;
    out.push({
      name: ingName,
      quantity: 1,
      unit: measure || 'item',
    });
  }
  return out;
}

function mapMealDbToCandidate(meal) {
  if (!meal) return null;
  const tags = String(meal?.strTags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

  const raw = {
    name: String(meal?.strMeal || '').trim(),
    ingredients: parseMealDbIngredients(meal),
    prepTime: 30,
    steps: String(meal?.strInstructions || '').trim() || 'Cook using standard safe food preparation steps.',
    cost: null,
    difficulty: 'easy',
    dietaryTags: tags,
  };

  return toRecipeCandidate(raw);
}

function extractSearchTerms(prompt) {
  const stop = new Set(['for', 'with', 'and', 'the', 'meal', 'meals', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'breakfast', 'lunch', 'dinner', 'snack', 'vegan', 'vegetarian', 'gluten', 'free', 'halal']);
  const words = String(prompt || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => !stop.has(w));

  const uniq = Array.from(new Set(words));
  return uniq.slice(0, 5);
}

async function fetchInternetRecipes(prompt, parsed, count) {
  const terms = extractSearchTerms(prompt);
  const defaults = parsed?.keywords?.vegetarian || parsed?.keywords?.vegan ?
    ['vegetarian', 'salad', 'lentil', 'tofu'] :
    ['chicken', 'pasta', 'rice', 'soup'];

  const searchTerms = Array.from(new Set([...terms, ...defaults])).slice(0, 6);
  const candidates = [];

  for (const term of searchTerms) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const meals = Array.isArray(data?.meals) ? data.meals : [];
      for (const meal of meals) {
        const mapped = mapMealDbToCandidate(meal);
        if (mapped) candidates.push(mapped);
        if (candidates.length >= count * 2) {
          return dedupeCandidates(candidates);
        }
      }
    } catch {
      // Ignore internet source failures.
    }
  }

  return dedupeCandidates(candidates);
}

function formatRecipeDetails(recipe) {
  const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
      .map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim())
      .join('\n');

  const tags = Array.isArray(recipe.dietaryTags) && recipe.dietaryTags.length > 0 ?
    recipe.dietaryTags.join(', ') :
    'none';

  return {
    name: recipe.name,
    prepTime: recipe.prepTime,
    cost: recipe.cost,
    difficulty: recipe.difficulty,
    dietaryTags: recipe.dietaryTags || [],
    ingredients,
    steps: recipe.steps,
    summary: `${recipe.name}\nPrep: ${recipe.prepTime} min | Difficulty: ${recipe.difficulty} | Cost: ${recipe.cost ?? 'n/a'}\nTags: ${tags}\n\nIngredients:\n${ingredients}\n\nSteps:\n${recipe.steps}`,
  };
}

function buildRecipeRequestPrompt(prompt, parsed) {
  const constraints = [];
  const keywords = parsed?.keywords || {};
  const allergies = Array.isArray(parsed?.allergies) ? parsed.allergies : [];

  if (keywords.vegetarian) constraints.push('Vegetarian only.');
  if (keywords.vegan) constraints.push('Vegan only.');
  if (keywords.glutenFree) constraints.push('Gluten-free only.');
  if (keywords.halal) constraints.push('Halal only.');

  if (allergies.length > 0) {
    constraints.push(`Avoid these allergens/ingredients: ${allergies.join(', ')}.`);
  }

  if (constraints.length === 0) return prompt;
  return `${prompt}\n\nConstraints:\n- ${constraints.join('\n- ')}`;
}

function toTitleCase(text) {
  return String(text || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
}

function createFallbackRecipeCandidate(recipeName) {
  const name = toTitleCase(recipeName || 'Custom Recipe');
  const baseName = name.toLowerCase();

  return {
    name,
    ingredients: [
      {name: `${baseName} base`, quantity: 1, unit: 'batch'},
      {name: 'flour', quantity: 2, unit: 'cups'},
      {name: 'sugar', quantity: 1, unit: 'cup'},
      {name: 'eggs', quantity: 2, unit: 'item'},
      {name: 'butter', quantity: 0.5, unit: 'cup'},
    ],
    prepTime: 30,
    steps: `Prepare the ${baseName}, combine the ingredients, cook or bake until done, and serve warm.`,
    cost: null,
    difficulty: 'easy',
    dietaryTags: [],
  };
}

function createConstraintFallbackRecipes(parsed, count = 4) {
  const safeCoreIngredients = [
    {name: 'chickpeas', quantity: 1, unit: 'can'},
    {name: 'quinoa', quantity: 1, unit: 'cup'},
    {name: 'spinach', quantity: 2, unit: 'cups'},
    {name: 'bell pepper', quantity: 1, unit: 'item'},
    {name: 'olive oil', quantity: 2, unit: 'tbsp'},
    {name: 'garlic', quantity: 2, unit: 'cloves'},
    {name: 'lemon juice', quantity: 1, unit: 'tbsp'},
    {name: 'salt', quantity: 1, unit: 'tsp'},
  ];

  const allergySet = new Set(Array.isArray(parsed?.allergies) ? parsed.allergies : []);
  const keywords = parsed?.keywords || {};

  let tags = [];
  if (keywords.vegan || keywords.vegetarian) tags.push('vegan', 'vegetarian');
  if (keywords.glutenFree || allergySet.has('gluten') || allergySet.has('glutenFree')) tags.push('gluten-free');
  if (keywords.halal) tags.push('halal');
  tags = Array.from(new Set(tags));

  const templates = [
    {name: 'Lemon Chickpea Quinoa Bowl', prepTime: 25, steps: 'Cook quinoa. Saute vegetables in olive oil. Stir in chickpeas, garlic, lemon juice, and seasoning. Serve warm.'},
    {name: 'Garlic Veggie Rice Stir', prepTime: 20, steps: 'Cook rice. Saute garlic and vegetables in olive oil. Mix with rice and season to taste.'},
    {name: 'Herb Lentil Salad', prepTime: 18, steps: 'Cook lentils until tender. Toss with chopped vegetables, olive oil, lemon juice, and herbs.'},
    {name: 'Roasted Veggie Potato Plate', prepTime: 30, steps: 'Roast chopped vegetables and potatoes with olive oil, garlic, and seasoning until tender.'},
    {name: 'Tomato Bean Skillet', prepTime: 22, steps: 'Simmer beans with tomato, garlic, and spices. Cook until thick and serve hot.'},
  ];

  const desired = Math.max(1, Math.min(count, templates.length));
  const out = [];

  for (let i = 0; i < desired; i++) {
    const t = templates[i % templates.length];
    const candidate = {
      name: t.name,
      ingredients: safeCoreIngredients,
      prepTime: t.prepTime,
      steps: t.steps,
      cost: null,
      difficulty: 'easy',
      dietaryTags: tags,
    };

    let allowed = true;
    for (const allergy of allergySet) {
      if (hasAllergenConflict(candidate, allergy)) {
        allowed = false;
        break;
      }
    }

    if (allowed) {
      if (keywords.vegan && hasAllergenConflict(candidate, 'vegan')) allowed = false;
      if (keywords.vegetarian && hasAllergenConflict(candidate, 'vegetarian')) allowed = false;
      if (keywords.glutenFree && hasAllergenConflict(candidate, 'glutenFree')) allowed = false;
      if (keywords.halal && hasAllergenConflict(candidate, 'halal')) allowed = false;
    }

    if (allowed) out.push(candidate);
  }

  return dedupeCandidates(out);
}

async function upsertRecipeByName(candidate) {
  const cleanName = sanitizeRecipeName(candidate?.name || '');
  if (!cleanName) {
    throw new Error('Recipe name is required.');
  }

  const normalized = normalizeRecipeKey(cleanName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Recipe.findOne({
    name: {$regex: `^${normalized}(?:\\s+\\d+)?$`, $options: 'i'},
  });

  if (existing) return {recipe: existing, created: false};
  const createdRecipe = await Recipe.create({...candidate, name: cleanName});
  return {recipe: createdRecipe, created: true};
}

async function findOrCreateRecipeByName(recipeName) {
  const escaped = recipeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const inDb = await Recipe.findOne({name: {$regex: escaped, $options: 'i'}});
  if (inDb) return inDb;

  const codexCandidates = await fetchCodexRecipes(`recipe for ${recipeName}`, 1);
  const candidate = codexCandidates[0] || createFallbackRecipeCandidate(recipeName);

  const saved = await upsertRecipeByName(candidate);
  return saved.recipe;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickBalancedRecipe(pool, usageById, lastRecipeId, dayUsedIds = new Set(), maxUsagePerWeek = 1) {
  if (!Array.isArray(pool) || pool.length === 0) return null;

  const withUsage = pool.map((r) => ({
    recipe: r,
    id: String(r._id),
    used: usageById.get(String(r._id)) || 0,
  }));

  const sortByUsageThenRandom = (a, b) => {
    if (a.used !== b.used) return a.used - b.used;
    return Math.random() - 0.5;
  };

  const base = withUsage
      .filter((x) => x.used < maxUsagePerWeek)
      .slice()
      .sort(sortByUsageThenRandom);

  if (base.length === 0) return null;
  const noImmediateRepeat = base.filter((x) => x.id !== String(lastRecipeId || ''));

  const preferDayUnique = noImmediateRepeat.filter((x) => !dayUsedIds.has(x.id));
  if (preferDayUnique.length > 0) return preferDayUnique[0].recipe;

  if (noImmediateRepeat.length > 0) return noImmediateRepeat[0].recipe;

  return base[0]?.recipe || null;
}

router.post('/generate-and-assign', async (req, res) => {
  try {
    const {userId, prompt, weekId} = req.body ?? {};

    if (!userId || !prompt || typeof prompt !== 'string') {
      return res.status(400).json({success: false, error: 'userId and prompt are required.'});
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({success: false, error: 'Invalid userId.'});
    }

    const resolvedWeekId = weekId || getWeekId();
    const parsed = parsePrompt(prompt);

    if (isRemovePrompt(prompt)) {
      const removeAll = isRemoveAllPrompt(prompt);
      const deleteQuery = {
        user: userId,
        weekId: resolvedWeekId,
      };

      if (!removeAll) {
        if (parsed.hasAnyDay) {
          deleteQuery.day = {$in: parsed.daysToUse};
        }
        if (parsed.hasAnyMealType) {
          deleteQuery.mealType = {$in: parsed.mealsToUse};
        }
      }

      const deleted = await MealPlanEntry.deleteMany(deleteQuery);
      return res.json({
        success: true,
        mode: 'remove',
        message: `Removed ${deleted.deletedCount || 0} meal slot${deleted.deletedCount === 1 ? '' : 's'}.`,
        data: {
          removed: deleted.deletedCount || 0,
          weekId: resolvedWeekId,
          scope: removeAll ? 'all' : 'filtered',
        },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OPENAI_API_KEY is required for Codex mode. Please set OPENAI_API_KEY in backend/.env.',
      });
    }

    if (isRecipeOnlyPrompt(prompt)) {
      const recipeQuery = extractRecipeNameFromPrompt(prompt);
      const inDb = await Recipe.findOne({
        name: {$regex: recipeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i'},
      }).lean();

      if (inDb) {
        return res.json({
          success: true,
          mode: 'recipe_only',
          message: `Here is the recipe for ${inDb.name}.`,
          recipe: formatRecipeDetails(inDb),
        });
      }

      const codexCandidates = await fetchCodexRecipes(buildRecipeRequestPrompt(`recipe for ${recipeQuery}`, parsed), 1);
      const candidate = codexCandidates[0] || createFallbackRecipeCandidate(recipeQuery);

      const saved = await upsertRecipeByName(candidate);
      return res.json({
        success: true,
        mode: 'recipe_only',
        message: `Here is the recipe for ${saved.recipe.name}.`,
        recipe: formatRecipeDetails(saved.recipe),
      });
    }

    const assignmentPrompt = isAssignmentPrompt(prompt);
    const namedRecipe = extractAssignmentRecipeName(prompt);
    let forcedRecipe = null;

    if (assignmentPrompt && !parsed.hasAnyDay) {
      return res.status(400).json({
        success: false,
        error: 'For add/assign requests, please include a specific day (e.g., Tuesday).',
      });
    }

    if (assignmentPrompt && !parsed.hasAnyMealType) {
      return res.status(400).json({
        success: false,
        error: 'For add/assign requests, please include a specific meal type (breakfast, lunch, dinner, snack).',
      });
    }

    if (namedRecipe) {
      forcedRecipe = await findOrCreateRecipeByName(namedRecipe);
      if (!forcedRecipe) {
        return res.status(404).json({
          success: false,
          error: `Could not find or generate a recipe for ${namedRecipe}.`,
        });
      }
    }

    const existingEntries = await MealPlanEntry.find({
      user: userId,
      weekId: resolvedWeekId,
    }).lean();

    const existingSlots = new Set(existingEntries.map((e) => `${e.day}|${e.mealType}`));

    const requestedSlots = [];
    for (const day of parsed.daysToUse) {
      for (const mealType of parsed.mealsToUse) {
        requestedSlots.push({day, mealType});
      }
    }

    const slotsToFill = requestedSlots.filter((s) => !existingSlots.has(`${s.day}|${s.mealType}`));

    if (slotsToFill.length === 0) {
      return res.json({
        success: true,
        message: 'All requested slots are already filled.',
        data: {assignments: 0, createdRecipes: 0, skippedSlots: requestedSlots.length},
      });
    }

    const dbRecipes = await Recipe.find({}).lean();
    let filteredPool = filterAndSortRecipes(dbRecipes, parsed);

    const needed = slotsToFill.length;
    const targetPoolSize = Math.min(Math.max(needed, 6), 28);
    const shouldAugment = filteredPool.length < targetPoolSize;
    const createdRecipes = [];

    if (!forcedRecipe && shouldAugment) {
      const missingCount = Math.max(0, targetPoolSize - filteredPool.length);
      const codexCandidates = await fetchCodexRecipes(buildRecipeRequestPrompt(prompt, parsed), Math.min(Math.max(missingCount, 8), 28));
      const internetCandidates = await fetchInternetRecipes(prompt, parsed, Math.min(Math.max(missingCount, 8), 28));
      let merged = dedupeCandidates([...codexCandidates, ...internetCandidates]);

      if (merged.length === 0) {
        merged = createConstraintFallbackRecipes(parsed, Math.min(Math.max(missingCount, 6), 10));
      }

      for (const candidate of merged) {
        try {
          const saved = await upsertRecipeByName(candidate);
          if (saved.created) {
            createdRecipes.push(saved.recipe);
          }
        } catch (err) {
          console.error('Failed to save generated recipe:', err?.message || err);
        }
      }

      const refreshedRecipes = await Recipe.find({}).lean();
      filteredPool = filterAndSortRecipes(refreshedRecipes, parsed);

      if (filteredPool.length === 0) {
        const localFallbacks = createConstraintFallbackRecipes(parsed, Math.min(targetPoolSize, 10));
        for (const candidate of localFallbacks) {
          try {
            await upsertRecipeByName(candidate);
          } catch (err) {
            console.error('Failed to save fallback recipe:', err?.message || err);
          }
        }
        const refreshedWithFallback = await Recipe.find({}).lean();
        filteredPool = filterAndSortRecipes(refreshedWithFallback, parsed);
      }
    }

    if (!forcedRecipe && filteredPool.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipes available after filtering and generation.',
      });
    }

    let assignments = 0;
    let skippedSlots = requestedSlots.length - slotsToFill.length;
    const usageById = new Map();
    const usedPerDay = new Map();

    for (const entry of existingEntries) {
      const rid = String(entry?.recipe || '');
      if (rid) {
        usageById.set(rid, (usageById.get(rid) || 0) + 1);
      }

      const day = String(entry?.day || '');
      if (day && rid) {
        const daySet = usedPerDay.get(day) || new Set();
        daySet.add(rid);
        usedPerDay.set(day, daySet);
      }
    }
    let lastRecipeId = null;
    const maxUsagePerWeek = forcedRecipe ? Number.MAX_SAFE_INTEGER : 1;

    const availableUnique = filteredPool.filter((r) => {
      const id = String(r?._id || '');
      return id && (usageById.get(id) || 0) < maxUsagePerWeek;
    }).length;

    if (!forcedRecipe && availableUnique < slotsToFill.length) {
      return res.status(400).json({
        success: false,
        error: `Not enough unique recipes to fill all ${slotsToFill.length} slots without repeating. Try broader preferences or fewer slots.`,
      });
    }

    for (const slot of slotsToFill) {
      let selected = forcedRecipe;
      if (!selected) {
        const dayUsedIds = usedPerDay.get(slot.day) || new Set();
        selected = pickBalancedRecipe(filteredPool, usageById, lastRecipeId, dayUsedIds, maxUsagePerWeek);
      }

      if (!selected?._id) continue;
      lastRecipeId = selected._id;

      if (!forcedRecipe) {
        const recipeIdStr = String(selected._id);
        usageById.set(recipeIdStr, (usageById.get(recipeIdStr) || 0) + 1);
        const dayUsedIds = usedPerDay.get(slot.day) || new Set();
        dayUsedIds.add(recipeIdStr);
        usedPerDay.set(slot.day, dayUsedIds);
      }

      try {
        await MealPlanEntry.create({
          user: userId,
          recipe: selected._id,
          day: slot.day,
          mealType: slot.mealType,
          weekId: resolvedWeekId,
        });
        assignments++;
      } catch (err) {
        if (err?.code === 11000) {
          skippedSlots++;
          continue;
        }
        console.error('Failed to create meal assignment:', err);
      }
    }

    return res.json({
      success: true,
      message: forcedRecipe ?
        `Assigned ${forcedRecipe.name} to ${assignments} slot${assignments === 1 ? '' : 's'}.` :
        `Generated ${assignments} meals for ${parsed.daysToUse.length} day${parsed.daysToUse.length > 1 ? 's' : ''}. Created ${createdRecipes.length} new recipe${createdRecipes.length === 1 ? '' : 's'}.`,
      data: {
        assignments,
        createdRecipes: createdRecipes.length,
        skippedSlots,
        days: parsed.daysToUse,
        mealTypes: parsed.mealsToUse,
        forcedRecipe: forcedRecipe ? {_id: forcedRecipe._id, name: forcedRecipe.name} : null,
      },
    });
  } catch (err) {
    console.error('AI generate-and-assign error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate and assign meals.',
    });
  }
});

export default router;
