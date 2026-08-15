import { escapeHtml, parseIngredients, calculateCost, saveData } from '../utils/helpers.js';

let recipes = [];
let items = [];
let filter = '';

// 渲染配方
export function renderRecipes(recipesData, itemsData, filterValue = '') {
  recipes = recipesData;
  items = itemsData;
  filter = filterValue.toLowerCase();
  const tbody = document.getElementById('recipeTableBody');
  const countSpan = document.getElementById('recipeCount');

  let filtered = recipes;
  if (filter) {
    filtered = recipes.filter(r => {
      const found = items.find(it => it.name.trim().toLowerCase() === r.product.trim().toLowerCase());
      return found && found.category && found.category.toLowerCase() === filter;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">暂无匹配配方</td></tr>`;
    countSpan.textContent = recipes.length;
    return;
  }

  let html = '';
  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    if (filter) {
      const found = items.find(it => it.name.trim().toLowerCase() === r.product.trim().toLowerCase());
      if (!found || !found.category || found.category.toLowerCase() !== filter) continue;
    }
    const ingList = parseIngredients(r.ingredients);
    const { total, unknown } = calculateCost(ingList, items);
    const profit = r.sellPrice - total;
    const profitStr = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
    const badgeClass = profit >= 0 ? 'badge-profit' : 'badge-loss';
    const unknownStr = unknown.length > 0 ? ` ⚠️ 未知: ${unknown.join(', ')}` : '';

    let ingDisplay = '';
    if (ingList.length === 0) {
      ingDisplay = '<span class="text-muted">(未解析)</span>';
    } else {
      ingDisplay = ingList.map(ing => {
        const name = escapeHtml(ing.name);
        const qty = ing.qty;
        return `<span class="ingredient-click" data-ingredient="${escapeHtml(ing.name)}">${name} ×${qty}</span>`;
      }).join(' ');
    }

    html += `<tr>
      <td class="item-name">${escapeHtml(r.product)}</td>
      <td class="recipe-ingredients">${ingDisplay}</td>
      <td>${total.toFixed(2)}${unknownStr}</td>
      <td>${Number(r.sellPrice).toFixed(2)}</td>
      <td><span class="${badgeClass}">${profitStr}</span></td>
      <td style="text-align:right">
        <button class="btn btn-sm btn-danger" data-recipe-index="${i}">✕</button>
      </td>
    </tr>`;
  }
  tbody.innerHTML = html;
  countSpan.textContent = recipes.length;

  // 删除
  tbody.querySelectorAll('[data-recipe-index]').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-recipe-index'), 10);
      if (!isNaN(idx) && idx >= 0 && idx < recipes.length) {
        recipes.splice(idx, 1);
        saveData('md_recipes_v2', recipes);
        if (window.refreshAll) window.refreshAll();
      }
    });
  });

  // 材料点击 -> 显示弹窗
  tbody.querySelectorAll('.ingredient-click').forEach(el => {
    el.addEventListener('click', function() {
      const ingName = this.getAttribute('data-ingredient');
      if (ingName) {
        showItemDetail(ingName, items);
      }
    });
  });
}

function showItemDetail(name, items) {
  const found = items.find(it => it.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!found) {
    alert(`未找到物品 "${name}"，请先在物品库中添加。`);
    return;
  }
  document.getElementById('modalName').textContent = found.name;
  document.getElementById('modalCategory').textContent = found.category || '未分类';
  document.getElementById('modalPrice').textContent = found.price.toFixed(2);
  document.getElementById('itemModal').classList.add('active');
}

// 添加配方
export function setupRecipeHandlers(getRecipes, setRecipes, getItems, refreshCallback) {
  const addBtn = document.getElementById('addRecipeBtn');
  const productInput = document.getElementById('productNameInput');
  const ingredientInput = document.getElementById('ingredientInput');
  const sellPriceInput = document.getElementById('sellPriceInput');

  function addRecipe() {
    const product = productInput.value.trim();
    const ingredients = ingredientInput.value.trim();
    const sellPrice = parseFloat(sellPriceInput.value);
    if (!product) { alert('请输入成品名称'); return; }
    if (!ingredients) { alert('请输入材料清单'); return; }
    if (isNaN(sellPrice) || sellPrice < 0) { alert('请输入有效售价'); return; }
    const current = getRecipes();
    const existed = current.some(r => r.product.trim().toLowerCase() === product.toLowerCase());
    if (existed) {
      alert(`配方 "${product}" 已存在`);
      return;
    }
    current.push({ product, ingredients, sellPrice });
    setRecipes(current);
    saveData('md_recipes_v2', current);
    productInput.value = '';
    ingredientInput.value = '';
    sellPriceInput.value = '';
    productInput.focus();
    refreshCallback();
  }

  addBtn.addEventListener('click', addRecipe);
  [productInput, ingredientInput, sellPriceInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addRecipe(); });
  });
}

// 清空
export function setupClearRecipes(getRecipes, setRecipes, refreshCallback) {
  document.getElementById('clearRecipesBtn').addEventListener('click', function() {
    if (getRecipes().length === 0) return;
    if (confirm('确定清空所有配方吗？')) {
      setRecipes([]);
      saveData('md_recipes_v2', []);
      refreshCallback();
    }
  });
}