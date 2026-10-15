/* Shared helpers for admin pages: API calls, escaping, formatting, toast, modal. */

const API = {
    async request(method, url, body) {
        const opts = { method, headers: {}, credentials: 'same-origin' };
        if (body instanceof FormData) {
            opts.body = body;
        } else if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(url, opts);
        } catch {
            throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
        const data = await res.json().catch(() => ({}));

        // Not logged in / session expired → go to the login page (except on the login page itself)
        if (res.status === 401 && !location.pathname.endsWith('/admin/login.html')) {
            location.href = `/admin/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
            throw new Error(data.error || 'กรุณาเข้าสู่ระบบ');
        }
        if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
        return data;
    },
    get: (url) => API.request('GET', url),
    post: (url, body) => API.request('POST', url, body),
    put: (url, body) => API.request('PUT', url, body),
    del: (url) => API.request('DELETE', url),
};

/** Escape text before putting it into innerHTML. */
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(value, withTime = true) {
    if (!value) return '-';
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

/** Value for <input type="datetime-local">. */
function toLocalInput(value) {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toast(message, type = 'success') {
    let box = document.getElementById('toast-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        box.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2';
        document.body.appendChild(box);
    }
    const colors = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
    const el = document.createElement('div');
    el.className = `${colors} text-white text-[13px] px-4 py-2.5 rounded shadow-lg max-w-sm`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 5000 : 2500);
}

/** Open a modal; returns { el, close }. `html` is trusted markup built by the page. */
function openModal(title, html, { width = 'max-w-lg' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto';
    wrap.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full ${width} mt-12">
            <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                <h3 class="font-semibold text-slate-800 text-[15px]">${esc(title)}</h3>
                <button type="button" data-close class="text-slate-400 hover:text-slate-700 w-7 h-7" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-5">${html}</div>
        </div>`;
    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => {
        if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    document.body.appendChild(wrap);
    wrap.querySelector('input, select, textarea')?.focus();
    return { el: wrap, close };
}

/** Disable a submit button while an async action runs. */
async function withBusy(button, fn) {
    const label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
        return await fn();
    } finally {
        button.disabled = false;
        button.innerHTML = label;
    }
}

/** Render page buttons into `el`; calls onPage(n) when clicked. */
function renderPager(el, { page, pageSize, total }, onPage) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (pages <= 1) {
        el.innerHTML = '';
        return;
    }
    const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages);
    const btn = (n, label, disabled, active) =>
        `<button type="button" data-page="${n}" ${disabled ? 'disabled' : ''}
            class="min-w-[30px] h-[30px] px-2 rounded text-[12px] border ${active ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-600 hover:border-primary'} disabled:opacity-40">${label}</button>`;
    let html = btn(page - 1, '<i class="fa-solid fa-chevron-left text-[10px]"></i>', page === 1);
    nums.forEach((n, i) => {
        if (i && n - nums[i - 1] > 1) html += '<span class="px-1 text-slate-400">…</span>';
        html += btn(n, n, false, n === page);
    });
    html += btn(page + 1, '<i class="fa-solid fa-chevron-right text-[10px]"></i>', page === pages);
    el.innerHTML = html;
    el.onclick = (e) => {
        const b = e.target.closest('[data-page]');
        if (b && !b.disabled) onPage(Number(b.dataset.page));
    };
}

const ROLE_LABEL = { admin: 'ผู้ดูแลระบบ', editor: 'ผู้โพสต์', user: 'ผู้ใช้ทั่วไป' };
const STATUS_LABEL = { draft: 'ร่าง', published: 'เผยแพร่', hidden: 'ซ่อน' };
const STATUS_BADGE = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-emerald-50 text-emerald-700',
    hidden: 'bg-amber-50 text-amber-700',
};
const SIDE_LABEL = { 1: 'กลาง (ข่าวหน้าแรก)', 2: 'ซ้าย', 3: 'ขวา' };
