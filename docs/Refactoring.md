# Refactoring Plan

## Goal

Split monolithic files into single-responsibility modules. No logic changes — pure structural refactoring.

## Current State

| File | Lines | Problem |
|---|---|---|
| `src/App.jsx` | ~710 | 5 components + CSS inline |
| `src/Admin.jsx` | ~1100 | 5 tabs + shared components + CSS inline |
| `src/lib/supabase.js` | ~430 | all domains in one file |

## Target Structure

### App

```
src/
  screens/
    TodayScreen.jsx       — tasks, progress ring, date switcher
    RecipesScreen.jsx     — recipe list + detail view
    LineupScreen.jsx      — crew grouped by station
  components/
    ReportModal.jsx       — end-of-shift report modal
    AddTaskModal.jsx      — add task modal
    CheckItem.jsx         — single task row
  App.jsx                 — tab routing + push subscribe only
  App.css                 — extracted from App.jsx CSS const
```

### Admin

```
src/
  admin/
    tabs/
      PeopleTab.jsx
      TasksTab.jsx
      RecipesTab.jsx
      ReportsTab.jsx
      PushTab.jsx
    components/
      Modal.jsx
      Badge.jsx
      Avatar.jsx
      PctBar.jsx
      ToastContainer.jsx
    Admin.jsx             — layout + tab routing only
    Admin.css             — extracted from Admin.jsx CSS const
```

### Supabase lib

```
src/lib/
  supabase.js     — client instance + q() helper only
  auth.js         — signIn, signOut, getCurrentProfile
  tasks.js        — getTasks, createTask, completeTask, uncompleteTask, commentTask, deleteTask, createTasksBatch
  recipes.js      — getRecipes, createRecipe, updateRecipe, deleteRecipe
  reports.js      — saveReport, sendReportEmail, getRestaurantReports, getMyReports
  push.js         — subscribePush, sendPushNotification
  templates.js    — getDayTemplates, getDefaultDayTemplate, createDayTemplate, updateDayTemplate, deleteDayTemplate
  invites.js      — createInvite, getInviteByToken, markInviteUsed
  profiles.js     — getRestaurantProfiles, adminUpdateProfile, getCurrentProfile
```

## Rules

- **No logic changes** — move code only, never rewrite
- **CSS extracted** to `.css` files, not inline JS strings
- **supabase.js public API preserved** — add re-exports so existing imports don't break during transition
- **E2E tests must pass** after each phase — run before merging

## Phases

### Phase 1 — supabase.js split ✅
Split into domain modules. Re-exports in `supabase.js` for backwards compat.

### Phase 2 — Admin.jsx split ✅
Shared components in `admin/components/`, tabs in `admin/tabs/`, CSS extracted. Admin.jsx = 65 lines.

### Phase 3 — App.jsx split ✅
Screens in `screens/`, components in `components/`, CSS extracted. App.jsx = 45 lines.

### Additional ✅
- `src/hooks/useAuth.js` — session/onboarding logic extracted from main.jsx
- `src/lib/constants.js` — STATIONS, SECTIONS, colors, role labels

## Related

- [[Architecture]]
