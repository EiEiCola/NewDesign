adminReady.then(() => {
    const form = document.getElementById('filters');
    const rowsEl = document.getElementById('rows');
    let page = 1;
    let actionsLoaded = false;

    const BADGE = {
        LOGIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        LOGOUT: 'bg-slate-50 text-slate-600 border-slate-200',
        LOGIN_FAILED: 'bg-red-50 text-red-600 border-red-200',
        CREATE: 'bg-sky-50 text-sky-700 border-sky-200',
        UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
        DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
        VIEW: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    const TARGET = { user: 'User', content: 'Content', main_category: 'Main category', sub_category: 'Sub category' };

    function fullDate(value) {
        const d = new Date(value);
        const pad = (n) => String(n).padStart(2, '0');
        return `${fmtDate(value, false)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    async function load() {
        const q = new URLSearchParams({ page, pageSize: 50 });
        for (const key of ['action', 'username', 'q', 'from', 'to']) if (form[key].value.trim()) q.set(key, form[key].value.trim());
        try {
            const data = await API.get(`/api/audit-logs?${q}`);
            if (!actionsLoaded) {
                form.action.innerHTML += data.actions.map((a) => `<option value="${a}">${a}</option>`).join('');
                actionsLoaded = true;
            }
            rowsEl.innerHTML = data.items.length
                ? data.items.map((r) => `
                    <li class="px-4 py-3">
                        <div class="flex flex-wrap items-center gap-2 text-[12px]">
                            <span class="font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${BADGE[r.action] || BADGE.VIEW}">${esc(r.action)}</span>
                            <span class="font-mono text-slate-500">${fullDate(r.create_at)}</span>
                            <span class="font-mono text-slate-400">${esc(r.username || '-')}</span>
                        </div>
                        <div class="text-[13px] text-slate-800 mt-1">${esc(r.message)}</div>
                        <div class="font-mono text-[11px] text-slate-400 mt-0.5">
                            ${r.target_type ? `${esc(TARGET[r.target_type] || r.target_type)}${r.target_id ? ` #${esc(r.target_id)}` : ''} · ` : ''}${esc(r.ip_address || '-')}
                        </div>
                    </li>`).join('')
                : '<li class="px-4 py-10 text-center text-[13px] text-slate-400">ไม่พบรายการ</li>';
            document.getElementById('count').textContent = `ทั้งหมด ${data.total} รายการ`;
            renderPager(document.getElementById('pager'), data, (n) => { page = n; load(); });
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    let timer;
    form.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { page = 1; load(); }, 300);
    });
    form.addEventListener('reset', () => setTimeout(() => { page = 1; load(); }));
    form.addEventListener('submit', (e) => e.preventDefault());

    load();
});
