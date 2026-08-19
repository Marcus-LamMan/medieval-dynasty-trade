import './styles/style.css';
import { fetchItems, fetchRecipes, addItem, deleteItem, addRecipe, deleteRecipe } from './api.js';
import { renderItems, setupItemHandlers, setupClearItems } from './components/items.js';
import { renderRecipes, setupRecipeHandlers, setupClearRecipes } from './components/recipes.js';

let items = [];
let recipes = [];

async function loadAllData() {
    try {
        const [itemsData, recipesData] = await Promise.all([
            fetchItems(),
            fetchRecipes()
        ]);
        items = itemsData.map(it => ({ ...it, category: it.category || '' }));
        recipes = recipesData;
        refreshAll();
    } catch (err) {
        console.error('加载数据失败:', err);
        alert('无法连接后端服务，请确保 server 已启动');
    }
}

function refreshAll() {
    updateCategoryFilters();
    const itemFilter = document.getElementById('itemCategoryFilter').value;
    const recipeFilter = document.getElementById('recipeCategoryFilter').value;
    renderItems(items, itemFilter);
    renderRecipes(recipes, items, recipeFilter);
}
window.refreshAll = refreshAll;

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

document.getElementById('itemCategoryFilter').addEventListener('change', refreshAll);
document.getElementById('recipeCategoryFilter').addEventListener('change', refreshAll);

const modal = document.getElementById('itemModal');
document.getElementById('modalCloseBtn').addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('active'); });

async function handleAddItem(itemData) {
    await addItem(itemData);
    await loadAllData();
}
async function handleDeleteItem(id) {
    await deleteItem(id);
    await loadAllData();
}
async function handleAddRecipe(recipeData) {
    await addRecipe(recipeData);
    await loadAllData();
}
async function handleDeleteRecipe(id) {
    await deleteRecipe(id);
    await loadAllData();
}
async function handleClearItems() {
    for (const item of items) {
        try { await deleteItem(item.id); } catch (e) { console.warn(e); }
    }
    await loadAllData();
}
async function handleClearRecipes() {
    for (const recipe of recipes) {
        try { await deleteRecipe(recipe.id); } catch (e) { console.warn(e); }
    }
    await loadAllData();
}

setupItemHandlers(handleAddItem, handleDeleteItem);
setupClearItems(handleClearItems);
setupRecipeHandlers(handleAddRecipe, handleDeleteRecipe);
setupClearRecipes(handleClearRecipes);

loadAllData();
