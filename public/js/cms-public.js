/*
 * Public site + CMS: loads sidebar menus and home-page news from the API.
 * When the API is not reachable (e.g. the HTML file is opened directly) the static markup stays as is.
 *
 *   #sidebar-left       replaced with left-side categories
 *   #sidebar-right-cms  filled with right-side categories (static links below it are kept)
 *   #pr-carousel        replaced with posts from center-side categories
 *   #login-link         shows the logged-in user
 */
const CMS = (function () {
    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function fmtDate(value) {
        if (!value) return '';
        const d = new Date(value);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    async function getJson(url) {
        const res = await fetch(url, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
        return data;
    }

    const currentSc = Number(new URLSearchParams(location.search).get('sc')) || null;

    /** Same markup as the original static sidebar so main.js toggleMenu() keeps working. */
    function menuHtml(mains) {
        return mains.map((m) => {
            const open = !currentSc || m.subs.some((s) => s.sc_id === currentSc);
            return `
            <li>
                <button class="menu-toggle w-full flex items-center justify-between p-2 rounded hover:bg-slate-200/50 text-slate-700 hover:text-primary font-medium transition-colors group" onclick="toggleMenu(null, this)">
                    <span class="flex items-center gap-2.5">
                        <i class="fa-solid ${open ? 'fa-folder-open' : 'fa-folder'} text-yellow-500 folder-icon"></i>
                        ${esc(m.name)}
                    </span>
                    <i class="fa-solid fa-chevron-right text-[9px] text-slate-400 menu-icon ${open ? 'rotate' : ''}"></i>
                </button>
                <ul class="submenu pl-7 mt-1 space-y-1 text-slate-500 ${open ? 'open' : ''}" style="max-height: ${open ? '2000px' : '0'}; opacity: ${open ? 1 : 0};">
                    ${m.subs.map((s) => `
                        <li><a href="category.html?sc=${s.sc_id}" class="flex items-center py-1 hover:text-primary ${s.sc_id === currentSc ? 'text-primary font-semibold' : ''}">
                            <i class="fa-regular fa-file-lines mr-2 text-slate-400 text-xs"></i>${esc(s.name)}
                        </a></li>`).join('')}
                    ${m.subs.length ? '' : '<li class="py-1 text-[12px] text-slate-400">ยังไม่มีหมวดหมู่รอง</li>'}
                </ul>
            </li>`;
        }).join('');
    }

    async function loadMenus() {
        const menu = await getJson('/api/public/menu');
        const left = document.getElementById('sidebar-left');
        if (left && menu.left.length) left.innerHTML = menuHtml(menu.left);
        const right = document.getElementById('sidebar-right-cms');
        if (right && menu.right.length) right.innerHTML = menuHtml(menu.right);
        return menu;
    }

    async function loadCarousel() {
        const track = document.getElementById('pr-carousel');
        if (!track) return;
        const { items } = await getJson('/api/public/featured');
        if (!items.length) return;

        const gradients = ['from-slate-900/90 via-slate-900/70', 'from-primary/90 via-purple-900/70'];
        track.innerHTML = items.map((n, i) => `
            <div class="min-w-full relative bg-slate-800">
                ${n.header_path ? `<img src="${esc(n.header_path)}" alt="" class="absolute inset-0 w-full h-full object-cover">` : ''}
                <div class="absolute inset-0 bg-gradient-to-r ${gradients[i % 2]} to-transparent"></div>
                <div class="absolute inset-y-0 left-0 w-full md:w-3/4 p-6 flex flex-col justify-center text-white z-10">
                    <span class="text-[10px] font-semibold bg-white/20 backdrop-blur px-2 py-0.5 rounded text-slate-100 w-max mb-2">${esc(n.sub_name)}</span>
                    <h3 class="text-lg font-bold mb-1 leading-tight drop-shadow line-clamp-2">${esc(n.title)}</h3>
                    <p class="text-[13px] text-slate-200 mb-3 line-clamp-2">${esc(n.excerpt)}</p>
                    <a href="content.html?id=${n.c_id}" class="mt-auto self-start bg-white text-slate-800 px-4 py-1.5 rounded text-[11px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                        อ่านต่อ <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>
            </div>`).join('');

        const dots = document.getElementById('carousel-dots');
        if (dots) dots.innerHTML = items.length > 1 ? items.map(() => '<button class="w-1.5 h-1.5 rounded-full bg-white/50 transition-all"></button>').join('') : '';
        if (typeof initCarousel === 'function') initCarousel();
    }

    async function loadLoginState() {
        const link = document.getElementById('login-link');
        if (!link) return;
        try {
            const { user } = await getJson('/api/auth/me');
            link.href = user.canPost ? 'admin/index.html' : '#';
            link.innerHTML = `<i class="fa-solid ${user.canPost ? 'fa-pen-to-square' : 'fa-user'} text-[10px]"></i><span>${esc(user.firstName)}${user.canPost ? ' · CMS' : ''}</span>`;
        } catch {
            /* not logged in: keep the Login button */
        }
    }

    function init() {
        loadMenus().catch(() => {
            // Pages without static fallback markup show a "loading" placeholder: replace it
            const left = document.getElementById('sidebar-left');
            if (left && left.textContent.trim() === 'กำลังโหลด...') {
                left.innerHTML = '<li class="text-[12px] text-slate-400 px-2">โหลดเมนูไม่สำเร็จ</li>';
            }
        });
        loadCarousel().catch(() => {});
        loadLoginState();
    }

    return { init, getJson, esc, fmtDate, menuHtml };
})();

CMS.init();
