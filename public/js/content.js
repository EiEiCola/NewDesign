(function () {
    const { getJson, esc, fmtDate } = CMS;
    const id = Number(new URLSearchParams(location.search).get('id'));
    const article = document.getElementById('article');

    function fmtSize(bytes) {
        if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function fileIcon(name) {
        const ext = name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'fa-file-pdf text-red-500';
        if (['doc', 'docx'].includes(ext)) return 'fa-file-word text-blue-600';
        if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel text-green-600';
        if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint text-orange-500';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'fa-file-image text-purple-500';
        if (ext === 'zip') return 'fa-file-zipper text-amber-600';
        return 'fa-file text-slate-400';
    }

    async function load() {
        if (!id) throw Object.assign(new Error(), { status: 404 });
        const { content: c, media } = await getJson(`/api/public/contents/${id}`);

        document.title = `${c.title} | Sirivatana Intranet`;
        document.getElementById('crumb-main').textContent = c.main_name;
        const crumbSub = document.getElementById('crumb-sub');
        crumbSub.textContent = c.sub_name;
        crumbSub.href = `category.html?sc=${c.sc_id}`;

        const header = media.find((m) => m.kind === 'header');
        const gallery = media.filter((m) => m.kind === 'gallery');
        const files = media.filter((m) => m.kind === 'attachment');

        // c.body was sanitized by the server when it was saved, so it is safe to render as HTML.
        article.innerHTML = `
            ${header ? `<img src="${esc(header.file_path)}" alt="" class="w-full max-h-[360px] object-cover rounded-lg mb-4">` : ''}
            <span class="text-[10px] font-semibold bg-primary-light text-primary px-2 py-0.5 rounded">${esc(c.sub_name)}</span>
            <h1 class="text-2xl font-bold text-slate-800 leading-snug mt-2">${esc(c.title)}</h1>
            <div class="flex flex-wrap gap-4 text-[12px] text-slate-400 mt-2 pb-4 mb-4 border-b border-slate-100">
                <span><i class="fa-regular fa-calendar mr-1"></i>${fmtDate(c.publish_at || c.create_at)}</span>
                <span><i class="fa-regular fa-user mr-1"></i>${esc(c.author)}</span>
                <span><i class="fa-regular fa-eye mr-1"></i>${c.view_count} ครั้ง</span>
            </div>

            <div class="rich-body">${c.body || ''}</div>

            ${gallery.length ? `
            <section class="mt-6">
                <h2 class="font-semibold text-[14px] text-slate-800 mb-2"><i class="fa-solid fa-images text-primary mr-1"></i> รูปภาพ</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    ${gallery.map((g) => `
                        <a href="${esc(g.file_path)}" target="_blank" class="block rounded overflow-hidden border border-slate-200 hover:opacity-90">
                            <img src="${esc(g.file_path)}" alt="${esc(g.original_name)}" class="w-full h-36 object-cover" loading="lazy">
                        </a>`).join('')}
                </div>
            </section>` : ''}

            ${files.length ? `
            <section class="mt-6">
                <h2 class="font-semibold text-[14px] text-slate-800 mb-2"><i class="fa-solid fa-paperclip text-primary mr-1"></i> ไฟล์แนบ</h2>
                <ul class="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    ${files.map((f) => `
                        <li><a href="${esc(f.file_path)}" download="${esc(f.original_name)}" class="flex items-center gap-3 px-3 py-2 text-[13px] hover:bg-slate-50">
                            <i class="fa-solid ${fileIcon(f.original_name)}"></i>
                            <span class="flex-1 min-w-0 truncate">${esc(f.original_name)}</span>
                            <span class="text-[11px] text-slate-400">${fmtSize(f.file_size)}</span>
                            <i class="fa-solid fa-download text-[11px] text-slate-400"></i>
                        </a></li>`).join('')}
                </ul>
            </section>` : ''}

            <a href="category.html?sc=${c.sc_id}" class="inline-flex items-center gap-1.5 mt-6 text-[12px] text-slate-500 hover:text-primary">
                <i class="fa-solid fa-arrow-left text-[10px]"></i> กลับไป ${esc(c.sub_name)}
            </a>`;
    }

    load().catch((err) => {
        article.innerHTML = `
            <div class="text-center py-16 text-slate-400">
                <i class="fa-regular fa-file-excel text-4xl mb-3"></i>
                <p class="text-[14px]">${err.status === 404 ? 'ไม่พบโพสต์ หรือโพสต์ยังไม่เผยแพร่' : 'โหลดข้อมูลไม่สำเร็จ'}</p>
                <a href="index.html" class="text-[12px] text-primary hover:underline">กลับหน้าแรก</a>
            </div>`;
    });
})();
