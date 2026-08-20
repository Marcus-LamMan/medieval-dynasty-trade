const fs = require('fs');
const path = require('path');

// 源数据库路径
const dbPath = path.join(__dirname, '../server/database.db');
// 备份目录
const backupDir = path.join(__dirname, '../server/backups');

// 检查源文件是否存在
if (!fs.existsSync(dbPath)) {
    console.error('❌ 数据库文件不存在:', dbPath);
    process.exit(1);
}

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 创建备份目录:', backupDir);
}

// 生成时间戳文件名（如 database_backup_2026-08-20_153045.db）
const now = new Date();
const timestamp = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
const backupName = `database_backup_${timestamp}.db`;
const backupPath = path.join(backupDir, backupName);

// 复制文件
fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
        console.error('❌ 备份失败:', err);
        process.exit(1);
    }
    console.log(`✅ 数据库已备份到: ${backupPath}`);
    // 可选：显示文件大小
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 备份大小: ${sizeMB} MB`);
});

// 删除 7 天前的备份
const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 7);
fs.readdirSync(backupDir).forEach(file => {
    if (file.startsWith('database_backup_') && file.endsWith('.db')) {
        const filePath = path.join(backupDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtime < oldDate) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ 已删除旧备份: ${file}`);
        }
    }
});