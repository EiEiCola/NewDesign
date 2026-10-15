/*
 * Categories: one tab per side (left / center / right), drag & drop to reorder.
 * Main categories are sorted within their side, sub categories within their main category.
 */
adminReady.then(() => {
    const RIGHT = 3;
    const SIDES = [
        { side: 2, label: 'ซ้าย', icon: 'fa-align-left', hint: 'เมนู <b>Document</b> ใน sidebar ซ้ายของหน้าเว็บ' },
        { side: 1, label: 'กลาง', icon: 'fa-newspaper', hint: 'โพสต์ในหมวดนี้ขึ้น<b>ข่าวด้านบนหน้าแรก</b> (carousel)' },
        { side: 3, label: 'ขวา', icon: 'fa-server', hint: 'เมนู <b>System Online</b> ใน sidebar ขวา · หมวดหมู่หลักหรือรองเป็น<b>ลิงก์ไปเว็บอื่น</b>ได้' },
    ];

    const listEl = document.getElementById('main-list');
    const tabsEl = document.getElementById('side-tabs');
    let categories = [];
    let sortables = [];

    // Per-viewer UI state (tab + collapsed cards); storage may be unavailable, so never rely on it
    const store = {
        get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
        set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
    };
    let activeSide = SIDES.some((x) => x.side === store.get('categories.tab')) ? store.get('categories.tab') : 2;
    const collapsed = new Set(store.get('categories.collapsed', []));

    async function load() {
        try {
            ({ categories } = await API.get('/api/categories'));
            render();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    function setTab(side) {
        activeSide = side;
        store.set('categories.tab', side);
        render();
    }

    const activeBadge = (on) => (on ? '' : '<span class="text-[10px] text-red-500 bg-red-50 border border-red-200 rounded px-1.5">ปิดใช้งาน</span>');
    const linkLine = (url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-blue-600 hover:underline truncate block">${esc(url)}</a>`;
    const handle = (cls, title) => `<span class="${cls} cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 touch-none" title="${title}"><i class="fa-solid fa-grip-vertical"></i></span>`;

    function render() {
        tabsEl.innerHTML = SIDES.map((x) => {
            const n = categories.filter((m) => m.side === x.side).length;
            const on = x.side === activeSide;
            return `
                <button type="button" role="tab" aria-selected="${on}" data-tab="${x.side}"
                    class="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${on ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}">
                    <i class="fa-solid ${x.icon} text-xs"></i>${x.label}
                    <span class="text-[11px] rounded-full px-1.5 ${on ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}">${n}</span>
                </button>`;
        }).join('');
        document.getElementById('side-hint').innerHTML = SIDES.find((x) => x.side === activeSide).hint;

        const mains = categories.filter((m) => m.side === activeSide).sort((a, b) => a.sort_order - b.sort_order || a.mc_id - b.mc_id);
        listEl.innerHTML = mains.length
            ? mains.map(mainCard).join('')
            : '<p class="text-[13px] text-slate-400 border border-dashed border-slate-300 rounded-lg p-6 text-center">ยังไม่มีหมวดหมู่ในตำแหน่งนี้</p>';
        initSortable();
    }

    function mainCard(m) {
        const isLink = m.side === RIGHT && m.link_url;
        const open = !collapsed.has(m.mc_id);
        const subs = [...m.subs].sort((a, b) => a.sort_order - b.sort_order || a.sc_id - b.sc_id);
        return `
            <div class="border border-slate-200 rounded-lg bg-white ${m.is_active ? '' : 'opacity-60'}" data-mc="${m.mc_id}">
                <div class="flex items-center gap-2 pl-1 pr-2 py-2 bg-slate-50 rounded-t-lg ${open && !isLink ? 'border-b border-slate-100' : 'rounded-b-lg'}">
                    ${handle('drag-main', 'ลากเพื่อเรียงหมวดหมู่หลัก')}
                    ${isLink ? '<span class="w-5"></span>' : `
                    <button type="button" class="w-5 text-slate-400 hover:text-slate-700" data-toggle="${m.mc_id}" title="${open ? 'ย่อ' : 'ขยาย'}">
                        <i class="fa-solid fa-chevron-${open ? 'down' : 'right'} text-[10px]"></i>
                    </button>`}
                    <i class="fa-solid ${isLink ? 'fa-arrow-up-right-from-square text-blue-500' : open ? 'fa-folder-open text-yellow-500' : 'fa-folder text-yellow-500'}"></i>
                    <span class="flex-1 min-w-0">
                        <span class="font-semibold text-slate-800 text-[14px] truncate block">${esc(m.name)}</span>
                        ${isLink ? linkLine(m.link_url) : ''}
                    </span>
                    ${isLink ? '' : `<span class="text-[11px] text-slate-400 whitespace-nowrap">${m.subs.length} หมวดรอง</span>`}
                    ${activeBadge(m.is_active)}
                    <button type="button" class="btn btn-ghost !px-2" title="แก้ไข" data-edit-main="${m.mc_id}"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="btn btn-danger !px-2" title="ลบ" data-del-main="${m.mc_id}"><i class="fa-solid fa-trash"></i></button>
                </div>
                ${isLink || !open ? '' : `
                <ul class="divide-y divide-slate-50" data-sub-list="${m.mc_id}">
                    ${subs.map((s) => {
                        const subLink = m.side === RIGHT && s.link_url;
                        return `
                        <li class="flex items-center gap-2 pl-8 pr-3 py-1.5 text-[13px] bg-white ${s.is_active ? '' : 'opacity-50'}" data-sc="${s.sc_id}">
                            ${handle('drag-sub', 'ลากเพื่อเรียงหมวดหมู่รอง')}
                            <i class="${subLink ? 'fa-solid fa-link text-blue-400 text-[10px]' : 'fa-regular fa-file-lines text-slate-400 text-xs'}"></i>
                            <span class="flex-1 min-w-0"><span class="truncate block">${esc(s.name)}</span>${subLink ? linkLine(s.link_url) : ''}</span>
                            <span class="text-[11px] text-slate-400 whitespace-nowrap">${subLink ? 'ลิงก์' : `${s.content_count} โพสต์`}</span>
                            ${activeBadge(s.is_active)}
                            <button type="button" class="text-slate-400 hover:text-primary w-6" title="แก้ไข" data-edit-sub="${s.sc_id}"><i class="fa-solid fa-pen text-[11px]"></i></button>
                            <button type="button" class="text-slate-400 hover:text-red-600 w-6" title="ลบ" data-del-sub="${s.sc_id}"><i class="fa-solid fa-trash text-[11px]"></i></button>
                        </li>`;
                    }).join('')}
                </ul>
                <div class="pl-14 pr-3 py-2 border-t border-slate-50">
                    <button type="button" class="text-[12px] text-primary hover:underline" data-add-sub="${m.mc_id}"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่มหมวดหมู่รอง</button>
                </div>`}
            </div>`;
    }

    /* ---------------- Drag & drop ---------------- */

    function initSortable() {
        sortables.forEach((x) => x.destroy());
        sortables = [];
        if (typeof Sortable === 'undefined') return; // CDN blocked: list still works, just no dragging
        const options = { animation: 150, ghostClass: 'opacity-40' };

        sortables.push(Sortable.create(listEl, {
            ...options,
            handle: '.drag-main',
            draggable: '[data-mc]',
            onEnd: (e) => {
                if (e.oldIndex === e.newIndex) return;
                const order = [...listEl.querySelectorAll(':scope > [data-mc]')].map((el) => Number(el.dataset.mc));
                saveOrder('/api/categories/main/order', { side: activeSide, order }, () => {
                    order.forEach((id, i) => { categories.find((m) => m.mc_id === id).sort_order = i + 1; });
                });
            },
        }));

        listEl.querySelectorAll('[data-sub-list]').forEach((ul) => {
            sortables.push(Sortable.create(ul, {
                ...options,
                handle: '.drag-sub',
                draggable: '[data-sc]',
                onEnd: (e) => {
                    if (e.oldIndex === e.newIndex) return;
                    const mcId = Number(ul.dataset.subList);
                    const order = [...ul.querySelectorAll(':scope > [data-sc]')].map((el) => Number(el.dataset.sc));
                    saveOrder('/api/categories/sub/order', { mc_id: mcId, order }, () => {
                        const main = categories.find((m) => m.mc_id === mcId);
                        order.forEach((id, i) => { main.subs.find((s) => s.sc_id === id).sort_order = i + 1; });
                    });
                },
            }));
        });
    }

    async function saveOrder(url, body, applyLocally) {
        try {
            await API.put(url, body);
            applyLocally();
            toast('บันทึกลำดับแล้ว');
        } catch (err) {
            toast(err.message, 'error');
            load(); // put the list back the way the server has it
        }
    }

    function findSub(scId) {
        for (const m of categories) {
            const s = m.subs.find((x) => x.sc_id === scId);
            if (s) return s;
        }
        return null;
    }

    /** "Normal / link to another website" chooser; only shown for right-side categories. */
    function linkChooserHtml(url, normalLabel) {
        return `
            <div data-link-box class="border-t border-slate-100 pt-3">
                <label class="admin-label">รูปแบบ <span class="text-slate-400">(ตำแหน่งขวาเท่านั้น)</span></label>
                <div class="flex flex-wrap gap-4 text-[13px] mb-2">
                    <label class="flex items-center gap-1.5"><input type="radio" name="kind" value="normal" ${url ? '' : 'checked'}> ${normalLabel}</label>
                    <label class="flex items-center gap-1.5"><input type="radio" name="kind" value="link" ${url ? 'checked' : ''}> ลิงก์ไปเว็บอื่น</label>
                </div>
                <input name="link_url" type="url" class="admin-input" maxlength="500" placeholder="https://..." value="${esc(url || '')}">
            </div>`;
    }

    /** Returns the link to save (null when "normal" is chosen or the box is hidden). */
    function readLinkChooser(form) {
        const box = form.querySelector('[data-link-box]');
        if (!box || box.hidden || form.kind.value !== 'link') return null;
        return form.link_url.value.trim() || null;
    }

    function mainModal(m) {
        const isNew = !m;
        m = m || { name: '', side: activeSide, is_active: true, link_url: null };
        const { el, close } = openModal(isNew ? 'เพิ่มหมวดหมู่' : 'แก้ไขหมวดหมู่หลัก', `
            <form class="space-y-3" novalidate>
                <div><label class="admin-label">ชื่อหมวดหมู่หลัก *</label><input name="name" class="admin-input" maxlength="200" value="${esc(m.name)}"></div>
                <div><label class="admin-label">ตำแหน่ง</label>
                    <select name="side" class="admin-input">${SIDES.map((x) => `<option value="${x.side}" ${x.side === m.side ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
                </div>
                <label class="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" ${m.is_active ? 'checked' : ''}> เปิดใช้งาน</label>
                ${linkChooserHtml(m.link_url, 'มีหมวดหมู่รอง')}
                ${isNew ? `
                <div data-subs-box class="border-t border-slate-100 pt-3">
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
                <input data-sub-link type="url" class="admin-input" maxlength="500" placeholder="ลิงก์ (ถ้ามี) https://..." ${Number(form.side.value) === RIGHT ? '' : 'hidden'}>
                <button type="button" data-remove-row class="text-slate-400 hover:text-red-600 w-6" title="เอาออก"><i class="fa-solid fa-xmark"></i></button>`;
            subsEl.appendChild(row);
            return row.querySelector('input');
        }

        // Link options exist only on the right side; a main category that is a link has no sub categories
        const linkBox = el.querySelector('[data-link-box]');
        const subsBox = el.querySelector('[data-subs-box]');
        function syncKind() {
            const right = Number(form.side.value) === RIGHT;
            linkBox.hidden = !right;
            const isLink = right && form.kind.value === 'link';
            form.link_url.hidden = !isLink;
            if (subsBox) subsBox.hidden = isLink;
            el.querySelectorAll('[data-sub-link]').forEach((i) => { i.hidden = !right; });
        }
        form.side.addEventListener('change', syncKind);
        form.addEventListener('change', (e) => { if (e.target.name === 'kind') syncKind(); });

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
                if (e.key !== 'Enter' || !e.target.matches('[data-sub-name], [data-sub-link]')) return;
                e.preventDefault();
                const next = e.target.parentElement.nextElementSibling;
                (next ? next.querySelector('[data-sub-name]') : addSubRow()).focus();
            });
        }
        syncKind();

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                name: form.name.value,
                side: Number(form.side.value),
                is_active: form.is_active.checked,
                link_url: readLinkChooser(form),
            };
            // Order comes from drag & drop: keep it, or go to the end when added / moved to another side
            data.sort_order = !isNew && data.side === m.side ? m.sort_order : nextOrder(categories.filter((x) => x.side === data.side));
            if (!linkBox.hidden && form.kind.value === 'link' && !data.link_url) return toast('กรุณากรอกลิงก์', 'error');
            if (subsEl && !data.link_url) {
                data.subs = [...subsEl.children]
                    .map((row) => ({
                        name: row.querySelector('[data-sub-name]').value.trim(),
                        link_url: data.side === RIGHT ? row.querySelector('[data-sub-link]').value.trim() || null : null,
                    }))
                    .filter((x) => x.name);
            }
            if (data.side !== activeSide) setTab(data.side); // show where it went
            save(form, close, () => (isNew ? API.post('/api/categories/main', data) : API.put(`/api/categories/main/${m.mc_id}`, data)));
        });
    }

    function subModal(s, mcId) {
        const isNew = !s;
        s = s || { name: '', mc_id: mcId, is_active: true, link_url: null };
        const { el, close } = openModal(isNew ? 'เพิ่มหมวดหมู่รอง' : 'แก้ไขหมวดหมู่รอง', `
            <form class="space-y-3" novalidate>
                <div><label class="admin-label">อยู่ในหมวดหมู่หลัก</label>
                    <select name="mc_id" class="admin-input">${SIDES.map((x) => `
                        <optgroup label="${x.label}">${categories.filter((m) => m.side === x.side && !(m.side === RIGHT && m.link_url)).map((m) => `<option value="${m.mc_id}" ${m.mc_id === s.mc_id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</optgroup>`).join('')}</select>
                </div>
                <div><label class="admin-label">ชื่อหมวดหมู่รอง *</label><input name="name" class="admin-input" maxlength="200" value="${esc(s.name)}"></div>
                <label class="flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" ${s.is_active ? 'checked' : ''}> เปิดใช้งาน</label>
                ${linkChooserHtml(s.link_url, 'รายการโพสต์ (ปกติ)')}
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-ghost" data-close>ยกเลิก</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button>
                </div>
            </form>`);
        const form = el.querySelector('form');
        const linkBox = el.querySelector('[data-link-box]');
        function syncKind() {
            const main = categories.find((m) => m.mc_id === Number(form.mc_id.value));
            linkBox.hidden = !main || main.side !== RIGHT;
            form.link_url.hidden = form.kind.value !== 'link';
        }
        form.mc_id.addEventListener('change', syncKind);
        form.addEventListener('change', (e) => { if (e.target.name === 'kind') syncKind(); });
        syncKind();
        form.name.focus();
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                mc_id: Number(form.mc_id.value),
                name: form.name.value,
                is_active: form.is_active.checked,
                link_url: readLinkChooser(form),
            };
            const target = categories.find((m) => m.mc_id === data.mc_id);
            data.sort_order = !isNew && data.mc_id === s.mc_id ? s.sort_order : nextOrder(target ? target.subs : []);
            if (!linkBox.hidden && form.kind.value === 'link' && !data.link_url) return toast('กรุณากรอกลิงก์', 'error');
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

    function setCollapsed(ids, on) {
        ids.forEach((id) => (on ? collapsed.add(id) : collapsed.delete(id)));
        store.set('categories.collapsed', [...collapsed]);
        render();
    }

    document.getElementById('btn-add-main').addEventListener('click', () => mainModal());
    const idsOnTab = () => categories.filter((m) => m.side === activeSide).map((m) => m.mc_id);
    document.getElementById('btn-collapse-all').addEventListener('click', () => setCollapsed(idsOnTab(), true));
    document.getElementById('btn-expand-all').addEventListener('click', () => setCollapsed(idsOnTab(), false));

    tabsEl.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) setTab(Number(tab.dataset.tab));
    });

    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const d = btn.dataset;
        if (d.toggle) setCollapsed([Number(d.toggle)], !collapsed.has(Number(d.toggle)));
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

    render(); // tabs show right away; the list fills in after load
    load();
});
