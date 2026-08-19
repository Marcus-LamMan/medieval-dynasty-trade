import { escapeHtml } from '../utils/helpers.js';

let currentItems = [];
let currentFilter = '';

export function renderItems(items, filterValue = '') {
    currentItems = items;
    currentFilter = filterValue.toLowerCase();
    const tbody = document.getElementById('itemTableBody');
    const countSpan = document.getElementById('itemCount');

    const filtered = currentFilter ? items.filter(it => it.category && it.category.toLowerCase() === currentFilter) : items;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">暂无匹配物品</td></tr>`;
        countSpan.textContent = items.length;
        return;
    }

    let html = '';
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (currentFilter && (!it.category || it.category.toLowerCase() !== currentFilter)) continue;
        const cat = it.category || '未分类';
        html += `<tr>
            <td class="item-name">${escapeHtml(it.name)}</td>
            <td><span class="tag category-tag" data-category="${escapeHtml(cat)}" style="cursor:pointer;">${escapeHtml(cat)}</span></td>
            <td>${Number(it.base_price).toFixed(2)}</td>
            <td style="text-align:right">
                <button class="btn btn-sm btn-danger delete-item" data-id="${it.id}">✕</button>
            </td>
        </tr>`;
    }
    tbody.innerHTML = html;
    countSpan.textContent = items.length;

    // 删除事件
    tbody.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            if (!isNaN(id) && confirm('确定要删除此物品吗？')) {
                if (window.onDeleteItem) window.onDeleteItem(id);
            }
        });
    });

    // 分类点击筛选
    tbody.querySelectorAll('.category-tag').forEach(el => {
        el.addEventListener('click', function() {
            const cat = this.getAttribute('data-category');
            if (cat) {
                document.getElementById('itemCategoryFilter').value = cat;
                if (window.refreshAll) window.refreshAll();
            }
        });
    });
}

export function setupItemHandlers(onAddItem, onDeleteItem) {
    window.onDeleteItem = onDeleteItem;

    const addBtn = document.getElementById('addItemBtn');
    const nameInput = document.getElementById('itemNameInput');
    const priceInput = document.getElementById('itemPriceInput');
    const categoryInput = document.getElementById('itemCategoryInput');

    async function handleAdd() {
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);
        const category = categoryInput.value.trim();
        if (!name) { alert('请输入物品名称'); return; }
        if (isNaN(price) || price < 0) { alert('请输入有效的基础价格（≥0）'); return; }
        try {
            await onAddItem({ name, base_price: price, category });
            nameInput.value = '';
            priceInput.value = '';
            categoryInput.value = '';
            nameInput.focus();
        } catch (err) {
            alert(err.message);
        }
    }

    addBtn.addEventListener('click', handleAdd);
    [nameInput, priceInput, categoryInput].forEach(inp => {
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });
    });
}

export function setupClearItems(onClearItems) {
    document.getElementById('clearItemsBtn').addEventListener('click', function() {
        if (confirm('确定要清空所有物品吗？（此操作不可撤销）')) {
            onClearItems();
        }
    });
}