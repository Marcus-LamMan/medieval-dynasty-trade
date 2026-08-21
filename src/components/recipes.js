import { escapeHtml } from '../utils/helpers.js';

let currentRecipes = [];
let currentItems = [];
let currentFilter = '';
let currentCoefficient = 1.0;

export function renderRecipes(recipes, items, filterValue = '') {
    currentRecipes = recipes;
    currentItems = items;
    currentFilter = filterValue.toLowerCase();
    const tbody = document.getElementById('recipeTableBody');
    const countSpan = document.getElementById('recipeCount');

    const coeffSelect = document.getElementById('skillLevelSelect');
    if (coeffSelect) {
        currentCoefficient = parseFloat(coeffSelect.value) || 1.0;
    }

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
        if (currentFilter) {
            const found = items.find(it => it.name.trim().toLowerCase() === r.product_name?.toLowerCase());
            if (!found || !found.category || found.category.toLowerCase() !== currentFilter) continue;
        }
        const materials = r.materials || [];
        const total = r.total_cost || 0;
        const basePrice = r.product_price || 0;
        const finalPrice = basePrice * currentCoefficient;
        const profit = finalPrice - total;
        const profitStr = profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
        const badgeClass = profit >= 0 ? 'badge-profit' : 'badge-loss';

        // 生成材料显示文本
        let ingredientsDisplay = '';
        if (materials.length === 0) {
            ingredientsDisplay = '(无材料)';
        } else {
            ingredientsDisplay = materials.map(mat =>
                `${escapeHtml(mat.material_name)} ×${mat.quantity}`
            ).join(', ');
        }
        // 存储材料 JSON 用于点击弹窗
        const materialsJson = JSON.stringify(materials);

        html += `<tr>
            <td class="item-name">${escapeHtml(r.product_name || '未知成品')}</td>
            <td class="recipe-ingredients" style="cursor:pointer;" data-materials='${escapeHtml(materialsJson)}'>
                ${escapeHtml(ingredientsDisplay)}
            </td>
            <td>${total.toFixed(2)}</td>
            <td>${finalPrice.toFixed(2)}</td>
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

    // 点击材料列显示详情
    tbody.querySelectorAll('.recipe-ingredients').forEach(cell => {
        cell.addEventListener('click', function() {
            const materialsJson = this.getAttribute('data-materials');
            if (materialsJson) {
                try {
                    const materials = JSON.parse(materialsJson);
                    showMaterialsDetail(materials);
                } catch (e) {
                    alert('材料数据解析失败');
                }
            }
        });
    });
}

function showMaterialsDetail(materials) {
    if (!materials || materials.length === 0) {
        alert('该配方没有材料');
        return;
    }
    let msg = '材料列表：\n';
    for (const mat of materials) {
        const price = mat.material_price !== undefined ? mat.material_price : '未知';
        msg += `${mat.material_name} ×${mat.quantity}  单价: ${price}\n`;
    }
    alert(msg);
}

// ---------- 添加配方 ----------
export function setupRecipeHandlers(onAddRecipe, onDeleteRecipe) {
    window.onDeleteRecipe = onDeleteRecipe;

    const addBtn = document.getElementById('addRecipeBtn');
    const productInput = document.getElementById('productNameInput');
    const ingredientInput = document.getElementById('ingredientInput');

    async function handleAdd() {
        const productName = productInput.value.trim();
        const ingredientsString = ingredientInput.value.trim();
        if (!productName) { alert('请输入成品名称'); return; }
        if (!ingredientsString) { alert('请输入材料清单'); return; }

        const buildingName = prompt('请输入生产建筑名称（例如：铁匠铺）', '铁匠铺');
        if (!buildingName) return;

        try {
            await onAddRecipe({
                productName,
                buildingName,
                ingredientsString,
                craft_time_seconds: 10,
                unlock_tech: ''
            });
            productInput.value = '';
            ingredientInput.value = '';
            productInput.focus();
        } catch (err) {
            alert(err.message);
        }
    }

    addBtn.addEventListener('click', handleAdd);
    [productInput, ingredientInput].forEach(inp => {
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });
    });
}

// ---------- 清空所有配方 ----------
export function setupClearRecipes(onClearRecipes) {
    document.getElementById('clearRecipesBtn').addEventListener('click', function() {
        if (confirm('确定要清空所有配方吗？此操作不可撤销！')) {
            onClearRecipes();
        }
    });
}