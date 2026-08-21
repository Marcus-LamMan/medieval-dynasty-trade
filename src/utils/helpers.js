/**
 * 解析材料字符串，支持多种格式：
 * - 逗号分隔：云杉树皮 40, 铁矿石 3, 陶碗 1
 * - 顿号分隔：云杉树皮 40、铁矿石 3、陶碗 1
 * - 空格分隔：云杉树皮 40 铁矿石 3 陶碗 1
 * - 数量紧跟在名称后：云杉树皮40 铁矿石3 陶碗1
 * - 混合使用均支持
 * 返回 [{ name, qty }]
 */
export function parseIngredients(str) {
    if (!str) return [];
    // 按逗号、顿号、或空格+逗号等分割，但避免分割名称内部的空格
    // 先统一将顿号替换为逗号
    let normalized = str.replace(/、/g, ',');
    // 按逗号分割，如果只有空格分隔则按空格分割
    let parts = [];
    if (normalized.includes(',')) {
        parts = normalized.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        // 按空格分割，但需要保留名称中的空格（如“云杉树皮”）
        // 我们按空格分割后尝试组合
        const tokens = normalized.split(/\s+/).filter(Boolean);
        // 遍历每个token，判断是否以数字结尾，若是则作为数量，否则作为名称的一部分
        let currentName = '';
        let currentQty = 1;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // 检查token是否以数字结尾（可能包含小数）
            const match = token.match(/^(.+?)\s*([\d.]+)$/);
            if (match) {
                // 如果之前有累积的名称，先提交
                if (currentName) {
                    parts.push({ name: currentName.trim(), qty: currentQty });
                    currentName = '';
                    currentQty = 1;
                }
                // 当前token是“名称+数量”格式
                const name = match[1].trim();
                const qty = parseFloat(match[2]);
                if (name && !isNaN(qty)) {
                    parts.push({ name, qty });
                } else {
                    // 如果解析失败，当作名称
                    if (currentName) currentName += ' ' + token;
                    else currentName = token;
                }
            } else {
                // 没有数字结尾，判断是否为纯数字（作为上一个材料的数量）
                if (!isNaN(parseFloat(token)) && isFinite(token)) {
                    // 如果当前有名称，则作为数量
                    if (currentName) {
                        currentQty = parseFloat(token);
                    } else {
                        // 意外情况，忽略
                    }
                } else {
                    // 是名称的一部分
                    if (currentName) currentName += ' ' + token;
                    else currentName = token;
                }
            }
        }
        // 提交最后的累积
        if (currentName) {
            parts.push({ name: currentName.trim(), qty: currentQty });
        }
    }

    // 对逗号分割的部分进一步解析（处理“名称 数量”格式）
    const result = [];
    for (let part of parts) {
        // 如果part是对象则直接使用
        if (typeof part === 'object' && part.name) {
            result.push(part);
            continue;
        }
        // 尝试匹配“名称 数量”或“名称数量”
        const match = part.match(/^(.+?)\s+([\d.]+)$/);
        if (match) {
            const name = match[1].trim();
            const qty = parseFloat(match[2]);
            if (name && !isNaN(qty)) {
                result.push({ name, qty });
                continue;
            }
        }
        // 尝试匹配“名称数量”（无空格）
        const match2 = part.match(/^(.+?)([\d.]+)$/);
        if (match2) {
            const name = match2[1].trim();
            const qty = parseFloat(match2[2]);
            if (name && !isNaN(qty)) {
                result.push({ name, qty });
                continue;
            }
        }
        // 默认数量为1
        result.push({ name: part.trim(), qty: 1 });
    }
    // 如果结果为空，尝试用空格分割
    if (result.length === 0 && str.includes(' ')) {
        // 重新处理...
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
      total += found.base_price * ing.qty;
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