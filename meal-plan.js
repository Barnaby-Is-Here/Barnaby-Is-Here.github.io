import { getSupabaseClient } from './data/supabase-client.js';

const mealPlanRows = document.getElementById('meal-plan-rows');
const mealPlanStatus = document.getElementById('meal-plan-status');
const mealPlanAuthNote = document.getElementById('meal-plan-auth-note');
const addRandomButton = document.getElementById('meal-plan-add-random');

let currentUser = null;
let recipeRows = [];
let planRows = [];
let isLoading = false;
let draggedPlanRowId = null;

function setStatus(message = '') {
  mealPlanStatus.textContent = message;
}

function syncMealPlanInteractionState() {
  const disableRecipeSelects = isLoading || recipeRows.length === 0;

  for (const recipeSelect of mealPlanRows.querySelectorAll('.meal-plan-recipe-select')) {
    recipeSelect.disabled = disableRecipeSelects;
  }

  for (const dragHandle of mealPlanRows.querySelectorAll('.meal-plan-drag-handle')) {
    dragHandle.draggable = !isLoading;
  }
}

function setBusy(nextBusy, message = '') {
  isLoading = nextBusy;
  addRandomButton.disabled = nextBusy || !currentUser || recipeRows.length === 0;
  if (message) {
    setStatus(message);
  }

  syncMealPlanInteractionState();
}

function getOrdinalSuffix(dayNumber) {
  const mod100 = dayNumber % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }

  switch (dayNumber % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatMealDate(dateString) {
  if (!dateString) {
    return 'Unknown date';
  }

  const date = parseLocalDate(dateString);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date);
  const dayOfMonth = date.getDate();
  return `${weekday} ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
}

function formatStateLabel(state) {
  if (!state) {
    return 'Unknown';
  }

  return state.charAt(0).toUpperCase() + state.slice(1);
}

function renderEmptyState(message) {
  mealPlanRows.innerHTML = '';
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.className = 'meal-plan-empty';
  cell.textContent = message;
  row.appendChild(cell);
  mealPlanRows.appendChild(row);
}

function renderPlanRows() {
  if (!currentUser) {
    renderEmptyState('Sign in to see your household meal plan.');
    return;
  }

  if (planRows.length === 0) {
    renderEmptyState('No planned meals yet. Use the button below to add one for tomorrow.');
    return;
  }

  const recipeById = new Map(recipeRows.map((recipe) => [recipe.id, recipe]));
  mealPlanRows.innerHTML = '';

  for (const planRow of planRows) {
    const row = document.createElement('tr');
    row.className = 'meal-plan-row';
    row.dataset.planRowId = String(planRow.id);
    const recipe = recipeById.get(planRow.recipe_id);

    const dateCell = document.createElement('td');
    dateCell.className = 'meal-plan-drag-handle';
    dateCell.draggable = true;
    dateCell.dataset.planRowId = String(planRow.id);
    dateCell.textContent = formatMealDate(planRow.meal_date);

    const recipeCell = document.createElement('td');
    const recipeSelect = document.createElement('select');
    recipeSelect.className = 'meal-plan-recipe-select';

    for (const recipeOption of recipeRows) {
      const option = document.createElement('option');
      option.value = String(recipeOption.id);
      option.textContent = recipeOption.name;
      option.selected = recipeOption.id === planRow.recipe_id;
      recipeSelect.appendChild(option);
    }

    if (!recipe && planRow.recipe_id) {
      const missingOption = document.createElement('option');
      missingOption.value = String(planRow.recipe_id);
      missingOption.textContent = `Recipe #${planRow.recipe_id}`;
      missingOption.selected = true;
      recipeSelect.appendChild(missingOption);
    }

    recipeSelect.addEventListener('change', () => {
      const nextRecipeId = Number(recipeSelect.value);
      if (Number.isNaN(nextRecipeId) || nextRecipeId === planRow.recipe_id) {
        return;
      }

      void updatePlanRecipe(planRow.id, nextRecipeId);
    });

    recipeCell.appendChild(recipeSelect);

    const stateCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `meal-plan-state state-${planRow.status ?? 'unknown'}`;
    badge.textContent = formatStateLabel(planRow.status);
    stateCell.appendChild(badge);

    row.append(dateCell, recipeCell, stateCell);
    dateCell.addEventListener('dragstart', handleDragStart);
    dateCell.addEventListener('dragend', handleDragEnd);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    mealPlanRows.appendChild(row);
  }

  syncMealPlanInteractionState();
}

