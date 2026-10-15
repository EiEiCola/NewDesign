adminReady.then(async (me) => {
    const rowsEl = document.getElementById('rows');
    const search = document.getElementById('search');
    let roles = [];
    let users = [];

    const ROLE_BADGE = {
        admin: 'bg-purple-50 text-purple-700',
        editor: 'bg-sky-50 text-sky-700',
        user: 'bg-slate-100 text-slate-600',
    };

    async function load() {
        try {
            const q = search.value.trim();
            ({ users } = await API.get(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`));
            render();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    function render() {
        if (!users.length) {
            rowsEl.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-slate-400">ไม่พบผู้ใช้</td></tr>';
            return;
        }
        rowsEl.innerHTML = users.map((u) => `
            <tr class="${u.is_active ? '' : 'opacity-50'}">
                <td class="px-4 py-2.5 font-mono text-[12px]">${esc(u.employee_id)}</td>
                <td class="px-4 py-2.5">${esc(u.first_name)} ${esc(u.last_name)}${u.uc_id === me.ucId ? ' <span class="text-[10px] text-primary">(คุณ)</span>' : ''}</td>
                <td class="px-4 py-2.5">${esc(u.username)}</td>
                <td class="px-4 py-2.5"><span class="text-[11px] px-2 py-0.5 rounded font-semibold ${ROLE_BADGE[u.role] || ''}">${esc(ROLE_LABEL[u.role] || u.role)}</span></td>
                <td class="px-4 py-2.5 text-[12px]">${u.is_active ? '<span class="text-emerald-600">ใช้งาน</span>' : '<span class="text-red-500">ระงับ</span>'}</td>
                <td class="px-4 py-2.5 text-[12px] text-slate-500">${fmtDate(u.last_login_at)}</td>
                <td class="px-4 py-2.5 text-right whitespace-nowrap">
                    <button type="button" class="btn btn-ghost" data-edit="${u.uc_id}"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                    <button type="button" class="btn btn-ghost" data-password="${u.uc_id}"><i class="fa-solid fa-key"></i> รหัสผ่าน</button>
                </td>
            </tr>`).join('');
    }

    function roleOptions(selected) {
        return roles.map((r) => `<option value="${r.r_id}" ${r.r_id === selected ? 'selected' : ''}>${esc(ROLE_LABEL[r.name] || r.name)}</option>`).join('');
    }

    function userForm(u = {}) {
        const isNew = !u.uc_id;
        const isSelf = u.uc_id === me.ucId;
        const editorRole = roles.find((r) => r.name === 'editor');
        return `
            <form class="space-y-3" novalidate>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="admin-label">รหัสพนักงาน *</label><input name="employee_id" class="admin-input" maxlength="20" value="${esc(u.employee_id)}" required></div>
                    <div><label class="admin-label">สิทธิ์ *</label><select name="r_id" class="admin-input" ${isSelf ? 'disabled' : ''}>${roleOptions(u.r_id ?? editorRole?.r_id)}</select></div>
                    <div><label class="admin-label">ชื่อ *</label><input name="first_name" class="admin-input" maxlength="100" value="${esc(u.first_name)}" required></div>
                    <div><label class="admin-label">นามสกุล *</label><input name="last_name" class="admin-input" maxlength="100" value="${esc(u.last_name)}" required></div>
                </div>
                ${isNew ? `
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="admin-label">Username *</label><input name="username" class="admin-input" maxlength="50" autocomplete="off" required></div>
                    <div><label class="admin-label">รหัสผ่าน * (อย่างน้อย 8 ตัว)</label><input name="password" type="password" class="admin-input" autocomplete="new-password" required></div>
                </div>` : `
                <label class="flex items-center gap-2 text-[13px] ${isSelf ? 'opacity-50' : ''}">
                    <input type="checkbox" name="is_active" ${u.is_active ? 'checked' : ''} ${isSelf ? 'disabled' : ''}> เปิดใช้งานบัญชี
                </label>
                ${isSelf ? '<p class="text-[11px] text-slate-400">ไม่สามารถเปลี่ยนสิทธิ์หรือระงับบัญชีของตัวเองได้</p>' : ''}`}
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-ghost" data-close>ยกเลิก</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button>
                </div>
            </form>`;
    }

    function openUserModal(u) {
        const isNew = !u;
        const { el, close } = openModal(isNew ? 'เพิ่มผู้ใช้' : `แก้ไขผู้ใช้: ${u.username}`, userForm(u));
        const form = el.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                employee_id: form.employee_id.value,
                first_name: form.first_name.value,
                last_name: form.last_name.value,
                r_id: Number(form.r_id.value),
            };
            await withBusy(form.querySelector('[type=submit]'), async () => {
                try {
                    if (isNew) {
                        await API.post('/api/users', { ...data, username: form.username.value, password: form.password.value });
                        toast('เพิ่มผู้ใช้แล้ว');
                    } else {
                        await API.put(`/api/users/${u.uc_id}`, { ...data, is_active: form.is_active.checked });
                        toast('บันทึกแล้ว');
                    }
                    close();
                    load();
                } catch (err) {
                    toast(err.message, 'error');
                }
            });
        });
    }

    function openPasswordModal(u) {
        const { el, close } = openModal(`ตั้งรหัสผ่านใหม่: ${u.username}`, `
            <form class="space-y-3" novalidate>
                <div><label class="admin-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input name="password" type="password" class="admin-input" autocomplete="new-password"></div>
                <div><label class="admin-label">ยืนยันรหัสผ่าน</label><input name="confirm" type="password" class="admin-input" autocomplete="new-password"></div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="btn btn-ghost" data-close>ยกเลิก</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-key"></i> ตั้งรหัสผ่าน</button>
                </div>
            </form>`);
        const form = el.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (form.password.value !== form.confirm.value) return toast('รหัสผ่านไม่ตรงกัน', 'error');
            await withBusy(form.querySelector('[type=submit]'), async () => {
                try {
                    await API.put(`/api/users/${u.uc_id}/password`, { password: form.password.value });
                    toast('ตั้งรหัสผ่านใหม่แล้ว');
                    close();
                } catch (err) {
                    toast(err.message, 'error');
                }
            });
        });
    }

    document.getElementById('btn-add').addEventListener('click', () => openUserModal());
    rowsEl.addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        const pw = e.target.closest('[data-password]');
        if (edit) openUserModal(users.find((u) => u.uc_id === Number(edit.dataset.edit)));
        if (pw) openPasswordModal(users.find((u) => u.uc_id === Number(pw.dataset.password)));
    });

    let timer;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(load, 300);
    });

    try {
        ({ roles } = await API.get('/api/users/roles'));
    } catch (err) {
        toast(err.message, 'error');
    }
    load();
});
