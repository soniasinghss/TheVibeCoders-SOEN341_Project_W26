# Testing the Smart Meal Generation Feature

## Setup

### Prerequisites
1. Backend running (`npm run dev` from backend folder)
2. Frontend served
3. Logged in to the application
4. At least 10+ recipes with different properties created

### Recipe Setup (Recommended for Testing)
Before testing, create recipes with these properties:

**Recipe 1 (Quick & Cheap):**
- Name: "Simple Pasta"
- Prep Time: 15 min
- Cost: $2.50
- Dietary Tags: []
- Difficulty: easy

**Recipe 2 (Vegan):**
- Name: "Veggie Stir Fry"
- Prep Time: 20 min
- Cost: $4.00
- Dietary Tags: ["vegan"]
- Difficulty: easy

**Recipe 3 (Vegan, Quick):**
- Name: "Chickpea Salad"
- Prep Time: 10 min
- Cost: $3.50
- Dietary Tags: ["vegan"]
- Difficulty: easy

**Recipe 4 (Expensive, Hard):**
- Name: "Beef Wellington"
- Prep Time: 120 min
- Cost: $15.00
- Dietary Tags: []
- Difficulty: hard

**Recipe 5 (Vegetarian):**
- Name: "Cheese Omelette"
- Prep Time: 10 min
- Cost: $2.00
- Dietary Tags: ["vegetarian"]
- Difficulty: easy

---

## Test Cases

### Test 1: Basic Generation (No Filters)
**Input:** `"generate meals for the week"`

**Expected:**
- ✅ Input field clears
- ✅ Message shows: "Generated X meals for 7 days."
- ✅ All breakfast, lunch, dinner, snack slots for all days filled
- ✅ Grid updates with random recipes

---

### Test 2: Specific Days
**Input:** `"meals for monday wednesday friday"`

**Expected:**
- ✅ Only Monday, Wednesday, Friday rows contain new meals
- ✅ Tuesday, Thursday, Saturday, Sunday unchanged
- ✅ Message shows different number than 28 (7×4)
- ✅ Should show "Generated 12 meals for 3 days." (3×4 meal types)

---

### Test 3: Specific Meal Types
**Input:** `"breakfast and lunch"`

**Expected:**
- ✅ Only breakfast and lunch rows have meals
- ✅ Dinner and snack rows unchanged
- ✅ All 7 days get breakfast and lunch
- ✅ Message: "Generated 14 meals for 7 days." (7×2)

---

### Test 4: Cheap Meals
**Input:** `"cheap meals for the week"`

**Expected:**
- ✅ Recipes selected should be sorted by lowest cost
- ✅ Simple Pasta, Cheese Omelette, Chickpea Salad more likely than Beef Wellington
- ✅ Check price in recipe details if available

---

### Test 5: Quick Meals
**Input:** `"quick dinner"`

**Expected:**
- ✅ Only dinner meals generated
- ✅ All 7 days get a dinner
- ✅ Should prioritize low prepTime recipes
- ✅ Simple Pasta (15 min), Veggie Stir Fry (20 min) more likely than Beef Wellington (120 min)

---

### Test 6: Vegan Filtering
**Input:** `"vegan meals"`

**Expected:**
- ✅ Only recipes with "vegan" dietary tag
- ✅ Veggie Stir Fry and Chickpea Salad should appear
- ✅ Simple Pasta, Cheese Omelette, Beef Wellington should NOT appear
- ✅ All days/meals filled with vegan options only

---

### Test 7: Specific Day + Meal Type + Filter
**Input:** `"quick vegan breakfast for monday tuesday wednesday"`

**Expected:**
- ✅ Only Mon/Tue/Wed breakfast slots filled
- ✅ Only vegan recipes used
- ✅ Should use Veggie Stir Fry or Chickpea Salad (quick + vegan)
- ✅ Message: "Generated 3 meals for 3 days."

---

### Test 8: Skipping Existing Meals
**Steps:**
1. Generate: `"breakfast for all days"`
   - All 7 breakfasts filled
2. Generate: `"meals for tuesday"`
   - Tuesday breakfast already filled
   - Should skip breakfast, fill lunch/dinner/snack only

**Expected:**
- ✅ Message: "Generated X meals for 1 days. Skipped 1 slot(s)."
- ✅ Tuesday breakfast unchanged
- ✅ Tuesday lunch/dinner/snack filled

---

### Test 9: Empty Input
**Input:** `` (empty)

**Expected:**
- ❌ Toast error: "Please enter what kind of meals you'd like to generate."
- ❌ Error message appears in red
- ❌ Nothing generated
- ❌ Button re-enabled

---

### Test 10: Enter Key
**Steps:**
1. Type: `"quick breakfast"`
2. Press Enter (not clicking button)

