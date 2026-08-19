const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// 建表语句
const createTables = `
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    base_price REAL NOT NULL DEFAULT 0.00,
    weight REAL DEFAULT 0.000,
    max_stack INTEGER DEFAULT 999,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    tier INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_item_id INTEGER NOT NULL,
    building_id INTEGER NOT NULL,
    craft_time_seconds INTEGER NOT NULL DEFAULT 10,
    unlock_tech TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    UNIQUE(product_item_id, building_id)
);

CREATE TABLE IF NOT EXISTS recipe_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    material_item_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.00,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (material_item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, material_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_building ON recipes(building_id);
CREATE INDEX IF NOT EXISTS idx_recipe_materials_material ON recipe_materials(material_item_id);
`;

db.exec(createTables);
console.log('✅ 表结构创建成功');

// 插入示例数据
const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
if (itemCount === 0) {
    const insertData = `
    INSERT INTO buildings (name, category, tier) VALUES
    ('铁匠铺', '生产', 1),
    ('伐木棚', '生产', 1);

    INSERT INTO items (name, category, base_price, weight, max_stack) VALUES
    ('铁矿石', '材料', 17.00, 1.000, 100),
    ('云杉树皮', '材料', 0.20, 0.100, 999),
    ('陶碗', '材料', 2.00, 0.200, 50),
    ('黑色染料', '材料', 150.00, 0.100, 20);

    INSERT INTO recipes (product_item_id, building_id, craft_time_seconds, unlock_tech)
    SELECT 
        (SELECT id FROM items WHERE name = '黑色染料'),
        (SELECT id FROM buildings WHERE name = '铁匠铺'),
        30,
        '染色I';

    INSERT INTO recipe_materials (recipe_id, material_item_id, quantity)
    SELECT 
        (SELECT id FROM recipes WHERE product_item_id = (SELECT id FROM items WHERE name = '黑色染料') AND building_id = (SELECT id FROM buildings WHERE name = '铁匠铺')),
        (SELECT id FROM items WHERE name = '云杉树皮'),
        40
    UNION ALL
    SELECT 
        (SELECT id FROM recipes WHERE product_item_id = (SELECT id FROM items WHERE name = '黑色染料') AND building_id = (SELECT id FROM buildings WHERE name = '铁匠铺')),
        (SELECT id FROM items WHERE name = '铁矿石'),
        3
    UNION ALL
    SELECT 
        (SELECT id FROM recipes WHERE product_item_id = (SELECT id FROM items WHERE name = '黑色染料') AND building_id = (SELECT id FROM buildings WHERE name = '铁匠铺')),
        (SELECT id FROM items WHERE name = '陶碗'),
        1;
    `;
    db.exec(insertData);
    console.log('✅ 示例数据插入成功');
} else {
    console.log('ℹ️ 数据已存在，跳过插入');
}

db.close();
console.log('🎉 数据库初始化完成！');