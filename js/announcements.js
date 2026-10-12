// HR Board > ประกาศคำสั่ง : list (newest first) -> PDF viewer (switched by URL hash)
// ANNOUNCEMENTS is sample data -- replace with real data / API later.
(function () {
    const ANNOUNCEMENTS = [
        { id: 'ann-2569-012', no: '012/2569', title: 'ประกาศวันหยุดประจำปี 2569 (ฉบับแก้ไข)', date: '2026-10-01', file: 'docs/announcements/ann-2569-012.pdf' },
        { id: 'ann-2569-011', no: '011/2569', title: 'คำสั่งแต่งตั้งคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', date: '2026-09-15', file: 'docs/announcements/ann-2569-011.pdf' },
        { id: 'ann-2569-010', no: '010/2569', title: 'ประกาศเรื่อง การปรับเวลาทำงานของฝ่ายผลิต', date: '2026-08-20', file: 'docs/announcements/ann-2569-010.pdf' },
        { id: 'ann-2569-009', no: '009/2569', title: 'ประกาศเรื่อง แนวปฏิบัติการลางานและการขออนุมัติล่วงหน้า', date: '2026-07-03', file: 'docs/announcements/ann-2569-009.pdf' },
        { id: 'ann-2569-008', no: '008/2569', title: 'คำสั่งเรื่อง การเปลี่ยนแปลงโครงสร้างองค์กร', date: '2026-05-12', file: 'docs/announcements/ann-2569-008.pdf' },
        { id: 'ann-2569-007', no: '007/2569', title: 'ประกาศเรื่อง การตรวจสุขภาพประจำปี 2569', date: '2026-03-28', file: 'docs/announcements/ann-2569-007.pdf' },
    ];

    // extra sample rows (older) so paging/filtering can be tried -- delete when real data is in
    for (let i = 0; i < 19; i++) {
        const d = new Date(Date.UTC(2026, 1, 20 - i * 17));
        const n = String(6 - Math.floor(i / 2)).padStart(3, '0');
        ANNOUNCEMENTS.push({
            id: `ann-sample-${i + 1}`, no: `${n}/${d.getUTCFullYear() + 543}`,
            title: `ประกาศ/คำสั่ง ตัวอย่างที่ ${i + 1}`,
            date: d.toISOString().slice(0, 10), file: 'docs/announcements/ann-2569-007.pdf',
        });
    }
    ANNOUNCEMENTS.sort((a, b) => b.date.localeCompare(a.date));   // newest first

    const PAGE_SIZE = 10;
    const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    let page = 1;

    const $ = id => document.getElementById(id);
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('th-TH',
        { year: 'numeric', month: 'long', day: 'numeric' });

    function fillFilters() {
        const years = [...new Set(ANNOUNCEMENTS.map(x => x.date.slice(0, 4)))].sort().reverse();
        $('ann-year').innerHTML = '<option value="">ทุกปี</option>' +
            years.map(y => `<option value="${y}">${Number(y) + 543}</option>`).join('');
        $('ann-month').innerHTML = '<option value="">ทุกเดือน</option>' +
            MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');
    }

    function filtered() {
        const q = $('ann-search').value.trim().toLowerCase();
        const y = $('ann-year').value, m = $('ann-month').value;
        return ANNOUNCEMENTS.filter(a =>
            (!q || a.title.toLowerCase().includes(q) || a.no.toLowerCase().includes(q)) &&
            (!y || a.date.slice(0, 4) === y) &&
            (!m || a.date.slice(5, 7) === m));
    }

    function pageNumbers(total) {
        // 1 … 4 5 6 … 12
        const out = [];
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - page) <= 1) { out.push(i); }
            else if (out[out.length - 1] !== '…') { out.push('…'); }
        }
        return out;
    }

    function renderPager(total) {
        const el = $('ann-pager');
        if (total <= 1) { el.innerHTML = ''; return; }
        const btn = (label, target, extra = '') =>
            `<button type="button" data-page="${target}" class="min-w-[28px] h-7 px-2 rounded text-[12px] border transition-colors ${extra}">${label}</button>`;
        const off = 'border-slate-200 text-slate-300 cursor-default';
        const on = 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary';
        el.innerHTML =
            btn('<i class="fa-solid fa-chevron-left text-[10px]"></i>', page - 1, page === 1 ? off : on) +
            pageNumbers(total).map(n => n === '…'
                ? '<span class="px-1 text-slate-300">…</span>'
                : btn(n, n, n === page ? 'border-primary bg-primary text-white font-bold' : on)).join('') +
            btn('<i class="fa-solid fa-chevron-right text-[10px]"></i>', page + 1, page === total ? off : on);
    }

    function renderList() {
        const all = filtered();
        const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
        page = Math.min(Math.max(page, 1), totalPages);
        const list = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        $('ann-count').textContent = all.length
            ? `แสดง ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + list.length} จาก ${all.length} รายการ`
            : '0 รายการ';
        $('ann-list').innerHTML = list.length ? list.map(a => `
            <li>
                <a href="#${a.id}" class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-primary/50 hover:shadow-hover-soft transition-all group">
                    <span class="w-9 h-9 rounded bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-file-pdf"></i>
                    </span>
                    <span class="flex-1 min-w-0">
                        <span class="block font-semibold text-[13px] text-slate-700 group-hover:text-primary">${a.title}</span>
                        <span class="block text-[11px] text-slate-400">เลขที่ ${a.no} · ${fmtDate(a.date)}</span>
                    </span>
                    ${a.id === ANNOUNCEMENTS[0].id ? '<span class="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ล่าสุด</span>' : ''}
                    <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                </a>
            </li>`).join('')
            : '<li class="text-center text-[12px] text-slate-400 py-8">ไม่พบรายการ</li>';
        renderPager(totalPages);
    }

    function resetAndRender() {
        page = 1;
        renderList();
    }

    function route() {
        const a = ANNOUNCEMENTS.find(x => x.id === location.hash.slice(1));
        $('view-list').classList.toggle('hidden', !!a);
        $('view-pdf').classList.toggle('hidden', !a);
        $('crumb-ann').classList.toggle('hidden', !a);
        $('crumb-ann').classList.toggle('flex', !!a);
        if (!a) {
            $('pdf-frame').removeAttribute('src');
            return;
        }
        $('crumb-ann-name').textContent = a.no;
        $('pdf-title').textContent = a.title;
        $('pdf-meta').textContent = `เลขที่ ${a.no} · ${fmtDate(a.date)}`;
        $('pdf-open').href = a.file;
        $('pdf-download').href = a.file;
        $('pdf-frame').src = a.file;
        $('view-pdf').scrollIntoView();
    }

    $('ann-search').addEventListener('input', resetAndRender);
    $('ann-year').addEventListener('change', resetAndRender);
    $('ann-month').addEventListener('change', resetAndRender);
    $('ann-clear').addEventListener('click', () => {
        $('ann-search').value = '';
        $('ann-year').value = '';
        $('ann-month').value = '';
        resetAndRender();
    });
    $('ann-pager').addEventListener('click', e => {
        const b = e.target.closest('button[data-page]');
        if (!b) { return; }
        page = Number(b.dataset.page);
        renderList();
    });
    $('btn-back').addEventListener('click', () => { location.hash = ''; });
    $('crumb-list').addEventListener('click', e => {
        if (location.hash) { e.preventDefault(); location.hash = ''; }
    });
    window.addEventListener('hashchange', route);

    fillFilters();
    renderList();
    route();
})();
