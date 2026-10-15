adminReady.then(async () => {
    const form = document.getElementById('content-form');
    const editor = document.getElementById('editor');
    const saveBtn = document.getElementById('btn-save');
    let cId = Number(new URLSearchParams(location.search).get('id')) || null;
    let media = [];
    let dirty = false;
    let savedRange = null;

    /* ---------------- Load ---------------- */

    try {
        const { categories } = await API.get('/api/categories');
        form.sc_id.innerHTML += categories
            .filter((m) => m.subs.length)
            .map((m) => `
                <optgroup label="${esc(m.name)} (${esc(SIDE_LABEL[m.side])})">
                    ${m.subs.map((s) => `<option value="${s.sc_id}" ${s.is_active && m.is_active ? '' : 'class="text-slate-400"'}>${esc(s.name)}${s.is_active && m.is_active ? '' : ' (ปิดใช้งาน)'}</option>`).join('')}
                </optgroup>`).join('');
    } catch (err) {
        toast(err.message, 'error');
    }

    if (cId) {
        try {
            const data = await API.get(`/api/contents/${cId}`);
            fill(data.content);
            media = data.media;
            renderMedia();
        } catch (err) {
            toast(err.message, 'error');
            cId = null;
        }
    }
    updateHeader();

    function fill(c) {
        form.title.value = c.title;
        editor.innerHTML = c.body || '';
        form.sc_id.value = c.sc_id;
        form.status.value = c.status;
        form.publish_at.value = toLocalInput(c.publish_at);
        form.expire_at.value = toLocalInput(c.expire_at);
        form.is_pinned.checked = c.is_pinned;
        document.getElementById('meta').innerHTML = `
            <div>สร้างเมื่อ ${fmtDate(c.create_at)}</div>
            ${c.update_at ? `<div>แก้ไขล่าสุด ${fmtDate(c.update_at)}</div>` : ''}
            <div>เข้าชม ${c.view_count} ครั้ง</div>`;
    }

    function updateHeader() {
        document.getElementById('page-title').textContent = cId ? 'แก้ไขโพสต์' : 'สร้างโพสต์';
        document.title = `${cId ? 'แก้ไขโพสต์' : 'สร้างโพสต์'} | Intranet CMS`;
        document.getElementById('btn-delete').classList.toggle('hidden', !cId);
        document.getElementById('media-hint').classList.toggle('hidden', !!cId);
        const view = document.getElementById('view-link');
        view.classList.toggle('hidden', !(cId && form.status.value === 'published'));
        view.href = `/content.html?id=${cId}`;
    }

    /* ---------------- Save ---------------- */

    function payload() {
        return {
            title: form.title.value,
            body: editor.innerHTML,
            sc_id: Number(form.sc_id.value) || null,
            status: form.status.value,
            publish_at: form.publish_at.value || null,
            expire_at: form.expire_at.value || null,
            is_pinned: form.is_pinned.checked,
        };
    }

    async function save({ silent = false } = {}) {
        const data = payload();
        if (!data.title.trim()) throw new Error('กรุณากรอกหัวข้อ');
        if (!data.sc_id) throw new Error('กรุณาเลือกหมวดหมู่');

        if (cId) {
            await API.put(`/api/contents/${cId}`, data);
        } else {
            ({ c_id: cId } = await API.post('/api/contents', data));
            history.replaceState(null, '', `?id=${cId}`);
        }
        dirty = false;
        updateHeader();
        if (!silent) toast('บันทึกแล้ว');
    }

    /** Media needs a c_id: save the post (as it is in the form) the first time a file is added. */
    async function ensureSaved() {
        if (cId) return;
        await save({ silent: true });
        toast('บันทึกโพสต์เป็นร่างแล้ว');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await withBusy(saveBtn, async () => {
            try {
                await save();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    });

    // Ctrl+S saves
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (!confirm(`ลบโพสต์ "${form.title.value}" ?`)) return;
        try {
            await API.del(`/api/contents/${cId}`);
            dirty = false;
            location.href = 'contents.html';
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    form.addEventListener('input', () => { dirty = true; });
    editor.addEventListener('input', () => { dirty = true; });
    form.status.addEventListener('change', updateHeader);
    window.addEventListener('beforeunload', (e) => {
        if (dirty) e.preventDefault();
    });

    /* ---------------- Editor ---------------- */

    function rememberSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
    }

    function restoreSelection() {
        editor.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        if (savedRange) {
            sel.addRange(savedRange);
        } else {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false); // end of the content
            sel.addRange(range);
        }
    }

    editor.addEventListener('keyup', rememberSelection);
    editor.addEventListener('mouseup', rememberSelection);
    editor.addEventListener('blur', rememberSelection);

    // Paste as plain text so formatting from Word / web pages does not mess up the layout
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });

    const toolbar = document.getElementById('toolbar');
    toolbar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) e.preventDefault(); // keep the text selection in the editor
    });
    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.cmd) document.execCommand(btn.dataset.cmd, false, null);
        if (btn.dataset.block) document.execCommand('formatBlock', false, `<${btn.dataset.block}>`);
        dirty = true;
    });

    document.getElementById('btn-link').addEventListener('click', () => {
        rememberSelection();
        const url = prompt('ใส่ลิงก์ (https://...)', 'https://');
        if (!url || url === 'https://') return;
        if (!/^(https?:\/\/|mailto:)/i.test(url)) return toast('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 'error');
        restoreSelection();
        document.execCommand('createLink', false, url);
        dirty = true;
    });

    const inlineFile = document.getElementById('inline-file');
    document.getElementById('btn-inline-image').addEventListener('click', () => {
        rememberSelection();
        inlineFile.click();
    });
    inlineFile.addEventListener('change', async () => {
        const file = inlineFile.files[0];
        inlineFile.value = '';
        if (!file) return;
        try {
            const [row] = await upload('inline', [file]);
            restoreSelection();
            document.execCommand('insertHTML', false, `<img src="${esc(row.file_path)}" alt="${esc(row.original_name)}"><p><br></p>`);
            dirty = true;
            toast('แทรกรูปแล้ว กดบันทึกเพื่อบันทึกเนื้อหา');
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    /* ---------------- Media ---------------- */

    async function upload(kind, files) {
        await ensureSaved();
        const fd = new FormData();
        fd.append('kind', kind); // must come before the files (read by the server's file filter)
        for (const f of files) fd.append('files', f);
        const { media: rows } = await API.post(`/api/contents/${cId}/media`, fd);
        if (kind === 'header') media = media.filter((m) => m.kind !== 'header');
        media.push(...rows);
        renderMedia();
        return rows;
    }

    document.querySelectorAll('#media-panel input[type=file][data-kind]').forEach((input) => {
        input.addEventListener('change', async () => {
            const files = [...input.files];
            input.value = '';
            if (!files.length) return;
            const label = input.closest('label');
            label.classList.add('opacity-50', 'pointer-events-none');
            try {
                await upload(input.dataset.kind, files);
                toast(`อัปโหลด ${files.length} ไฟล์แล้ว`);
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                label.classList.remove('opacity-50', 'pointer-events-none');
            }
        });
    });

    const byKind = (kind) => media.filter((m) => m.kind === kind).sort((a, b) => a.sort_order - b.sort_order);

    function renderMedia() {
        const header = byKind('header')[0];
        document.getElementById('media-header').innerHTML = header
            ? `<div class="relative group max-w-md">
                   <img src="${esc(header.file_path)}" alt="" class="w-full h-40 object-cover rounded border border-slate-200">
                   <button type="button" data-del-media="${header.cm_id}" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-600 shadow" title="ลบ"><i class="fa-solid fa-trash text-xs"></i></button>
               </div>`
            : '<p class="text-[12px] text-slate-400">ยังไม่มีรูปปก (ใช้แสดงในรายการข่าวและข่าวหน้าแรก)</p>';

        const gallery = byKind('gallery');
        document.getElementById('media-gallery').innerHTML = gallery.length
            ? gallery.map((m, i) => `
                <div class="relative border border-slate-200 rounded overflow-hidden">
                    <img src="${esc(m.file_path)}" alt="" class="w-full h-24 object-cover">
                    <div class="flex items-center justify-between bg-slate-50 px-1 py-0.5">
                        <span>
                            <button type="button" data-move="${m.cm_id}" data-dir="-1" class="w-6 h-6 text-slate-500 hover:text-primary disabled:opacity-30" ${i === 0 ? 'disabled' : ''} title="เลื่อนซ้าย"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                            <button type="button" data-move="${m.cm_id}" data-dir="1" class="w-6 h-6 text-slate-500 hover:text-primary disabled:opacity-30" ${i === gallery.length - 1 ? 'disabled' : ''} title="เลื่อนขวา"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
                        </span>
                        <button type="button" data-del-media="${m.cm_id}" class="w-6 h-6 text-slate-400 hover:text-red-600" title="ลบ"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                </div>`).join('')
            : '<p class="text-[12px] text-slate-400 col-span-full">ยังไม่มีรูปประกอบ</p>';

        const attachments = byKind('attachment');
        document.getElementById('media-attachment').innerHTML = attachments.length
            ? attachments.map((m) => `
                <li class="flex items-center gap-2 px-3 py-2 text-[13px]">
                    <i class="fa-regular fa-file text-slate-400"></i>
                    <a href="${esc(m.file_path)}" target="_blank" class="flex-1 min-w-0 truncate hover:text-primary">${esc(m.original_name)}</a>
                    <span class="text-[11px] text-slate-400">${fmtSize(m.file_size)}</span>
                    <button type="button" data-del-media="${m.cm_id}" class="w-6 h-6 text-slate-400 hover:text-red-600" title="ลบ"><i class="fa-solid fa-trash text-[11px]"></i></button>
                </li>`).join('')
            : '<li class="px-3 py-2 text-[12px] text-slate-400">ยังไม่มีไฟล์แนบ</li>';
    }

    document.getElementById('media-panel').addEventListener('click', async (e) => {
        const del = e.target.closest('[data-del-media]');
        const move = e.target.closest('[data-move]');

        if (del) {
            const m = media.find((x) => x.cm_id === Number(del.dataset.delMedia));
            if (!confirm(`ลบ "${m.original_name}" ?`)) return;
            try {
                await API.del(`/api/contents/${cId}/media/${m.cm_id}`);
                media = media.filter((x) => x.cm_id !== m.cm_id);
                renderMedia();
                toast('ลบไฟล์แล้ว');
            } catch (err) {
                toast(err.message, 'error');
            }
        }

        if (move) {
            const gallery = byKind('gallery');
            const i = gallery.findIndex((x) => x.cm_id === Number(move.dataset.move));
            const j = i + Number(move.dataset.dir);
            [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
            gallery.forEach((g, k) => { g.sort_order = k + 1; });
            renderMedia();
            try {
                await API.put(`/api/contents/${cId}/media/order`, { order: gallery.map((g) => g.cm_id) });
            } catch (err) {
                toast(err.message, 'error');
            }
        }
    });

    renderMedia();
});