**Expected:**
- ✅ Same as clicking the button
- ✅ Meals generated without pressing button

---

## Visual Checks

### Grid Updates
- [ ] New meals appear as green chip components
- [ ] Chip shows recipe name and servings
- [ ] Edit button works on new recipes
- [ ] Delete button works on new recipes

### Messages
- [ ] Success message appears in green
- [ ] Error message appears in red
- [ ] Toast notifications appear at bottom
- [ ] Messages clear before next generation

### Input Field
- [ ] Placeholder text visible
- [ ] Focus styling works (blue border when clicked)
- [ ] Disabled state while generating
- [ ] Clears after successful generation

---

## Browser Console Checks

Open DevTools (F12) → Console:

### Expected Logs
```javascript
// No errors should appear
// Successful POST calls to /meal-plan
// Feed should show generation progress
```

### Check Network Tab
1. Open Network tab
2. Generate meals with input: `"quick vegan breakfast"`
3. **Expected requests:**
   - `GET /recipes` (fetch available recipes)
   - Multiple `POST /meal-plan` (one per meal generated)
   - `GET /meal-plan?userId=...&weekId=...` (reload data)

---

## Edge Cases

### Edge Case 1: No Recipes Match Filter
**Input:** `"gluten-free halal"`

Expected Behavior:
- ✅ If no recipes have both tags, should use all recipes as fallback
- ✅ Meals still generated (don't leave slots empty)

### Edge Case 2: All Slots Already Filled
**Input:** `"breakfast"` (when all breakfasts are full)

Expected:
- ✅ Message: "Generated 0 meals for 7 days. Skipped 7 slot(s)."
- ✅ No changes to grid
- ✅ No POST requests sent

### Edge Case 3: Typos/Variations
**Input:** `"qick vegan brekfast"`

Expected:
- ⚠️ Keywords not recognized
- ✅ Falls back to random selection
- ✅ Meals still generated (just not filtered)

### Edge Case 4: Case Sensitivity
**Input:** `"QUICK VEGAN BREAKFAST"`

Expected:
- ✅ All uppercase works
- ✅ MiXeD case works
- ✅ All converted to lowercase internally

---

## Performance Checks

### Generation Speed
- [ ] Generating 28 meals (full week) takes < 5 seconds
- [ ] Button re-enables after completion
- [ ] No freezing or lag during generation

### Large Recipe Database
- [ ] Test with 100+ recipes
- [ ] Should still filter and select quickly
- [ ] No crashes or errors

---

## Backend Verification

### Check Meal Plan Data
```bash
# MongoDB shell
db.mealplans.find({ "userId": "YOUR_USER_ID" }).pretty()
```

Expected:
- Multiple entries with same userId
- Different days/mealTypes
- Correct weekId
- All recipeIds valid (reference existing recipes)

### Check POST Response
In Network tab, click on POST request:
```json
{
  "success": true,
  "message": "Meal plan entry created",
  "data": {
    "_id": "...",
    "userId": "...",
    "recipeId": "...",
    "day": "Monday",
    "mealType": "breakfast",
    "weekId": "2026-W14",
    "servings": 1
  }
}
```

---

## Debugging Tips

### If Generation Doesn't Work:
1. **Check input field exists:**
   ```javascript
   console.log(document.getElementById("generateInput")); // Should not be null
   ```

2. **Check button listener:**
   ```javascript
   // Click button, should see in console
   // See if parseGenerationInput() is called
   ```

3. **Check API response:**
   - Network tab → GET /recipes
   - Should return array of recipes
   - Verify each recipe has: `_id`, `name`, `cost`, `prepTime`, `dietaryTags`, `difficulty`

4. **Check mealPlanData update:**
   ```javascript
   console.log(mealPlanData);
   // Should show entries like "Monday|breakfast": { ... }
   ```

---

## Success Criteria

✅ **All tests pass** when:
1. Input field accepts user text
2. Button triggers generation with parsing
3. Days are correctly detected
4. Meal types are correctly detected
5. Keywords filter recipes properly
6. Existing meals are skipped
7. Grid updates with new meals
8. Success/error messages display
9. Enter key works
10. Backend receives POST requests
11. Meal plan reloads after generation

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Input field doesn't appear | HTML not updated | Verify mealPlan.html has generate-section div |
| Button doesn't work | Missing event listener | Check mealPlan.js line 575+ |
| Recipes not filtered | Filter logic broken | Check parseGenerationInput() function |
| No POST requests sent | API not called | Check console for errors |
| Meals don't appear | Grid not updating | Check loadMealPlan() after generation |
| Always generates all slots | Skipping logic broken | Check mealPlanData check logic |

---

**Last Updated**: April 2026
