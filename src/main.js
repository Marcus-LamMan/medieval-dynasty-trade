import './styles/style.css';
import { loadData, saveData } from './utils/helpers.js';
import { defaultItems, defaultRecipes } from './data/defaults.js';
import { renderItems, setupItemHandlers, setupClearItems } from './components/items.js';
import { renderRecipes, setupRecipeHandlers, setupClearRecipes } from './components/recipes.js';

// ----- 全局状态 -----
let items = loadData('md_items_v2', defaultItems);
let recipes = loadData('md_recipes_v2', defaultRecipes);

// 确保物品有category字段
items = items.map(it => {
  if (!it.category) it.category = '';
  return it;
});
// 去重
const seen = new Set();
items = items.filter(it => {
  const key = it.name.trim().toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
saveData('md_items_v2', items);

// ----- 刷新函数（供组件调用）-----
function refreshAll() {
  // 更新筛选下拉
  updateCategoryFilters();
  // 重新渲染
  const itemFilter = document.getElementById('itemCategoryFilter').value;
  const recipeFilter = document.getElementById('recipeCategoryFilter').value;
  renderItems(items, itemFilter);
  renderRecipes(recipes, items, recipeFilter);
}

// 挂载到全局以便组件内调用
window.refreshAll = refreshAll;

// ----- 更新分类筛选下拉 -----
function updateCategoryFilters() {
  const cats = new Set();
  items.forEach(it => { if (it.category) cats.add(it.category); });
  const sorted = Array.from(cats).sort();

  const itemSelect = document.getElementById('itemCategoryFilter');
  const currentItemVal = itemSelect.value;
  itemSelect.innerHTML = '<option value="">所有分类</option>';
  sorted.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    itemSelect.appendChild(opt);
  });
  if (currentItemVal && sorted.includes(currentItemVal)) {
    itemSelect.value = currentItemVal;
  } else {
    itemSelect.value = '';
  }

  const recipeSelect = document.getElementById('recipeCategoryFilter');
  const currentRecipeVal = recipeSelect.value;
  recipeSelect.innerHTML = '<option value="">所有分类</option>';
  sorted.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    recipeSelect.appendChild(opt);
  });
  if (currentRecipeVal && sorted.includes(currentRecipeVal)) {
    recipeSelect.value = currentRecipeVal;
  } else {
    recipeSelect.value = '';
  }
}

// ----- 绑定筛选事件 -----
document.getElementById('itemCategoryFilter').addEventListener('change', refreshAll);
document.getElementById('recipeCategoryFilter').addEventListener('change', refreshAll);

// ----- 弹窗关闭 -----
const modal = document.getElementById('itemModal');
document.getElementById('modalCloseBtn').addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('active'); });

// ----- 设置各组件的增删功能 -----
setupItemHandlers(
  () => items,
  (newItems) => { items = newItems; saveData('md_items_v2', items); },
  refreshAll
);
setupClearItems(
  () => items,
  (newItems) => { items = newItems; saveData('md_items_v2', items); },
  refreshAll
);

setupRecipeHandlers(
  () => recipes,
  (newRecipes) => { recipes = newRecipes; saveData('md_recipes_v2', recipes); },
  () => items,
  refreshAll
);
setupClearRecipes(
  () => recipes,
  (newRecipes) => { recipes = newRecipes; saveData('md_recipes_v2', recipes); },
  refreshAll
);

// ----- 首次渲染 -----
refreshAll();