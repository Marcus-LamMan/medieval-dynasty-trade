// src/api.js
const API_BASE = 'http://localhost:3000/api';

export async function fetchItems(category = '') {
    const url = category ? `${API_BASE}/items?category=${encodeURIComponent(category)}` : `${API_BASE}/items`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('获取物品失败');
    return res.json();
}

export async function fetchRecipes() {
    const res = await fetch(`${API_BASE}/recipes`);
    if (!res.ok) throw new Error('获取配方失败');
    return res.json();
}

export async function addItem(itemData) {
    const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '添加物品失败');
    }
    return res.json();
}

export async function deleteItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除物品失败');
    }
    return res.json();
}

export async function addRecipe(recipeData) {
    const res = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '添加配方失败');
    }
    return res.json();
}

export async function deleteRecipe(id) {
    const res = await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除配方失败');
    }
    return res.json();
}

export async function updateItem(id, data) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '更新物品失败');
    }
    return res.json();
}