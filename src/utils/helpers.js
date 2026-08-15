// 解析材料字符串
export function parseIngredients(str) {
  if (!str) return [];
  const parts = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const result = [];
  for (const part of parts) {
    const match = part.match(/^(.+?)\s*[xX×*]\s*([\d.]+)$/);
    if (match) {
      const name = match[1].trim();
      const qty = parseFloat(match[2]);
      if (name && !isNaN(qty) && qty > 0) {
        result.push({ name, qty });
      }
    } else {
      const parts2 = part.split(/\s+/);
      if (parts2.length >= 2) {
        const maybeQty = parseFloat(parts2[parts2.length - 1]);
        if (!isNaN(maybeQty) && maybeQty > 0) {
          const name = parts2.slice(0, -1).join(' ');
          if (name) {
            result.push({ name, qty: maybeQty });
            continue;
          }
        }
      }
      result.push({ name: part, qty: 1 });
    }
  }
  return result;
}

// 计算成本
export function calculateCost(ingredientList, items) {
  let total = 0;
  const unknown = [];
  for (const ing of ingredientList) {
    const found = items.find(it => it.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
    if (found) {
      total += found.price * ing.qty;
    } else {
      unknown.push(ing.name);
    }
  }
  return { total, unknown };
}

// 转义HTML
export function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

// 存储
export function loadData(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(defaultData));
}

export function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}