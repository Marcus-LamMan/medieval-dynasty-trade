import { escapeHtml } from '../utils/helpers.js';

let currentRecipes = [];
let currentItems = [];
let currentFilter = '';

export function renderRecipes(recipes, items, filterValue = '') {
    currentRecipes = recipes;
    currentItems = items;
    currentFilter = filterValue.toLowerCase();
    const tbody = document.getElementById('recipeTableBody');
    const countSpan = document.getElementById('recipeCount');

    let filtered = currentFilter ? recipes.filter(r => {
        const found = items.find(it => it.name.trim().toLowerCase() === r.product_name?.toLowerCase());
        return found && found.category && found.category.toLowerCase() === currentFilter;
    }) : recipes;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">暂无匹配配方</td></tr>`;
        countSpan.textContent = recipes.length;
        return;
    }

    let html = '';
    for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i];
        // 应用筛选（成品分类）
        if (currentFilter) {
            const found = items.find(it => it.name.trim().toLowerCase() === r.product_name?.toLowerCase());
            if (!found || !found.category || found.category.toLowerCase() !== currentFilter) continue;
        }
        // 使用后端返回的材料和利润
        const ingList = r.materials || [];
        const total = r.total_cost || 0;
        const profit = r.profit || 0;
        const profitStr = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
        const badgeClass = profit >= 0 ? 'badge-profit' : 'badge-loss';

        let ingDisplay = '';
        if (ingList.length === 0) {
            ingDisplay = '<span class="text-muted">(无材料)</span>';
        } else {
            ingDisplay = ingList.map(mat => {
                const name = escapeHtml(mat.material_name);
                const qty = mat.quantity;
                return `<span class="ingredient-click" data-ingredient="${escapeHtml(mat.material_name)}">${name} ×${qty}</span>`;
            }).join(' ');
        }

        html += `<tr>
            <td class="item-name">${escapeHtml(r.product_name || '未知成品')}</td>
            <td class="recipe-ingredients">${ingDisplay}</td>
            <td>${total.toFixed(2)}</td>
            <td>${Number(r.product_price || 0).toFixed(2)}</td>
            <td><span class="${badgeClass}">${profitStr}</span></td>
            <td style="text-align:right">
                <button class="btn btn-sm btn-danger delete-recipe" data-id="${r.id}">✕</button>
            </td>
        </tr>`;
    }
    tbody.innerHTML = html;
    countSpan.textContent = recipes.length;

    // 删除事件
    tbody.querySelectorAll('.delete-recipe').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            if (!isNaN(id) && confirm('确定要删除此配方吗？')) {
                if (window.onDeleteRecipe) window.onDeleteRecipe(id);
            }
        });
    });

    // 材料点击 -> 弹窗
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
    document.getElementById('modalPrice').textContent = found.base_price?.toFixed(2) || '0.00';
    document.getElementById('itemModal').classList.add('active');
}

export function setupRecipeHandlers(onAddRecipe, onDeleteRecipe) {
    window.onDeleteRecipe = onDeleteRecipe;

    const addBtn = document.getElementById('addRecipeBtn');
    const productInput = document.getElementById('productNameInput');
    const ingredientInput = document.getElementById('ingredientInput');
    const sellPriceInput = document.getElementById('sellPriceInput');

    async function handleAdd() {
        const productName = productInput.value.trim();
        const ingredientsString = ingredientInput.value.trim();
        const sellPrice = parseFloat(sellPriceInput.value);
        if (!productName) { alert('请输入成品名称'); return; }
        if (!ingredientsString) { alert('请输入材料清单'); return; }
        if (isNaN(sellPrice) || sellPrice < 0) { alert('请输入有效售价'); return; }

        const buildingName = prompt('请输入生产建筑名称（例如：铁匠铺）', '铁匠铺');
        if (!buildingName) return;

        try {
            await onAddRecipe({
                productName,
                buildingName,
                ingredientsString,
                sellPrice,
                craft_time_seconds: 10,
                unlock_tech: ''
            });
            productInput.value = '';
            ingredientInput.value = '';
            sellPriceInput.value = '';
            productInput.focus();
        } catch (err) {
            alert(err.message);
        }
    }

    addBtn.addEventListener('click', handleAdd);
    [productInput, ingredientInput, sellPriceInput].forEach(inp => {
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });
    });
}

export function setupClearRecipes(onClearRecipes) {
    document.getElementById('clearRecipesBtn').addEventListener('click', function() {
        if (confirm('确定要清空所有配方吗？此操作不可撤销！')) {
            onClearRecipes();
        }
    });
}