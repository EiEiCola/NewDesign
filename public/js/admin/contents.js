adminReady.then(async (user) => {
    const form = document.getElementById('filters');
    const rowsEl = document.getElementById('rows');
    let page = 1;

    if (user.role !== 'admin') document.getElementById('page-title').textContent = 'โพสต์ของฉัน';

    // Initial filters from the URL (e.g. links from the dashboard)
    const params = new URLSearchParams(location.search);
    form.status.value = params.get('status') || '';

    /** "Visible now?" hint next to a published post's status. */
    function scheduleNote(c) {
        if (c.status !== 'published') return '';
        const now = Date.now();
        if (c.publish_at && new Date(c.publish_at) > now) return '<div class="text-[10px] text-sky-600">รอเผยแพร่</div>';
        if (c.expire_at && new Date(c.expire_at) <= now) return '<div class="text-[10px] text-red-500">หมดอายุแล้ว</div>';
        return '';
    }

    async function load() {
        const q = new URLSearchParams({ page, pageSize: 20 });
        for (const key of ['q', 'sc_id', 'status']) if (form[key].value.trim()) q.set(key, form[key].value.trim());
        try {
            const data = await API.get(`/api/contents?${q}`);
            rowsEl.innerHTML = data.items.length
                ? data.items.map((c) => `
                    <tr>
                        <td class="px-4 py-2.5 max-w-[320px]">
                            <a href="content-edit.html?id=${c.c_id}" class="font-medium text-slate-800 hover:text-primary line-clamp-2">
                                ${c.is_pinned ? '<i class="fa-solid fa-thumbtack text-[10px] text-primary mr-1" title="ปักหมุด"></i>' : ''}${esc(c.title)}
                            </a>
                        </td>
                        <td class="px-4 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">${esc(c.main_name)} › ${esc(c.sub_name)}</td>
                        <td class="px-4 py-2.5"><span class="text-[11px] px-2 py-0.5 rounded font-semibold ${STATUS_BADGE[c.status]}">${STATUS_LABEL[c.status]}</span>${scheduleNote(c)}</td>
                        <td class="px-4 py-2.5 text-[12px]">${esc(c.author)}</td>
                        <td class="px-4 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">${fmtDate(c.publish_at || c.create_at)}</td>
                        <td class="px-4 py-2.5 text-right text-[12px]">${c.view_count}</td>
                        <td class="px-4 py-2.5 text-right whitespace-nowrap">
                            ${c.status === 'published' ? `<a href="/content.html?id=${c.c_id}" target="_blank" class="btn btn-ghost !px-2" title="ดูหน้าเว็บ"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
                            <a href="content-edit.html?id=${c.c_id}" class="btn btn-ghost !px-2" title="แก้ไข"><i class="fa-solid fa-pen"></i></a>
                            <button type="button" class="btn btn-danger !px-2" title="ลบ" data-del="${c.c_id}" data-title="${esc(c.title)}"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>`).join('')
                : '<tr><td colspan="7" class="px-4 py-10 text-center text-slate-400">ไม่พบโพสต์</td></tr>';
            document.getElementById('count').textContent = `ทั้งหมด ${data.total} รายการ`;
            renderPager(document.getElementById('pager'), data, (n) => { page = n; load(); });
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    rowsEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-del]');
        if (!btn || !confirm(`ลบโพสต์ "${btn.dataset.title}" ?`)) return;
        try {
            await API.del(`/api/contents/${btn.dataset.del}`);
            toast('ลบโพสต์แล้ว');
            load();
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    let timer;
    form.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { page = 1; load(); }, 300);
    });
    form.addEventListener('submit', (e) => e.preventDefault());

    try {
        const { categories } = await API.get('/api/categories');
        form.sc_id.innerHTML += categories.map((m) => `
            <optgroup label="${esc(m.name)}">
                ${m.subs.map((s) => `<option value="${s.sc_id}">${esc(s.name)}</option>`).join('')}
            </optgroup>`).join('');
    } catch (err) {
        toast(err.message, 'error');
    }
    load();
});