async function updatePlanRecipe(planRowId, nextRecipeId) {
  if (isLoading) {
    return;
  }

  const nextRecipe = recipeRows.find((recipe) => recipe.id === nextRecipeId);
  setBusy(true, `Updating meal to ${nextRecipe?.name ?? 'selected recipe'}...`);

  try {
    const { error } = await getSupabaseClient()
      .from('meal_entries')
      .update({ recipe_id: nextRecipeId })
      .eq('id', planRowId);

    if (error) {
      throw new Error(`Could not update meal recipe: ${error.message}`);
    }

    await loadPlan();
    renderPlanRows();
    setStatus(`Updated meal to ${nextRecipe?.name ?? `Recipe #${nextRecipeId}`}.`);
  } catch (error) {
    setStatus(error.message);
    await loadPlan();
    renderPlanRows();
  } finally {
    setBusy(false);
  }
}

function handleDragStart(event) {
  const dragHandle = event.currentTarget;
  const draggedRow = dragHandle.closest('.meal-plan-row');
  draggedPlanRowId = Number(dragHandle.dataset.planRowId);
  draggedRow?.classList.add('is-dragging');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(draggedPlanRowId));
  }
}

function handleDragEnd(event) {
  draggedPlanRowId = null;
  event.currentTarget.closest('.meal-plan-row')?.classList.remove('is-dragging');
  for (const row of mealPlanRows.querySelectorAll('.meal-plan-row')) {
    row.classList.remove('is-drop-target');
  }
}

