// Knowledge Base Glossary (dictionary) page
// Terms are sample data -- replace with real data / API later.
(function () {
    const TERMS = [
        { term: 'Absenteeism', tag: 'HR', def: 'ระเบียบและข้อบังคับเกี่ยวกับการลางาน ขาดงาน และผลกระทบต่อสวัสดิการของพนักงาน' },
        { term: 'Audit (ISO)', tag: 'ISO', def: 'ขั้นตอนการตรวจสอบคุณภาพภายในมาตรฐาน การเตรียมเอกสาร และการประเมินประจำปี' },
        { term: 'CAR', tag: 'QC', def: 'Corrective Action Request — ใบแจ้งให้ดำเนินการแก้ไขเมื่อพบข้อบกพร่องหรือความไม่สอดคล้อง' },
        { term: 'Color Limit', tag: 'Production', def: 'ขอบเขตค่าความต่างของสีที่ยอมรับได้ในงานพิมพ์' },
        { term: 'NCR', tag: 'QC', def: 'Non-Conformance Report — รายงานสินค้าหรือกระบวนการที่ไม่เป็นไปตามข้อกำหนด' },
        { term: 'OK Limit', tag: 'QC', def: 'ค่าขอบเขตที่ใช้ตัดสินว่างานผ่านการตรวจรับ (OK) หรือไม่' },
        { term: 'PAR', tag: 'QC', def: 'Preventive Action Request — ใบแจ้งดำเนินการป้องกันไม่ให้เกิดปัญหาซ้ำ' },
        { term: 'Timesheet', tag: 'HR', def: 'บันทึกเวลาทำงานของพนักงานแยกตามงานหรือแผนก' },
    ].sort((a, b) => a.term.localeCompare(b.term, 'en'));

    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    let letter = (params.get('letter') || '').toUpperCase() || 'ALL';
    let query = params.get('q') || '';

    function renderLetters() {
        const letters = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
        const used = new Set(TERMS.map(t => t.term[0].toUpperCase()));
        $('letters').innerHTML = letters.map(l => {
            const active = l === letter;
            const disabled = l !== 'ALL' && !used.has(l);
            const cls = active
                ? 'bg-primary text-white font-bold'
                : disabled
                    ? 'bg-transparent text-slate-300 cursor-default'
                    : 'bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 border border-slate-200';
            return `<button type="button" data-letter="${l}" ${disabled ? 'disabled' : ''}
                class="${l === 'ALL' ? 'px-2' : 'w-7'} h-7 rounded text-[11px] transition-colors ${cls}">${l === 'ALL' ? 'ทั้งหมด' : l}</button>`;
        }).join('');
    }

    function renderTerms() {
        const q = query.trim().toLowerCase();
        const list = TERMS.filter(t =>
            (letter === 'ALL' || t.term[0].toUpperCase() === letter) &&
            (!q || t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q)));
        $('result-count').textContent = `${list.length} รายการ`;
        $('term-list').innerHTML = list.length
            ? list.map(t => `
                <li class="bg-white p-3 rounded-lg border border-slate-200 hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between mb-1">
                        <h3 class="font-semibold text-primary text-[14px]">${t.term}</h3>
                        <span class="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">${t.tag}</span>
                    </div>
                    <p class="text-[12px] text-slate-500 leading-relaxed">${t.def}</p>
                </li>`).join('')
            : '<li class="text-center text-[12px] text-slate-400 py-8">ไม่พบคำศัพท์ที่ค้นหา</li>';
    }

    function render() {
        renderLetters();
        renderTerms();
    }

    $('letters').addEventListener('click', e => {
        const b = e.target.closest('button[data-letter]');
        if (!b || b.disabled) { return; }
        letter = b.dataset.letter;
        render();
    });
    $('term-search').value = query;
    $('term-search').addEventListener('input', e => {
        query = e.target.value;
        renderTerms();
    });

    render();
})();
