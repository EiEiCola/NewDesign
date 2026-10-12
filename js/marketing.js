// Marketing report page: list view -> report table view (switched by URL hash)
(function () {
    const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const SALES = ['Sales A', 'Sales B', 'Sales C', 'Sales D', 'Sales E'];

    // Sample data generator (deterministic) -- replace with real data/API later
    function seeded(year, month, rep) {
        const x = Math.sin(year * 97 + month * 31 + rep * 17) * 10000;
        return x - Math.floor(x);
    }

    function saleTargetRows(year, month) {
        const months = month === 'all' ? [...Array(12).keys()] : [Number(month)];
        return SALES.map((name, rep) => {
            let target = 0, actual = 0;
            months.forEach(m => {
                const t = 800000 + Math.round(seeded(year, m, rep) * 400000);
                target += t;
                actual += Math.round(t * (0.7 + seeded(year, m + 40, rep) * 0.5));
            });
            return { name, t: target, a: actual };
        });
    }

    const fmt = n => n.toLocaleString('th-TH');

    const REPORTS = [
        {
            id: 'sale-target', title: 'Sale Target Report', icon: 'fa-bullseye',
            desc: 'เป้าหมายยอดขาย เทียบกับยอดขายจริง แยกตามพนักงานขาย',
            filters: true,
            columns: ['Sales', 'Target (THB)', 'Actual (THB)', 'Achievement', 'Gap (THB)'],
            build(year, month) {
                const rows = saleTargetRows(year, month);
                const total = rows.reduce((s, r) => ({ t: s.t + r.t, a: s.a + r.a }), { t: 0, a: 0 });
                const line = (n, t, a) => [n, fmt(t), fmt(a), (a / t * 100).toFixed(1) + '%', fmt(a - t)];
                return {
                    rows: rows.map(r => line(r.name, r.t, r.a)),
                    total: line('Total', total.t, total.a),
                };
            },
        },
        { id: 'sales-summary', title: 'Sales Summary Report', icon: 'fa-chart-column', desc: 'สรุปยอดขายรวม', columns: [], empty: true },
        { id: 'customer-order', title: 'Customer Order Report', icon: 'fa-file-invoice', desc: 'รายการสั่งซื้อของลูกค้า', columns: [], empty: true },
    ];

    const $ = id => document.getElementById(id);
    const viewList = $('view-list'), viewReport = $('view-report');

    function renderList() {
        $('report-list').innerHTML = REPORTS.map(r => `
            <li>
                <a href="#${r.id}" class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-primary/50 hover:shadow-hover-soft transition-all group">
                    <span class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <i class="fa-solid ${r.icon}"></i>
                    </span>
                    <span class="flex-1 min-w-0">
                        <span class="block font-semibold text-[13px] text-slate-700 group-hover:text-primary">${r.title}</span>
                        <span class="block text-[11px] text-slate-400">${r.desc}</span>
                    </span>
                    <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                </a>
            </li>`).join('');
    }

    function fillFilters() {
        const thisYear = new Date().getFullYear();
        $('filter-year').innerHTML = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2]
            .map(y => `<option value="${y}"${y === thisYear ? ' selected' : ''}>${y}</option>`).join('');
        $('filter-month').innerHTML = '<option value="all">ทั้งปี (All)</option>' +
            MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
    }

    function renderTable(report) {
        const head = $('table-head'), body = $('table-body'), foot = $('table-foot');
        if (report.empty) {
            $('table-caption').textContent = report.title;
            head.innerHTML = '';
            foot.innerHTML = '';
            body.innerHTML = '<tr><td class="px-4 py-8 text-center text-slate-400">ยังไม่มีข้อมูล / อยู่ระหว่างจัดทำ</td></tr>';
            return;
        }
        const year = $('filter-year').value, month = $('filter-month').value;
        const monthLabel = month === 'all' ? 'ทั้งปี' : MONTHS[month];
        $('table-caption').textContent = `${report.title} — ${monthLabel} ${year}`;
        const data = report.build(Number(year), month);
        const cell = (v, i, cls = '') => `<td class="px-4 py-2 ${i === 0 ? '' : 'text-right'} ${cls}">${v}</td>`;
        head.innerHTML = '<tr>' + report.columns.map((c, i) =>
            `<th class="px-4 py-2 font-medium ${i === 0 ? '' : 'text-right'}">${c}</th>`).join('') + '</tr>';
        body.innerHTML = data.rows.map(r => '<tr class="hover:bg-slate-50">' +
            r.map((v, i) => cell(v, i, i === 3 ? 'font-medium text-primary' : '')).join('') + '</tr>').join('');
        foot.innerHTML = '<tr class="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">' +
            data.total.map((v, i) => cell(v, i)).join('') + '</tr>';
    }

    function route() {
        const report = REPORTS.find(r => r.id === location.hash.slice(1));
        viewList.classList.toggle('hidden', !!report);
        viewReport.classList.toggle('hidden', !report);
        $('crumb-report').classList.toggle('hidden', !report);
        if (!report) { return; }
        $('report-title').textContent = report.title;
        $('crumb-report-name').textContent = report.title;
        const f = $('report-filter');
        f.classList.toggle('hidden', !report.filters);
        f.classList.toggle('flex', !!report.filters);
        renderTable(report);
    }

    $('report-filter').addEventListener('submit', e => {
        e.preventDefault();
        route();
    });
    $('crumb-marketing').addEventListener('click', e => {
        if (location.hash) { e.preventDefault(); location.hash = ''; }
    });
    $('btn-back').addEventListener('click', () => { location.hash = ''; });
    window.addEventListener('hashchange', route);

    renderList();
    fillFilters();
    route();
})();