function handleDragOver(event) {
  if (draggedPlanRowId === null || isLoading) {
    return;
  }

  event.preventDefault();
  for (const row of mealPlanRows.querySelectorAll('.meal-plan-row')) {
    row.classList.remove('is-drop-target');
  }
  event.currentTarget.classList.add('is-drop-target');

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function getDropIndex(targetRow, clientY) {
  const allRows = Array.from(mealPlanRows.querySelectorAll('.meal-plan-row'));
  const targetIndex = allRows.indexOf(targetRow);
  const targetRect = targetRow.getBoundingClientRect();
  const shouldInsertAfter = clientY > targetRect.top + (targetRect.height / 2);

  return shouldInsertAfter ? targetIndex + 1 : targetIndex;
}

function buildReorderedPlanRows(dropIndex, targetPlanRowId) {
  if (draggedPlanRowId === null || draggedPlanRowId === targetPlanRowId) {
    return null;
  }

  const draggedIndex = planRows.findIndex((row) => row.id === draggedPlanRowId);
  if (draggedIndex === -1) {
    return null;
  }

  const reorderedRows = [...planRows];
  const [draggedRow] = reorderedRows.splice(draggedIndex, 1);
  const boundedDropIndex = Math.max(0, Math.min(dropIndex, reorderedRows.length + 1));
  const adjustedDropIndex = draggedIndex < boundedDropIndex
    ? boundedDropIndex - 1
    : boundedDropIndex;

  reorderedRows.splice(adjustedDropIndex, 0, draggedRow);
  return reorderedRows;
}

async function persistPlanRowOrder(reorderedRows) {
  const orderedDates = [...planRows]
    .map((row) => row.meal_date)
    .filter(Boolean)
    .sort();

  const updates = reorderedRows.map((row, index) => ({
    id: row.id,
    meal_date: orderedDates[index] ?? row.meal_date
  }));

  for (const update of updates) {
    const { error } = await getSupabaseClient()
      .from('meal_entries')
      .update({ meal_date: update.meal_date })
      .eq('id', update.id);

    if (error) {
      throw new Error(`Could not reorder meal plan: ${error.message}`);
    }
  }
}

async function handleDrop(event) {
  if (draggedPlanRowId === null || isLoading) {
    return;
  }

  event.preventDefault();
  const targetRow = event.currentTarget;
  const targetPlanRowId = Number(targetRow.dataset.planRowId);
  const dropIndex = getDropIndex(targetRow, event.clientY);
  const reorderedRows = buildReorderedPlanRows(dropIndex, targetPlanRowId);

  for (const row of mealPlanRows.querySelectorAll('.meal-plan-row')) {
    row.classList.remove('is-drop-target');
  }

  if (!reorderedRows) {
    return;
  }

  setBusy(true, 'Updating meal order...');

  try {
    await persistPlanRowOrder(reorderedRows);
    await loadPlan();
    renderPlanRows();
    setStatus('Meal plan order updated.');
  } catch (error) {
    setStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function loadRecipes() {
  const { data, error } = await getSupabaseClient()
    .from('recipes')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Could not load recipes: ${error.message}`);
  }

  recipeRows = Array.isArray(data) ? data : [];
}

async function loadPlan() {
  const { data, error } = await getSupabaseClient()
    .from('plan')
    .select('id, recipe_id, meal_date, status, created_by_user_id, household_id')
    .order('meal_date', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Could not load meal plan: ${error.message}`);
  }

  planRows = Array.isArray(data) ? data : [];
}

async function loadPlanPage() {
  if (!currentUser) {
    recipeRows = [];
    planRows = [];
    renderPlanRows();
    mealPlanAuthNote.hidden = false;
    setStatus('');
    setBusy(false);
    return;
  }

  mealPlanAuthNote.hidden = true;
  setBusy(true, 'Loading your meal plan...');

  try {
    await Promise.all([loadRecipes(), loadPlan()]);
    renderPlanRows();
    setStatus(planRows.length > 0 ? '' : 'Ready to add your first planned meal.');
  } catch (error) {
    renderEmptyState(error.message);
    setStatus(error.message);
  } finally {
    setBusy(false);
  }
}

function getTomorrowDateString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextMealDateString() {
  if (planRows.length === 0) {
    return getTomorrowDateString();
  }

  const latestMealDate = planRows.reduce((latest, planRow) => {
    if (!planRow.meal_date) {
      return latest;
    }

    if (!latest || planRow.meal_date > latest) {
      return planRow.meal_date;
    }

    return latest;
  }, '');

  if (!latestMealDate) {
    return getTomorrowDateString();
  }

  const nextDate = parseLocalDate(latestMealDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRandomRecipe() {
  if (recipeRows.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * recipeRows.length);
  return recipeRows[randomIndex];
}

async function addRandomMealForTomorrow() {
  if (!currentUser || isLoading) {
    return;
  }

  const randomRecipe = getRandomRecipe();
  if (!randomRecipe) {
    setStatus('No recipes are available to add yet.');
    return;
  }

  const nextMealDate = getNextMealDateString();
  setBusy(true, `Adding ${randomRecipe.name} to the plan...`);

  try {
    const { error } = await getSupabaseClient()
      .from('meal_entries')
      .insert({
        recipe_id: randomRecipe.id,
        meal_date: nextMealDate,
        status: 'planned'
      });

    if (error) {
      throw new Error(`Could not add meal: ${error.message}`);
    }

    await loadPlan();
    renderPlanRows();
    setStatus(`Added ${randomRecipe.name} for ${formatMealDate(nextMealDate)}.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    setBusy(false);
  }
}

function handleRecipeAuthStateChanged(event) {
  currentUser = event.detail?.user ?? null;
  void loadPlanPage();
}

addRandomButton.addEventListener('click', () => {
  void addRandomMealForTomorrow();
});

window.addEventListener('recipe-auth-state-changed', handleRecipeAuthStateChanged);

renderEmptyState('Sign in to see your household meal plan.');
setBusy(true, 'Waiting for sign-in state...');
