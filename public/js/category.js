(function () {
    const { getJson, esc, fmtDate } = CMS;
    const scId = Number(new URLSearchParams(location.search).get('sc'));
    const listEl = document.getElementById('list');
    const search = document.getElementById('search');
    let page = 1;

    function showError(message) {
        document.getElementById('cat-title').textContent = message;
        listEl.innerHTML = '';
    }

    async function load() {
        if (!scId) return showError('ไม่พบหมวดหมู่');
        const q = new URLSearchParams({ page, pageSize: 10 });
        if (search.value.trim()) q.set('q', search.value.trim());
        try {
            const data = await getJson(`/api/public/sub-categories/${scId}/contents?${q}`);
            const c = data.category;
            document.title = `${c.name} | Sirivatana Intranet`;
            document.getElementById('crumb-main').textContent = c.main_name;
            document.getElementById('crumb-sub').textContent = c.name;
            document.getElementById('cat-title').textContent = c.name;
            document.getElementById('count').textContent = `ทั้งหมด ${data.total} รายการ`;

            listEl.innerHTML = data.items.length
                ? data.items.map((n) => `
                    <li>
                        <a href="content.html?id=${n.c_id}" class="flex gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-primary/50 hover:shadow-hover-soft transition-all">
                            ${n.header_path
                                ? `<img src="${esc(n.header_path)}" alt="" class="w-28 h-20 object-cover rounded flex-shrink-0">`
                                : '<div class="w-28 h-20 rounded bg-primary-light text-primary flex items-center justify-center flex-shrink-0"><i class="fa-regular fa-newspaper text-xl"></i></div>'}
                            <div class="min-w-0 flex-1">
                                <h3 class="font-semibold text-[14px] text-slate-800 leading-snug line-clamp-2">
                                    ${n.is_pinned ? '<i class="fa-solid fa-thumbtack text-[10px] text-primary mr-1"></i>' : ''}${esc(n.title)}
                                </h3>
                                <p class="text-[12px] text-slate-500 line-clamp-2 mt-0.5">${esc(n.excerpt)}</p>
                                <div class="text-[11px] text-slate-400 mt-1 flex gap-3">
                                    <span><i class="fa-regular fa-calendar mr-1"></i>${fmtDate(n.publish_at || n.create_at)}</span>
                                    <span><i class="fa-regular fa-eye mr-1"></i>${n.view_count}</span>
                                    ${n.attachment_count ? `<span><i class="fa-solid fa-paperclip mr-1"></i>${n.attachment_count}</span>` : ''}
                                </div>
                            </div>
                        </a>
                    </li>`).join('')
                : '<li class="text-center text-[13px] text-slate-400 py-10">ยังไม่มีโพสต์ในหมวดนี้</li>';

            renderPager(data);
        } catch (err) {
            showError(err.status === 404 ? 'ไม่พบหมวดหมู่' : 'โหลดข้อมูลไม่สำเร็จ');
        }
    }

    function renderPager({ total, pageSize }) {
        const pages = Math.ceil(total / pageSize);
        const el = document.getElementById('pager');
        el.innerHTML = pages > 1
            ? Array.from({ length: pages }, (_, i) => i + 1).map((n) => `
                <button type="button" data-page="${n}" class="min-w-[28px] h-7 px-2 rounded text-[12px] border ${n === page ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-600 hover:border-primary'}">${n}</button>`).join('')
            : '';
        el.onclick = (e) => {
            const b = e.target.closest('[data-page]');
            if (b) { page = Number(b.dataset.page); load(); }
        };
    }

    let timer;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { page = 1; load(); }, 300);
    });

    load();
})();
