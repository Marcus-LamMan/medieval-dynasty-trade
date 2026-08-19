import { escapeHtml } from '../utils/helpers.js';

let currentItems = [];
let currentFilter = '';
let onUpdateItemCallback = null; // 存储更新回调

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
        const price = Number(it.base_price).toFixed(2);
        html += `<tr>
            <td class="item-name editable-cell" data-id="${it.id}" data-field="name">${escapeHtml(it.name)}</td>
            <td><span class="tag category-tag" data-category="${escapeHtml(cat)}" style="cursor:pointer;">${escapeHtml(cat)}</span></td>
            <td class="editable-cell" data-id="${it.id}" data-field="base_price">${price}</td>
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

    // ----- 单元格点击编辑 -----
    tbody.querySelectorAll('.editable-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            // 如果已经有输入框，不做重复操作
            if (this.querySelector('input')) return;
            const id = parseInt(this.dataset.id, 10);
            const field = this.dataset.field; // 'name' 或 'base_price'
            const originalValue = this.textContent.trim();
            // 创建输入框
            const input = document.createElement('input');
            input.type = field === 'base_price' ? 'number' : 'text';
            input.step = '0.1';
            input.value = field === 'base_price' ? parseFloat(originalValue) : originalValue;
            input.className = 'inline-edit-input';
            input.style.width = '100%';
            input.style.background = '#1a1a2a';
            input.style.border = '1px solid #7a7ac0';
            input.style.borderRadius = '4px';
            input.style.color = '#f0f0ff';
            input.style.padding = '4px 8px';
            input.style.fontSize = '0.9rem';
            // 清空单元格并放入输入框
            this.textContent = '';
            this.appendChild(input);
            input.focus();
            input.select();

            // 保存函数
            async function save() {
                const newValue = input.value.trim();
                if (newValue === '') {
                    // 如果为空，取消编辑
                    cancel();
                    return;
                }
                // 组装更新数据
                const updateData = {};
                if (field === 'name') {
                    updateData.name = newValue;
                } else if (field === 'base_price') {
                    const num = parseFloat(newValue);
                    if (isNaN(num)) {
                        alert('请输入有效数字');
                        return;
                    }
                    updateData.base_price = num;
                }
                try {
                    if (onUpdateItemCallback) {
                        await onUpdateItemCallback(id, updateData);
                        // 成功后外部会刷新列表，无需额外操作
                    } else {
                        console.warn('onUpdateItemCallback 未设置');
                    }
                } catch (err) {
                    alert('更新失败: ' + err.message);
                    // 恢复原值
                    cancel();
                }
            }

            function cancel() {
                // 恢复为原始文本
                this.textContent = originalValue;
            }

            // 失焦保存
            input.addEventListener('blur', save.bind(this));
            // 回车保存
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                } else if (e.key === 'Escape') {
                    this.value = originalValue;
                    this.blur();
                }
            });
        });
    });
}

// 设置回调
export function setupItemHandlers(onAddItem, onDeleteItem, onUpdateItem) {
    window.onDeleteItem = onDeleteItem;
    onUpdateItemCallback = onUpdateItem;

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