const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// ---------- GET 接口 ----------
app.get('/api/items', (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM items';
    const params = [];
    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }
    const stmt = db.prepare(sql);
    const items = stmt.all(...params);
    res.json(items);
});

app.get('/api/buildings', (req, res) => {
    const stmt = db.prepare('SELECT * FROM buildings');
    res.json(stmt.all());
});

app.get('/api/recipes', (req, res) => {
    const stmt = db.prepare(`
        SELECT 
            r.id,
            r.product_item_id,
            r.building_id,
            r.craft_time_seconds,
            r.unlock_tech,
            i.name AS product_name,
            i.base_price AS product_price,
            b.name AS building_name,
            b.category AS building_category
        FROM recipes r
        JOIN items i ON r.product_item_id = i.id
        JOIN buildings b ON r.building_id = b.id
    `);
    const recipes = stmt.all();

    const materialStmt = db.prepare(`
        SELECT 
            rm.quantity,
            mi.name AS material_name,
            mi.base_price AS material_price
        FROM recipe_materials rm
        JOIN items mi ON rm.material_item_id = mi.id
        WHERE rm.recipe_id = ?
    `);
    for (const recipe of recipes) {
        const materials = materialStmt.all(recipe.id);
        recipe.materials = materials;
        let totalCost = 0;
        for (const mat of materials) {
            totalCost += mat.material_price * mat.quantity;
        }
        recipe.total_cost = totalCost;
        recipe.profit = recipe.product_price - totalCost;
    }
    res.json(recipes);
});

// ---------- POST / DELETE 接口 ----------
app.post('/api/items', (req, res) => {
    const { name, category, base_price, weight, max_stack, notes } = req.body;
    if (!name || base_price === undefined) {
        return res.status(400).json({ error: '名称和基础价格不能为空' });
    }
    try {
        const stmt = db.prepare(`
            INSERT INTO items (name, category, base_price, weight, max_stack, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(name, category, base_price, weight || 0, max_stack || 999, notes || null);
        res.status(201).json({ id: info.lastInsertRowid, message: '物品添加成功' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: '物品名称已存在' });
        } else {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    }
});

app.delete('/api/items/:id', (req, res) => {
    const id = req.params.id;
    try {
        const checkStmt = db.prepare(`
            SELECT COUNT(*) as count FROM recipes WHERE product_item_id = ?
            UNION ALL
            SELECT COUNT(*) FROM recipe_materials WHERE material_item_id = ?
        `);
        const result = checkStmt.all(id, id);
        const total = result.reduce((sum, row) => sum + row.count, 0);
        if (total > 0) {
            return res.status(409).json({ error: '该物品被配方引用，无法删除' });
        }
        const stmt = db.prepare('DELETE FROM items WHERE id = ?');
        const info = stmt.run(id);
        if (info.changes === 0) {
            return res.status(404).json({ error: '物品不存在' });
        }
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.put('/api/items/:id', (req, res) => {
    const id = req.params.id;
    const { name, category, base_price, weight, max_stack, notes } = req.body;
    // 至少需要提供可更新的字段，但名称和价格必须有其一
    if (!name && base_price === undefined) {
        return res.status(400).json({ error: '请提供需要更新的字段（名称或价格）' });
    }
    try {
        // 先检查物品是否存在
        const checkStmt = db.prepare('SELECT id FROM items WHERE id = ?');
        const existing = checkStmt.get(id);
        if (!existing) {
            return res.status(404).json({ error: '物品不存在' });
        }

        // 构建动态 SQL（只更新提供的字段）
        const fields = [];
        const values = [];
        if (name) {
            fields.push('name = ?');
            values.push(name);
        }
        if (category !== undefined) {
            fields.push('category = ?');
            values.push(category);
        }
        if (base_price !== undefined) {
            fields.push('base_price = ?');
            values.push(base_price);
        }
        if (weight !== undefined) {
            fields.push('weight = ?');
            values.push(weight);
        }
        if (max_stack !== undefined) {
            fields.push('max_stack = ?');
            values.push(max_stack);
        }
        if (notes !== undefined) {
            fields.push('notes = ?');
            values.push(notes);
        }
        // 更新时间
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`;
        const stmt = db.prepare(sql);
        stmt.run(...values);

        // 返回更新后的物品
        const getStmt = db.prepare('SELECT * FROM items WHERE id = ?');
        const updated = getStmt.get(id);
        res.json(updated);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: '物品名称已存在' });
        } else {
            console.error(err);
            res.status(500).json({ error: '服务器错误' });
        }
    }
});

