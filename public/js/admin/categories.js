adminReady.then(() => {
    const groupsEl = document.getElementById('groups');
    let categories = [];

    async function load() {
        try {
            ({ categories } = await API.get('/api/categories'));
            render();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    const activeBadge = (on) => on
        ? '<span class="text-[10px] text-emerald-600">ใช้งาน</span>'
        : '<span class="text-[10px] text-red-500">ปิดใช้งาน</span>';

    function render() {
        groupsEl.innerHTML = [2, 1, 3].map((side) => {
            const mains = categories.filter((m) => m.side === side);
            return `
                <section>
                    <h2 class="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2">ตำแหน่ง: ${SIDE_LABEL[side]}</h2>
                    ${mains.length ? '' : '<p class="text-[13px] text-slate-400 bg-white border border-dashed border-slate-300 rounded-lg p-4">ยังไม่มีหมวดหมู่ในตำแหน่งนี้</p>'}
                    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">${mains.map(mainCard).join('')}</div>
                </section>`;
        }).join('');
    }

    function mainCard(m) {
        return `
            <div class="bg-white border border-slate-200 rounded-lg ${m.is_active ? '' : 'opacity-60'}">
                <div class="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                    <i class="fa-solid fa-folder text-yellow-500"></i>
                    <span class="font-semibold text-slate-800 text-[14px] flex-1 min-w-0 truncate">${esc(m.name)}</span>
                    <span class="text-[11px] text-slate-400">ลำดับ ${m.sort_order}</span>
                    ${activeBadge(m.is_active)}
                    <button type="button" class="btn btn-ghost !px-2" title="แก้ไข" data-edit-main="${m.mc_id}"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-danger !px-2" title="ลบ" data-del-main="${m.mc_id}"><i class="fa-solid fa-trash"></i></button>
                </div>
                <ul class="divide-y divide-slate-50">
                    ${m.subs.map((s) => `
                        <li class="flex items-center gap-2 pl-10 pr-4 py-1.5 text-[13px] ${s.is_active ? '' : 'opacity-50'}">
                            <i class="fa-regular fa-file-lines text-slate-400 text-xs"></i>
                            <span class="flex-1 min-w-0 truncate">${esc(s.name)}</span>
                            <span class="text-[11px] text-slate-400">${s.content_count} โพสต์ · ลำดับ ${s.sort_order}</span>
                            ${activeBadge(s.is_active)}
                            <button type="button" class="text-slate-400 hover:text-primary w-6" title="แก้ไข" data-edit-sub="${s.sc_id}"><i class="fa-solid fa-pen text-[11px]"></i></button>
                            <button type="button" class="text-slate-400 hover:text-red-600 w-6" title="ลบ" data-del-sub="${s.sc_id}"><i class="fa-solid fa-trash text-[11px]"></i></button>
                        </li>`).join('')}
                    <li class="pl-10 pr-4 py-2">
                        <button type="button" class="text-[12px] text-primary hover:underline" data-add-sub="${m.mc_id}"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่มหมวดหมู่รอง</button>
                    </li>
                </ul>
            </div>`;
    }

    function findSub(scId) {
        for (const m of categories) {
            const s = m.subs.find((x) => x.sc_id === scId);
            if (s) return s;
        }
        return null;
    }

    function mainModal(m) {
        const isNew = !m;
        m = m || { name: '', side: 2, sort_order: nextOrder(categories), is_active: true };
        const { el, close } = openModal(isNew ? 'เพิ่มหมวดหมู่' : 'แก้ไขหมวดหมู่หลัก', `
            <form class="space-y-3" novalidate>
                <div><label class="admin-label">ชื่อหมวดหมู่หลัก *</label><input name="name" class="admin-input" maxlength="200" value="${esc(m.name)}"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="admin-label">ตำแหน่ง</label>
                        <select name="side" class="admin-input">${[2, 3, 1].map((s) => `<option value="${s}" ${s === m.side ? 'selected' : ''}>${SIDE_LABEL[s]}</option>`).join('')}</select>
                    </div>
                    <div><label class="admin-label">ลำดับ</label><input name="sort_order" type="number" class="admin-input" value="${m.sort_order}"></div>
                </div>
                <label class="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" ${m.is_active ? 'checked' : ''}> เปิดใช้งาน</label>
                ${isNew ? `
                <div class="border-t border-slate-100 pt-3">
                    <label class="admin-label">หมวดหมู่รอง <span class="text-slate-400">(ไม่บังคับ · เรียงลำดับตามที่กรอก)</span></label>
                    <div data-subs class="space-y-2"></div>
                    <button type="button" data-add-row class="text-[12px] text-primary hover:underline mt-2"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่มช่องหมวดหมู่รอง</button>
                </div>` : ''}
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-ghost" data-close>ยกเลิก</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button>
                </div>
            </form>`);
        const form = el.querySelector('form');
        const subsEl = el.querySelector('[data-subs]');

        function addSubRow() {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2';
            row.innerHTML = `
                <i class="fa-regular fa-file-lines text-slate-400 text-xs"></i>
                <input data-sub-name class="admin-input" maxlength="200" placeholder="ชื่อหมวดหมู่รอง">
                <button type="button" data-remove-row class="text-slate-400 hover:text-red-600 w-6" title="เอาออก"><i class="fa-solid fa-xmark"></i></button>`;
            subsEl.appendChild(row);
            return row.querySelector('input');
        }

        if (subsEl) {
            addSubRow();
            el.querySelector('[data-add-row]').addEventListener('click', () => addSubRow().focus());
            subsEl.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-remove-row]');
                if (!btn) return;
                btn.parentElement.remove();
                if (!subsEl.children.length) addSubRow();
            });
            // Enter in a sub-category box adds the next box instead of submitting
            subsEl.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' || !e.target.matches('[data-sub-name]')) return;
                e.preventDefault();
                const next = e.target.parentElement.nextElementSibling;
                (next ? next.querySelector('input') : addSubRow()).focus();
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                name: form.name.value,
                side: Number(form.side.value),
                sort_order: Number(form.sort_order.value) || 0,
                is_active: form.is_active.checked,
            };
            if (subsEl) {
                data.subs = [...subsEl.querySelectorAll('[data-sub-name]')].map((i) => i.value.trim()).filter(Boolean);
            }
            save(form, close, () => (isNew ? API.post('/api/categories/main', data) : API.put(`/api/categories/main/${m.mc_id}`, data)));
        });
    }

    function subModal(s, mcId) {
        const isNew = !s;
        const parent = categories.find((m) => m.mc_id === (s ? s.mc_id : mcId));
        s = s || { name: '', mc_id: mcId, sort_order: nextOrder(parent ? parent.subs : []), is_active: true };
        const { el, close } = openModal(isNew ? 'เพิ่มหมวดหมู่รอง' : 'แก้ไขหมวดหมู่รอง', `
            <form class="space-y-3" novalidate>
                <div><label class="admin-label">อยู่ในหมวดหมู่หลัก</label>
                    <select name="mc_id" class="admin-input">${categories.map((m) => `<option value="${m.mc_id}" ${m.mc_id === s.mc_id ? 'selected' : ''}>${esc(m.name)} (${SIDE_LABEL[m.side]})</option>`).join('')}</select>
                </div>
                <div><label class="admin-label">ชื่อหมวดหมู่รอง *</label><input name="name" class="admin-input" maxlength="200" value="${esc(s.name)}"></div>
                <div><label class="admin-label">ลำดับ</label><input name="sort_order" type="number" class="admin-input" value="${s.sort_order}"></div>
                <label class="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" ${s.is_active ? 'checked' : ''}> เปิดใช้งาน</label>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-ghost" data-close>ยกเลิก</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button>
                </div>
            </form>`);
        const form = el.querySelector('form');
        form.name.focus();
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                mc_id: Number(form.mc_id.value),
                name: form.name.value,
                sort_order: Number(form.sort_order.value) || 0,
                is_active: form.is_active.checked,
            };
            save(form, close, () => (isNew ? API.post('/api/categories/sub', data) : API.put(`/api/categories/sub/${s.sc_id}`, data)));
        });
    }

    function nextOrder(items) {
        return items.reduce((max, x) => Math.max(max, x.sort_order), 0) + 1;
    }

    async function save(form, close, request) {
        await withBusy(form.querySelector('[type=submit]'), async () => {
            try {
                await request();
                toast('บันทึกแล้ว');
                close();
                load();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    }

    async function remove(url, name) {
        if (!confirm(`ลบ "${name}" ?`)) return;
        try {
            await API.del(url);
            toast('ลบแล้ว');
            load();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    document.getElementById('btn-add-main').addEventListener('click', () => mainModal());
    groupsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const d = btn.dataset;
        if (d.editMain) mainModal(categories.find((m) => m.mc_id === Number(d.editMain)));
        if (d.delMain) {
            const m = categories.find((x) => x.mc_id === Number(d.delMain));
            remove(`/api/categories/main/${m.mc_id}`, m.name);
        }
        if (d.addSub) subModal(null, Number(d.addSub));
        if (d.editSub) subModal(findSub(Number(d.editSub)));
        if (d.delSub) {
            const s = findSub(Number(d.delSub));
            remove(`/api/categories/sub/${s.sc_id}`, s.name);
        }
    });

    load();
});
