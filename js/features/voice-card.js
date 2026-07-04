/**
 * 语音字卡模块
 * 功能：导入音频文件、列表管理、随机选取发送
 */

// ============ 状态 ============
let voiceLibrary = [];

// ============ 核心操作 ============

// 导入音频文件
function handleVoiceImport(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
        if (file.size > 30 * 1024 * 1024) {
            showNotification(`文件 "${file.name}" 超过30MB，已跳过`, 'error');
            continue;
        }

        if (voiceLibrary.some(v => v.name === file.name && v.size === file.size)) {
            continue;
        }

        voiceLibrary.push({
            name: file.name,
            data: file,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
    }

    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();
}

// 删除语音
function deleteVoice(index) {
    if (!confirm(`确定要删除 "${voiceLibrary[index].name}" 吗？`)) return;
    voiceLibrary.splice(index, 1);
    renderVoiceList();
    updateVoiceCount();
    saveVoiceLibrary();
}

// 预览语音
function previewVoice(index) {
    const item = voiceLibrary[index];
    if (!item) return;
    const url = URL.createObjectURL(item.data);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
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
    if (!container) return;

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
        const metaData = voiceLibrary.map(item => ({
            name: item.name,
            size: item.size,
            type: item.type,
            lastModified: item.lastModified
        }));
        localforage.setItem('voiceLibraryMeta', metaData);
        const fileData = voiceLibrary.map(item => item.data);
        localforage.setItem('voiceLibraryFiles', fileData);
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
            if (files && meta && files.length === meta.length) {
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

window.voiceLibrary = voiceLibrary;
window.getRandomVoice = getRandomVoice;
window.getVoiceCount = getVoiceCount;
window.deleteVoice = deleteVoice;
window.previewVoice = previewVoice;
window.handleVoiceImport = handleVoiceImport;

document.addEventListener('DOMContentLoaded', function() {
    loadVoiceLibrary();

    const fileInput = document.getElementById('voice-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            handleVoiceImport(e.target.files);
            this.value = '';
        });
    }

document.querySelectorAll('.sidebar-btn[data-major]').forEach(btn => {
    btn.addEventListener('click', function() {
        const major = this.dataset.major;
        
        // 更新按钮状态
        document.querySelectorAll('.sidebar-btn[data-major]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // 获取所有面板
        const listPanel = document.getElementById('custom-replies-list');
        const voicePanel = document.getElementById('voice-panel');
        const titleEl = document.getElementById('cr-modal-title');

        // ⚠️ 关键：先隐藏所有面板
        if (listPanel) listPanel.style.display = 'none';
        if (voicePanel) voicePanel.style.display = 'none';

       // 根据点击显示对应面板
if (major === 'reply') {
    if (listPanel) {
        listPanel.style.display = 'block';
        document.querySelectorAll('.reply-tab-btn').forEach(t => {
            if (t.dataset.tab === 'all') t.classList.add('active');
            else t.classList.remove('active');
        });
        if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    }
    if (titleEl) titleEl.textContent = '回复库';
} else if (major === 'atmosphere') {
    if (listPanel) {
        listPanel.style.display = 'block';
        document.querySelectorAll('.reply-tab-btn').forEach(t => {
            if (t.dataset.tab === 'atmosphere') t.classList.add('active');
            else t.classList.remove('active');
        });
        if (typeof renderAtmosphereLibrary === 'function') renderAtmosphereLibrary();
    }
    if (titleEl) titleEl.textContent = '氛围感';
} else if (major === 'voice') {
    if (voicePanel) voicePanel.style.display = 'block';
    if (titleEl) titleEl.textContent = '语音字卡';
    renderVoiceList();
    updateVoiceCount();
}