function parseIngredientsString(str) {
    if (!str) return [];
    // 先统一将顿号替换为逗号
    let normalized = str.replace(/、/g, ',');
    let parts = [];
    if (normalized.includes(',')) {
        parts = normalized.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        // 按空格分割，每个 token 可能是 "名称" 或 "数字" 或 "名称数字"
        const tokens = normalized.split(/\s+/).filter(Boolean);
        let currentName = '';
        let currentQty = 1;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // 尝试匹配 "名称+数字"（如 原木1）
            const match = token.match(/^(.+?)\s*([\d.]+)$/);
            if (match) {
                // 如果之前有累积的名称，先提交
                if (currentName) {
                    parts.push({ name: currentName.trim(), qty: currentQty });
                    currentName = '';
                    currentQty = 1;
                }
                const name = match[1].trim();
                const qty = parseFloat(match[2]);
                if (name && !isNaN(qty)) {
                    parts.push({ name, qty });
                } else {
                    // 解析失败，当作普通名称
                    if (currentName) currentName += ' ' + token;
                    else currentName = token;
                }
            } else {
                // 没有数字结尾，判断是否为纯数字（可能是单独的数量）
                if (!isNaN(parseFloat(token)) && isFinite(token)) {
                    if (currentName) {
                        currentQty = parseFloat(token);
                    } else {
                        // 单独的数字，忽略（可能是输入错误）
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

    // 处理逗号分割的部分，进一步解析 "名称 数量" 或 "名称数量"
    const result = [];
    for (let part of parts) {
        if (typeof part === 'object' && part.name) {
            result.push(part);
            continue;
        }
        // 尝试匹配 "名称 数量"
        const match = part.match(/^(.+?)\s+([\d.]+)$/);
        if (match) {
            const name = match[1].trim();
            const qty = parseFloat(match[2]);
            if (name && !isNaN(qty)) {
                result.push({ name, qty });
                continue;
            }
        }
        // 尝试匹配 "名称数量"（无空格）
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
    return result;
}

app.post('/api/recipes', (req, res) => {
    const { productName, buildingName, ingredientsString, craft_time_seconds, unlock_tech, notes } = req.body;
    if (!productName || !buildingName || !ingredientsString) {
        return res.status(400).json({ error: '成品名称、建筑名称、材料清单不能为空' });
    }
    try {
        const productStmt = db.prepare('SELECT id FROM items WHERE name = ?');
        const product = productStmt.get(productName);
        if (!product) {
            return res.status(400).json({ error: `成品 "${productName}" 不存在，请先添加物品` });
        }
        const buildingStmt = db.prepare('SELECT id FROM buildings WHERE name = ?');
        const building = buildingStmt.get(buildingName);
        if (!building) {
            return res.status(400).json({ error: `建筑 "${buildingName}" 不存在，请先添加建筑` });
        }

        // 解析材料
        const materialItems = parseIngredientsString(ingredientsString);

        if (materialItems.length === 0) {
            return res.status(400).json({ error: '材料清单格式错误，请用 "材料名 数量" 格式，逗号分隔' });
        }

        // 检查重复配方
        const checkRecipe = db.prepare('SELECT id FROM recipes WHERE product_item_id = ? AND building_id = ?');
        const existing = checkRecipe.get(product.id, building.id);
        if (existing) {
            return res.status(409).json({ error: '该物品在此建筑中已有配方，无需重复添加' });
        }

        // 验证每个材料是否有效，并确保 quantity 有值
        const materialIds = [];
        for (const mat of materialItems) {
            // 注意字段名是 qty，不是 quantity
            if (mat.qty === undefined || isNaN(mat.qty) || mat.qty <= 0) {
                console.error(`❌ 材料 "${mat.name}" 的数量无效:`, mat.qty);
                return res.status(400).json({ error: `材料 "${mat.name}" 的数量无效，请检查输入格式` });
            }
            const itemStmt = db.prepare('SELECT id FROM items WHERE name = ?');
            const item = itemStmt.get(mat.name);
            if (!item) {
                return res.status(400).json({ error: `材料 "${mat.name}" 不存在，请先添加物品` });
            }
            materialIds.push({ id: item.id, quantity: mat.qty });
        }

        // 插入配方
        const insertRecipe = db.prepare(`
            INSERT INTO recipes (product_item_id, building_id, craft_time_seconds, unlock_tech, notes)
            VALUES (?, ?, ?, ?, ?)
        `);
        const recipeInfo = insertRecipe.run(product.id, building.id, craft_time_seconds || 10, unlock_tech || null, notes || null);
        const recipeId = recipeInfo.lastInsertRowid;

        // 插入材料（此时 quantity 肯定有效）
        const insertMaterial = db.prepare(`
            INSERT INTO recipe_materials (recipe_id, material_item_id, quantity)
            VALUES (?, ?, ?)
        `);
        for (const mat of materialIds) {
            insertMaterial.run(recipeId, mat.id, mat.quantity);
        }
        res.status(201).json({ id: recipeId, message: '配方添加成功' });
    } catch (err) {
        console.error('❌ 服务器错误:', err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.delete('/api/recipes/:id', (req, res) => {
    const id = req.params.id;
    try {
        const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
        const info = stmt.run(id);
        if (info.changes === 0) {
            return res.status(404).json({ error: '配方不存在' });
        }
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

