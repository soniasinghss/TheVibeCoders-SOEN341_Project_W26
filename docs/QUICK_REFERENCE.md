# Quick Reference: Smart Meal Generation

## Input Patterns

### Days (Optional)
```
"monday" | "monday and tuesday" | "thursday friday"
"weekday" is NOT supported, use specific days
```

### Meal Types (Optional)
```
"breakfast" | "lunch" | "dinner" | "snack"
"breakfast and lunch" | "breakfast, lunch, dinner"
```

### Filter Keywords (Optional)
```
DIETARY:    vegan | vegetarian | gluten-free | halal
SPEED:      quick | fast | easy prep | easy
COST:       cheap | budget | affordable
DIFFICULTY: easy | medium | hard | challenging
```

---

## Usage Examples

| Input | Days | Meals | Filters | Result |
|-------|------|-------|---------|--------|
| `"quick meals"` | All 7 | All 4 | Sort by prepTime | 28 meals (7×4) |
| `"vegan breakfast"` | All 7 | Breakfast | Dietary filter | 7 vegan breakfasts |
| `"cheap monday"` | Monday | All 4 | Sort by cost | 4 cheap meals |
| `"quick vegan breakfast for monday"` | Monday | Breakfast | 2 filters | 1 quick vegan meal |
| `"breakfast lunch for mon tue wed"` | 3 days | 2 meals | None | 6 meals |
| `"easy gluten-free dinner"` | All 7 | Dinner | 2 filters | 7 meals |

---

## Rules

✅ **Always Works:**
- Input is case-insensitive
- Multiple spaces are ignored
- Partial day names work: "mon", "monday"
- Multiple keywords can combine

❌ **Won't Work:**
- Empty input (must type something)
- Completely irrelevant text
- No recipes matching filters (auto-fallback to all recipes)

⚠️ **Behavior:**
- Already-filled slots are always skipped
- If no days specified → all 7 days
- If no meals specified → all 4 meals
- If filters match nothing → uses all recipes

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Submit generation (same as clicking button) |
| Click Button | Submit generation |
| Tab | Focus input field |

---

## Error Messages

| Message | Cause | Fix |
|---------|-------|-----|
| "Please enter what kind of meals..." | Empty input | Type in the input field |
| "No recipes available." | No recipes in database | Create recipes first |
| "Failed to generate plan." | Backend error | Refresh page, try again |

---

## Success Messages

```
"Generated 4 meals for 1 days. Skipped 0 slot(s)."
"Generated 28 meals for 7 days."
"Generated 0 meals for 7 days. Skipped 28 slot(s)."  ← All slots full
```

---

## Behind the Scenes Logic

1. **Parse Input** → Extract days, meals, keywords
2. **Fetch Recipes** → GET /recipes
3. **Filter & Sort** → Apply dietary, difficulty, cost/time filters
4. **Generate** → For each day/meal combo (if empty), assign random filtered recipe
5. **Post** → Send POST /meal-plan for each meal
6. **Reload** → Update grid with new meals
7. **Feedback** → Show success message with counts

---

## Performance Tips

- **Fastest generation**: Generate for specific days/meals (e.g., "breakfast for monday" = 1 API call per slot)
- **Slowest generation**: "generate all" (28 API calls)
- **System can handle**: 100+ recipes, instant filtering
- **Typical time**: 2-5 seconds for full week

---

## Common Workflows

### Workflow 1: Quick Meal Plan Assembly
```
1. "cheap breakfast" → All breakfasts generated
2. "quick lunch" → All lunches generated
3. "dinner for mon wed fri" → Selected dinners generated
4. Manual add: Tuesday/Thursday/Saturday dinners
```

### Workflow 2: Themed Week
```
1. "vegan meals for the week"
2. "expensive hard recipes for saturday sunday"
3. Manual tweaks as needed
```

### Workflow 3: Constraint-Based
```
1. "budget meals" (cheap filter, all week)
2. Review, delete as needed
3. "quick breakfast for remaining empty slots"
```

---

## What Gets Stored

✅ Saved to Database:
- User ID
- Recipe ID
- Day (Monday-Sunday)
- Meal Type (breakfast/lunch/dinner/snack)
- Week ID (ISO week format: 2026-W14)
- Servings (default: 1)
- Timestamps

❌ NOT Saved:
- Original user input text
- Parsed filters/keywords
- Generation history

---

## Integration Points

**API Endpoints Used:**
```
GET  /recipes              ← Fetch recipe list
POST /meal-plan            ← Create meal assignments
GET  /meal-plan            ← Reload updated meals
```

**Future Claude Integration:**
```
POST /ai/generate-meals    ← AI-powered suggestions
```

---

## Tips & Tricks

💡 **Tip 1:** Use quotes for clarity
```
Good: "quick vegan breakfast for monday"
Also ok: quick vegan breakfast for monday
```

💡 **Tip 2:** Combine filters smartly
```
"cheap vegan breakfast"  ← Price + dietary + meal type
"quick easy lunch"       ← Lots of similar keywords = refinement
```

💡 **Tip 3:** Generate in stages
```
Mon-Wed: "quick meals"
Thu-Fri: "easy cheap meals"
Weekend: "restaurant-fancy hard recipes"
```

💡 **Tip 4:** Check what you have
```
Can't remember what you created?
Default to "cheap" or "quick" - it will use best matches
```

---

## Troubleshooting Checklist

- [ ] At least 5 recipes created in database?
- [ ] Input field visible on meal planner page?
- [ ] No console errors (F12 → Console)?
- [ ] Backend server running?
- [ ] Logged in as valid user?
- [ ] Network tab shows POST requests succeeding?

---

**Keep this handy while testing!**  
Bookmark: [MEAL_GENERATION_GUIDE.md](MEAL_GENERATION_GUIDE.md) for more details
