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

function parseIngredientsString(str) {
    if (!str) return [];
    const parts = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const result = [];
    for (const part of parts) {
        const match = part.match(/^(.+?)\s*[xX×*]\s*([\d.]+)$/);
        if (match) {
            result.push({ name: match[1].trim(), quantity: parseFloat(match[2]) });
        } else {
            const words = part.split(/\s+/);
            const last = words[words.length - 1];
            const qty = parseFloat(last);
            if (!isNaN(qty) && qty > 0) {
                const name = words.slice(0, -1).join(' ');
                result.push({ name, quantity: qty });
            } else {
                result.push({ name: part, quantity: 1 });
            }
        }
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
        const materialItems = parseIngredientsString(ingredientsString);
        if (materialItems.length === 0) {
            return res.status(400).json({ error: '材料清单格式错误，请用 "材料名 x数量" 格式，逗号分隔' });
        }
        const materialIds = [];
        for (const mat of materialItems) {
            const itemStmt = db.prepare('SELECT id FROM items WHERE name = ?');
            const item = itemStmt.get(mat.name);
            if (!item) {
                return res.status(400).json({ error: `材料 "${mat.name}" 不存在，请先添加物品` });
            }
            materialIds.push({ id: item.id, quantity: mat.quantity });
        }
        const insertRecipe = db.prepare(`
            INSERT INTO recipes (product_item_id, building_id, craft_time_seconds, unlock_tech, notes)
            VALUES (?, ?, ?, ?, ?)
        `);
        const recipeInfo = insertRecipe.run(product.id, building.id, craft_time_seconds || 10, unlock_tech || null, notes || null);
        const recipeId = recipeInfo.lastInsertRowid;

        const insertMaterial = db.prepare(`
            INSERT INTO recipe_materials (recipe_id, material_item_id, quantity)
            VALUES (?, ?, ?)
        `);
        for (const mat of materialIds) {
            insertMaterial.run(recipeId, mat.id, mat.quantity);
        }
        res.status(201).json({ id: recipeId, message: '配方添加成功' });
    } catch (err) {
        console.error(err);
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
