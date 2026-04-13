# 🍽️ Smart Meal Generation Feature Guide

## Overview

The meal planner now includes an intelligent AI-powered meal generation system that understands natural language input and can generate customized meal plans based on your preferences.

## What's New

### Input-Based Generation
Instead of generating the same meals every time, you can now:
- **Specify days**: "Monday", "Tuesday", "generate monday tuesday wed"
- **Specify meal types**: "breakfast", "lunch", "dinner", "snack"
- **Use keywords**: "cheap", "quick", "vegan", "vegetarian", "gluten-free", "halal", "easy", "medium", "hard"
- **Combine them**: "quick vegan meals for monday and tuesday dinner"

### Smart Filtering
The system automatically:
1. ✅ Parses your input for mentioned days and meal types
2. ✅ Detects keywords for dietary restrictions and preferences
3. ✅ Filters recipes matching your criteria
4. ✅ Sorts by preference (cheapest first, quickest first, etc.)
5. ✅ Skips meals already planned
6. ✅ Assigns remaining slots
7. ✅ Provides feedback on how many meals were generated

## Usage Examples

### Example 1: Budget Meals
```
Input: "cheap meals for the whole week"
Result: 
- All 7 days × 4 meal types = 28 meals (if empty)
- Sorted by lowest cost
- Dietary filters: none (all recipes eligible)
```

### Example 2: Quick Weekday Dinners
```
Input: "quick dinner for monday tuesday wednesday thursday friday"
Result:
- 5 days × 1 meal type = 5 meals
- Sorted by quickest prep time
- Only dinner slots filled
```

### Example 3: Vegan Breakfast
```
Input: "vegan breakfast"
Result:
- All 7 days × 1 meal type = 7 meals (or however many are empty)
- Only vegan recipes (dietaryTags includes "vegan")
- Only breakfast slots
```

### Example 4: Easy Medium Recipes
```
Input: "easy and medium difficulty meals"
Result:
- All days/meals
- Recipes with difficulty: "easy" or "medium"
- Excludes "hard" difficulty recipes
```

### Example 5: Healthy Quick Foods
```
Input: "quick healthy meals"
Result:
- All slots
- Sorted by quickest prep time
- Recipes marked as healthy (if tagged)
```

## How to Use

### 1. Navigate to Meal Planner
- Go to the protected dashboard
- Click "Weekly Meal Planner"

### 2. Type Your Preference
In the text input field, describe what meals you want:
```
"quick vegan dinners for monday and tuesday"
```

### 3. Submit
Either:
- Click the **"Generate Meals"** button
- Press **Enter** on your keyboard

### 4. Review Results
- ✅ Success message shows how many meals were generated
- ❌ Skipped meals that already had recipes
- 📋 Grid updates with your new meal plan

## Supported Keywords

### Days
- monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Default: all 7 days (if none specified)

### Meal Types
- breakfast, lunch, dinner, snack
- Default: all 4 meal types (if none specified)

### Dietary Filters
| Keyword | Filter |
|---------|--------|
| vegan | Only recipes tagged "vegan" |
| vegetarian | Only recipes tagged "vegetarian" |
| gluten-free (or glutenfree) | Only recipes tagged "gluten-free" |
| halal | Only recipes tagged "halal" |

### Preference Filters
| Keyword | Effect |
|---------|--------|
| cheap, budget, affordable | Sort recipes by lowest cost ⭐ |
| quick, fast, easy prep | Sort recipes by shortest prepTime ⭐ |

### Difficulty Filters
| Keyword | Include |
|---------|---------|
| easy | Only easy recipes |
| medium | Only medium recipes |
| hard, challenging | Only hard recipes |

⭐ Sorting applies to filtered results only

## What Happens Behind the Scenes

1. **Input Parsing**
   - Convert to lowercase
   - Scan for day names → detected days
   - Scan for meal types → detected meals
   - Extract keywords → filter preferences

2. **Recipe Filtering**
   ```
   All Recipes (N)
   ├─ Apply dietary filters → R1
   ├─ Apply difficulty filters → R2
   ├─ Intersect → R_filtered
   └─ Sort by preference → R_sorted
   ```

3. **Meal Assignment**
   - For each day in detected_days:
     - For each meal in detected_meals:
       - If slot is empty:
         - Pick random from R_sorted
         - POST to /meal-plan
       - Else:
         - Skip (don't overwrite)

4. **Response**
   ```
   Generated 5 meals for 5 days.
   Skipped 3 slots (already filled).
   ```

## Backend API

### Endpoint: `POST /ai/generate-meals`
(Optional: for future Claude AI integration)

**Request:**
```json
{
  "userId": "user123",
  "prompt": "quick vegan breakfast for monday",
  "weekId": "2026-W14",
  "existingMeals": {
    "Monday|breakfast": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 4 meal suggestions.",
  "suggestions": [
    {
      "day": "Monday",
      "mealType": "lunch",
      "recipeId": "recipe456",
      "recipeName": "Tofu Stir Fry",
      "cost": 3.50,
      "prepTime": 20,
      "difficulty": "easy"
    }
  ]
}
```

## Settings You Control

### Days to Generate
- **If mentioned**: Only those days
- **If not mentioned**: All 7 days
- Example: Input "monday" → Only Monday meals generated

### Meal Types to Generate
- **If mentioned**: Only those meal types
- **If not mentioned**: All 4 meal types
- Example: Input "breakfast and dinner" → Only breakfast & dinner

### Skip Existing Meals
- **Always**: Already filled slots are never overwritten
- You can generate partial weeks multiple times

### Sorting Strategy
- **Cheap sort**: Lowest cost first (ascending)
- **Quick sort**: Shortest prep time first (ascending)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Please enter what kind of meals you'd like to generate." | Empty input | Type in the input field |
| "No recipes available." | Database empty | Create recipes first |
| "Failed to generate plan." | Backend error | Try again or check logs |

## Tips & Tricks

### Tip 1: Multi-word Filters
```
❌ Bad: "glutenfree vegan" (might not recognize)
✅ Good: "gluten-free vegan" (clear and spelled out)
```

### Tip 2: Generate in Stages
```
First:  "cheap meals for monday tuesday"
Then:   "quick breakfast for wednesday thursday"
Finally: "weekend vegan meals"
```

### Tip 3: Check Existing Meals
The system automatically skips filled slots, so:
```
Generate as many times as you want!
Only empty slots will be filled.
```

### Tip 4: Seasonal Keywords
```
Input: "light healthy breakfast for summer"
(System filters by prep time, cost, dietary tags)
```

## Future Enhancements

- 🤖 Claude AI integration for natural language understanding
- 📊 Nutritional variety tracking
- 🔄 Recipe difficulty progression (gradual difficulty increase)
- 👥 Family preference learning
- 📦 Recipe prep coordination
- 🎯 Customizable cost ranges
- 🌍 Cuisine-based generation ("italian", "asian", "mexican")

## FAQ

**Q: Will it overwrite my existing meals?**
A: No! The system checks each slot and only fills empty ones.

**Q: Can I generate the same week multiple times?**
A: Yes! Each run fills remaining empty slots.

**Q: What if no recipes match my filters?**
A: The system uses all recipes as fallback to ensure meals are generated.

**Q: Does case matter?**
A: No! Input is converted to lowercase for matching.

**Q: Can I clear and regenerate?**
A: Yes! Delete meals first, then generate with new input.

**Q: What happens if I don't specify days/meals?**
A: Both default to "all 7 days × all 4 meal types".

---

**Version**: 1.0 | **Last Updated**: April 2026
