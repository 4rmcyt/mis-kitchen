// Re-exports from domain modules for backwards compatibility.
// Import directly from domain modules in new code.

export { supabase, getCurrentProfile } from './client.js';
export { signIn, signOut, getSession, onAuthChange, sendPasswordReset } from './auth.js';
export { getProfile, updateProfile, getRestaurantProfiles, adminUpdateProfile } from './profiles.js';
export { createLinkInvite, createEmailInvite, getInvites } from './invites.js';
export { getTemplates, createTemplate, updateTemplate, deleteTemplate } from './templates.js';
export { getRecipes, createRecipe, updateRecipe, deleteRecipe, getAllergens, setRecipeAllergens } from './recipes.js';
export {
  getDefaultDayTemplate, getDayTemplates, createDayTemplate,
  updateDayTemplate, deleteDayTemplate,
} from './templates.js';
export {
  getTasks, createTask, createTasksBatch, updateTask, deleteTask,
  completeTask, uncompleteTask, commentTask,
  getDeferredTasks, deferTask, markTaskCarried, deleteDeferred,
} from './tasks.js';
export { saveReport, getMyReports, getRestaurantReports, sendReportEmail, getShiftExperiment, setShiftExperiment, getStationVelocity } from './reports.js';
export { subscribePush, sendPushNotification, getPushSubscriptionCount } from './push.js';
export { getImprovementLogs, addImprovementLog, deleteImprovementLog } from './improvements.js';
export { getShifts, createShift, deleteShift, getTodayShifts } from './shifts.js';
export { getTempLogs, logTemperature } from './temp_logs.js';
export { getPrepItems, getPrepItemsMap } from './prep_items.js';
