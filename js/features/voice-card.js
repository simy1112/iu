/**
 * 语音字卡模块
 * 功能：导入音频文件、列表管理、随机选取发送
 */

// ============ 状态 ============
let voiceLibrary = [];
let voiceInitialized = false;

// ============ 核心操作 ============

// 导入音频文件
function handleVoiceImport(files) {
    console.log('📁 语音导入被触发，文件数量:', files ? files.length : 0);
    
    if (!files || files.length === 0) {
        console.warn('⚠️ 没有选择文件');
        return;
    }

    let addedCount = 0;
    let skipCount = 0;

    for (const file of files) {
        console.log('📄 处理文件:', file.name, '大小:', file.size, '类型:', file.type);

        // 检查文件大小
        if (file.size > 30 * 1024 * 1024) {
            showNotification(`文件 "${file.name}" 超过30MB，已跳过`, 'error');
            skipCount++;
            continue;
        }

        // 检查是否已存在
        if (voiceLibrary.some(v => v.name === file.name && v.size === file.size)) {
            console.warn('⚠️ 文件已存在:', file.name);
            skipCount++;
            continue;
        }

        // 添加到库
        voiceLibrary.push({
            name: file.name,
            data: file,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        addedCount++;
        console.log('✅ 文件已添加:', file.name);
    }

    console.log('📊 添加成功:', addedCount, '跳过:', skipCount, '当前总数:', voiceLibrary.length);

    // 刷新界面
    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();

    if (addedCount > 0) {
        showNotification(`✅ 成功导入 ${addedCount} 个音频文件`, 'success');
    } else if (skipCount > 0) {
        showNotification(`⚠️ 所有文件已存在或超限，共 ${skipCount} 个`, 'warning');
    }
}

// 删除语音
function deleteVoice(index) {
    if (!confirm(`确定要删除 "${voiceLibrary[index].name}" 吗？`)) return;
    voiceLibrary.splice(index, 1);
    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();
    showNotification('✅ 已删除', 'success');
}

// 预览语音
function previewVoice(index) {
    const item = voiceLibrary[index];
    if (!item) {
        showNotification('⚠️ 语音不存在', 'error');
        return;
    }
    console.log('🔊 播放语音:', item.name);
    try {
        const url = URL.createObjectURL(item.data);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            showNotification('⚠️ 无法播放此音频，格式可能不支持', 'error');
        };
    } catch (e) {
        console.error('播放失败:', e);
        showNotification('⚠️ 播放失败', 'error');
    }
}

// 随机获取一条语音
function getRandomVoice() {
    if (voiceLibrary.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * voiceLibrary.length);
    return voiceLibrary[randomIndex];
}

// 获取语音总数
function getVoiceCount() {
    return voiceLibrary.length;
}

// ============ 渲染 ============

function renderVoiceList() {
    const container = document.getElementById('voice-list');
    if (!container) {
        console.warn('⚠️ voice-list 元素不存在');
        return;
    }

    console.log('🔄 渲染语音列表，共', voiceLibrary.length, '条');

    if (voiceLibrary.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 0; color:var(--text-secondary); font-size:13px; opacity:0.6;">
                <i class="fas fa-microphone" style="display:block; font-size:36px; margin-bottom:12px; opacity:0.25;"></i>
                暂无语音字卡，点上方导入
            </div>
        `;
        return;
    }

    container.innerHTML = voiceLibrary.map((item, index) => `
        <div class="voice-item" style="display:flex; align-items:center; gap:12px; background:var(--secondary-bg); border-radius:12px; padding:10px 14px; border:1px solid var(--border-color); transition:all 0.2s;">
            <i class="fas fa-file-audio" style="color:var(--accent-color); font-size:18px; flex-shrink:0;"></i>
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
                <div style="font-size:11px; color:var(--text-secondary);">${formatFileSize(item.size)}</div>
            </div>
            <button onclick="previewVoice(${index})" class="voice-preview-btn" style="background:rgba(var(--accent-color-rgb),0.12); border:none; border-radius:8px; padding:6px 12px; cursor:pointer; color:var(--accent-color); font-size:12px; font-family:var(--font-family); transition:all 0.2s;">
                <i class="fas fa-play"></i> 试听
            </button>
            <button onclick="deleteVoice(${index})" class="voice-delete-btn" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:14px; padding:4px 6px; border-radius:6px; transition:all 0.2s;" title="删除">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');

    // 绑定 hover 效果
    document.querySelectorAll('.voice-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.style.borderColor = 'rgba(var(--accent-color-rgb), 0.3)';
            el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.borderColor = 'var(--border-color)';
            el.style.boxShadow = 'none';
        });
    });
}

