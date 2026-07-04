/**
 * 语音字卡模块 - 精简版
 * 切换逻辑由 index.html 中的 switchPanel 处理
 */

// ============ 状态 ============
let voiceLibrary = [];

// ============ 核心操作 ============

function handleVoiceImport(files) {
    console.log('📁 语音导入被触发，文件数量:', files ? files.length : 0);
    if (!files || files.length === 0) {
        console.warn('⚠️ 没有选择文件');
        return;
    }

    let addedCount = 0;
    let skipCount = 0;

    for (const file of files) {
        console.log('📄 处理文件:', file.name, '大小:', file.size);

        if (file.size > 30 * 1024 * 1024) {
            showNotification(`文件 "${file.name}" 超过30MB，已跳过`, 'error');
            skipCount++;
            continue;
        }

        if (voiceLibrary.some(v => v.name === file.name && v.size === file.size)) {
            console.warn('⚠️ 文件已存在:', file.name);
            skipCount++;
            continue;
        }

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

    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();

    if (addedCount > 0) {
        showNotification(`✅ 成功导入 ${addedCount} 个音频文件`, 'success');
    } else if (skipCount > 0) {
        showNotification(`⚠️ 所有文件已存在或超限，共 ${skipCount} 个`, 'warning');
    }
}

function deleteVoice(index) {
    if (!confirm(`确定要删除 "${voiceLibrary[index].name}" 吗？`)) return;
    voiceLibrary.splice(index, 1);
    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();
    showNotification('✅ 已删除', 'success');
}

function previewVoice(index) {
    const item = voiceLibrary[index];
    if (!item) {
        showNotification('⚠️ 语音不存在', 'error');
        return;
    }
    try {
        const url = URL.createObjectURL(item.data);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            showNotification('⚠️ 无法播放此音频', 'error');
        };
    } catch (e) {
        console.error('播放失败:', e);
        showNotification('⚠️ 播放失败', 'error');
    }
}

function getRandomVoice() {
    if (voiceLibrary.length === 0) return null;
    return voiceLibrary[Math.floor(Math.random() * voiceLibrary.length)];
}

function getVoiceCount() {
    return voiceLibrary.length;
}

function renderVoiceList() {
    const container = document.getElementById('voice-list');
    if (!container) {
        console.warn('⚠️ voice-list 元素不存在');
        return;
    }

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
        <div style="display:flex; align-items:center; gap:12px; background:var(--secondary-bg); border-radius:12px; padding:10px 14px; border:1px solid var(--border-color);">
            <i class="fas fa-file-audio" style="color:var(--accent-color); font-size:18px; flex-shrink:0;"></i>
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
                <div style="font-size:11px; color:var(--text-secondary);">${formatFileSize(item.size)}</div>
            </div>
            <button onclick="previewVoice(${index})" style="background:rgba(var(--accent-color-rgb),0.12); border:none; border-radius:8px; padding:6px 12px; cursor:pointer; color:var(--accent-color); font-size:12px;">
                <i class="fas fa-play"></i> 试听
            </button>
            <button onclick="deleteVoice(${index})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:14px; padding:4px;">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

function updateVoiceCount() {
    const label = document.getElementById('voice-count-label');
    if (label) {
        label.textContent = `共 ${voiceLibrary.length} 条语音字卡 · 对方回复时随机选一条`;
    }
}

function saveVoiceLibrary() {
    if (typeof localforage !== 'undefined') {
        try {
            localforage.setItem('voiceLibraryMeta', voiceLibrary.map(item => ({
                name: item.name,
                size: item.size,
                type: item.type,
                lastModified: item.lastModified
            })));
            localforage.setItem('voiceLibraryFiles', voiceLibrary.map(item => item.data));
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
                renderVoiceList();
                updateVoiceCount();
            }
        } catch (e) {
            console.warn('加载语音库失败:', e);
        }
    }
}

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

// ============ 暴露到全局 ============
window.voiceLibrary = voiceLibrary;
window.getRandomVoice = getRandomVoice;
window.getVoiceCount = getVoiceCount;
window.deleteVoice = deleteVoice;
window.previewVoice = previewVoice;
window.handleVoiceImport = handleVoiceImport;
window.renderVoiceList = renderVoiceList;
window.updateVoiceCount = updateVoiceCount;

// ============ 加载语音库 ============
loadVoiceLibrary();

// ============ 绑定文件输入 ============
const fileInput = document.getElementById('voice-file-input');
if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        console.log('📁 文件选择事件触发');
        handleVoiceImport(e.target.files);
        this.value = '';
    });
} else {
    console.warn('⚠️ voice-file-input 元素不存在！');
}

console.log('🎤 语音字卡模块加载完成 ✅');
