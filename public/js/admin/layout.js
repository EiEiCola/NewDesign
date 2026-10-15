/*
 * Admin page shell: checks login, renders the side navigation, handles logout.
 * Pages wait for `adminReady` (resolves to the logged-in user) before loading data.
 * <body data-page="users" data-role="admin"> restricts a page to admins.
 */
const adminReady = (async function () {
    let user;
    try {
        ({ user } = await API.get('/api/auth/me'));
    } catch {
        return new Promise(() => {}); // API.request already redirects to the login page
    }

    const page = document.body.dataset.page;
    const adminOnly = document.body.dataset.role === 'admin';
    const isAdmin = user.role === 'admin';

    if (!user.canPost || (adminOnly && !isAdmin)) {
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center p-4">
                <div class="bg-white border border-slate-200 rounded-lg p-6 text-center max-w-sm">
                    <i class="fa-solid fa-ban text-3xl text-red-400 mb-3"></i>
                    <h1 class="font-bold text-slate-800 mb-1">ไม่มีสิทธิ์เข้าหน้านี้</h1>
                    <p class="text-[13px] text-slate-500 mb-4">ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์</p>
                    <a href="${user.canPost ? '/admin/index.html' : '/index.html'}" class="btn btn-primary">กลับ</a>
                </div>
            </div>`;
        return new Promise(() => {});
    }

    const links = [
        { page: 'dashboard', href: 'index.html', icon: 'fa-gauge', label: 'ภาพรวม' },
        { page: 'contents', href: 'contents.html', icon: 'fa-newspaper', label: isAdmin ? 'โพสต์ทั้งหมด' : 'โพสต์ของฉัน' },
        { page: 'content-edit', href: 'content-edit.html', icon: 'fa-pen-to-square', label: 'สร้างโพสต์' },
        ...(isAdmin
            ? [
                { section: 'ผู้ดูแลระบบ' },
                { page: 'categories', href: 'categories.html', icon: 'fa-folder-tree', label: 'หมวดหมู่' },
                { page: 'users', href: 'users.html', icon: 'fa-users', label: 'ผู้ใช้และสิทธิ์' },
                { page: 'audit', href: 'audit-log.html', icon: 'fa-clock-rotate-left', label: 'Audit log' },
            ]
            : []),
    ];

    const nav = document.getElementById('admin-nav');
    nav.innerHTML = `
        <a href="index.html" class="flex items-center gap-2 px-3 pb-4 mb-3 border-b border-white/10">
            <span class="w-8 h-8 rounded bg-primary flex items-center justify-center text-white"><i class="fa-solid fa-layer-group text-sm"></i></span>
            <span class="leading-tight">
                <span class="block text-white font-bold text-[14px]">Intranet CMS</span>
                <span class="block text-slate-400 text-[11px]">Sirivatana</span>
            </span>
        </a>
        <nav class="flex flex-col gap-1 flex-1">
            ${links
                .map((l) =>
                    l.section
                        ? `<div class="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">${esc(l.section)}</div>`
                        : `<a href="${l.href}" class="nav-link ${l.page === page ? 'active' : ''}"><i class="fa-solid ${l.icon} w-4 text-center text-xs"></i>${esc(l.label)}</a>`
                )
                .join('')}
        </nav>
        <div class="border-t border-white/10 pt-3 mt-3 px-1">
            <div class="px-2 mb-2">
                <div class="text-white text-[13px] font-medium truncate">${esc(user.firstName)} ${esc(user.lastName)}</div>
                <div class="text-slate-400 text-[11px]">${esc(user.username)} · ${esc(ROLE_LABEL[user.role] || user.role)}</div>
            </div>
            <a href="/index.html" class="nav-link"><i class="fa-solid fa-house w-4 text-center text-xs"></i>หน้าเว็บไซต์</a>
            <button type="button" id="logout-btn" class="nav-link w-full text-left"><i class="fa-solid fa-right-from-bracket w-4 text-center text-xs"></i>ออกจากระบบ</button>
        </div>`;

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await API.post('/api/auth/logout').catch(() => {});
        location.replace('/admin/login.html');
    });

    // Mobile: the nav is hidden behind a menu button
    document.getElementById('nav-toggle')?.addEventListener('click', () => {
        nav.classList.toggle('hidden');
        nav.classList.toggle('flex');
    });

    document.getElementById('page').hidden = false;
    return user;
})();