function updateVoiceCount() {
    const label = document.getElementById('voice-count-label');
    if (label) {
        label.textContent = `共 ${voiceLibrary.length} 条语音字卡 · 对方回复时随机选一条`;
    }
}

// ============ 持久化存储 ============

function saveVoiceLibrary() {
    if (typeof localforage !== 'undefined') {
        try {
            const metaData = voiceLibrary.map(item => ({
                name: item.name,
                size: item.size,
                type: item.type,
                lastModified: item.lastModified
            }));
            localforage.setItem('voiceLibraryMeta', metaData);
            const fileData = voiceLibrary.map(item => item.data);
            localforage.setItem('voiceLibraryFiles', fileData);
            console.log('💾 语音库已保存，共', voiceLibrary.length, '条');
        } catch (e) {
            console.warn('保存语音库失败:', e);
        }
    } else {
        try {
            localStorage.setItem('voiceLibrary', JSON.stringify(voiceLibrary.map(item => ({
                name: item.name,
                size: item.size
            }))));
        } catch (e) {
            console.warn('保存语音库失败:', e);
        }
    }
}

async function loadVoiceLibrary() {
    if (typeof localforage !== 'undefined') {
        try {
            const files = await localforage.getItem('voiceLibraryFiles');
            const meta = await localforage.getItem('voiceLibraryMeta');
            if (files && meta && files.length === meta.length && files.length > 0) {
                voiceLibrary = meta.map((m, i) => ({
                    name: m.name,
                    data: files[i],
                    size: m.size,
                    type: m.type,
                    lastModified: m.lastModified
                }));
                console.log('📂 语音库已加载，共', voiceLibrary.length, '条');
                renderVoiceList();
                updateVoiceCount();
            }
        } catch (e) {
            console.warn('加载语音库失败:', e);
        }
    }
}

// ============ 工具函数 ============

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ 初始化 ============

// 暴露到全局
window.voiceLibrary = voiceLibrary;
window.getRandomVoice = getRandomVoice;
window.getVoiceCount = getVoiceCount;
window.deleteVoice = deleteVoice;
window.previewVoice = previewVoice;
window.handleVoiceImport = handleVoiceImport;
window.renderVoiceList = renderVoiceList;
window.updateVoiceCount = updateVoiceCount;

console.log('🎤 语音字卡模块加载中...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM 已加载，初始化语音字卡...');
    
    loadVoiceLibrary();

    // 绑定文件输入
    const fileInput = document.getElementById('voice-file-input');
    if (fileInput) {
        console.log('✅ 找到 voice-file-input');
        fileInput.addEventListener('change', function(e) {
            console.log('📁 文件选择事件触发');
            handleVoiceImport(e.target.files);
            this.value = ''; // 允许重复选择相同文件
        });
    } else {
        console.warn('⚠️ voice-file-input 元素不存在！');
    }

    // 绑定侧边栏切换（只处理 voice 切换）
    const voiceBtn = document.querySelector('.sidebar-btn[data-major="voice"]');
    if (voiceBtn) {
        console.log('✅ 找到语音字卡按钮');
        // 用 onclick 直接绑定，防止与其他 JS 冲突
        voiceBtn.onclick = function(e) {
            e.preventDefault();
            
            // 更新按钮状态
            document.querySelectorAll('.sidebar-btn[data-major]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 隐藏所有面板
            const listPanel = document.getElementById('custom-replies-list');
            const voicePanel = document.getElementById('voice-panel');
            const titleEl = document.getElementById('cr-modal-title');

            if (listPanel) listPanel.style.display = 'none';
            if (voicePanel) {
                voicePanel.style.display = 'block';
                console.log('✅ 语音面板已显示');
            } else {
                console.warn('⚠️ voice-panel 不存在');
            }
            if (titleEl) titleEl.textContent = '语音字卡';

            // 刷新语音列表
            renderVoiceList();
            updateVoiceCount();
        };
    } else {
        console.warn('⚠️ 语音字卡按钮不存在！');
    }

    console.log('🎤 语音字卡模块加载完成 ✅');
});
