import { escapeHtml, saveData } from '../utils/helpers.js';

let items = [];
let itemsContainer = null;
let filter = '';

// 渲染物品列表
export function renderItems(data, filterValue = '') {
  items = data;
  filter = filterValue.toLowerCase();
  const tbody = document.getElementById('itemTableBody');
  const countSpan = document.getElementById('itemCount');
  const filtered = filter ? items.filter(it => it.category && it.category.toLowerCase() === filter) : items;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">暂无匹配物品</td></tr>`;
    countSpan.textContent = items.length;
    return;
  }

  let html = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (filter && (!it.category || it.category.toLowerCase() !== filter)) continue;
    const cat = it.category || '未分类';
    html += `<tr>
      <td class="item-name">${escapeHtml(it.name)}</td>
      <td><span class="tag category-tag" data-category="${escapeHtml(cat)}" style="cursor:pointer;">${escapeHtml(cat)}</span></td>
      <td>${Number(it.price).toFixed(2)}</td>
      <td style="text-align:right">
        <button class="btn btn-sm btn-danger" data-item-index="${i}">✕</button>
      </td>
    </tr>`;
  }
  tbody.innerHTML = html;
  countSpan.textContent = items.length;

  // 删除事件
  tbody.querySelectorAll('[data-item-index]').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-item-index'), 10);
      if (!isNaN(idx) && idx >= 0 && idx < items.length) {
        items.splice(idx, 1);
        saveData('md_items_v2', items);
        // 触发重新渲染（由外部调用）
        if (window.refreshAll) window.refreshAll();
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

// 添加物品
export function setupItemHandlers(getItems, setItems, refreshCallback) {
  const addBtn = document.getElementById('addItemBtn');
  const nameInput = document.getElementById('itemNameInput');
  const priceInput = document.getElementById('itemPriceInput');
  const categoryInput = document.getElementById('itemCategoryInput');

  function addItem() {
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const category = categoryInput.value.trim();
    if (!name) { alert('请输入物品名称'); return; }
    if (isNaN(price) || price < 0) { alert('请输入有效的基础价格（≥0）'); return; }
    const current = getItems();
    const existed = current.some(it => it.name.trim().toLowerCase() === name.toLowerCase());
    if (existed) {
      alert(`物品 "${name}" 已存在`);
      return;
    }
    current.push({ name, price, category });
    setItems(current);
    saveData('md_items_v2', current);
    nameInput.value = '';
    priceInput.value = '';
    categoryInput.value = '';
    nameInput.focus();
    refreshCallback();
  }

  addBtn.addEventListener('click', addItem);
  [nameInput, priceInput, categoryInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
  });
}

// 清空
export function setupClearItems(getItems, setItems, refreshCallback) {
  document.getElementById('clearItemsBtn').addEventListener('click', function() {
    if (getItems().length === 0) return;
    if (confirm('确定清空所有物品吗？')) {
      setItems([]);
      saveData('md_items_v2', []);
      refreshCallback();
    }
  });
}