/* =========================================================
   Seed data: roles + categories taken from the current sidebar.
   Safe to run more than once. The first admin account is created
   with: npm run create-admin -- <employee_id> <first> <last> <username> <password>
   ========================================================= */

/* ---------- Roles ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE name = 'admin')  INSERT INTO dbo.Role (name) VALUES ('admin');
IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE name = 'editor') INSERT INTO dbo.Role (name) VALUES ('editor');
IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE name = 'user')   INSERT INTO dbo.Role (name) VALUES ('user');
GO

/* ---------- Categories (only when empty) ----------
   Active categories exported from the database (8 main / 68 sub).
   IDs are fixed so links like category.html?sc=2 are the same on every server.
   side: 1 = center (home news), 2 = left, 3 = right (System Online) */
IF NOT EXISTS (SELECT 1 FROM dbo.Main_category)
BEGIN
    SET IDENTITY_INSERT dbo.Main_category ON;
    INSERT INTO dbo.Main_category (mc_id, name, side, sort_order, link_url) VALUES
        (1, N'ข่าวประชาสัมพันธ์', 1, 1, NULL),
        (2, N'HR Board', 2, 1, NULL),
        (3, N'คู่มือ', 2, 2, NULL),
        (4, N'SHE News', 2, 3, NULL),
        (5, N'PR Board', 2, 4, NULL),
        (6, N'Hot News', 2, 5, NULL),
        (7, N'ISO', 2, 6, NULL),
        (8, N'Operation Services', 3, 1, NULL);
    SET IDENTITY_INSERT dbo.Main_category OFF;

    SET IDENTITY_INSERT dbo.Sub_category ON;
    INSERT INTO dbo.Sub_category (sc_id, mc_id, name, sort_order, link_url) VALUES
        -- ข่าวประชาสัมพันธ์
        (1, 1, N'ข่าวเด่น', 1, NULL),
        -- HR Board
        (2, 2, N'ประกาศคำสั่ง', 1, NULL),
        (3, 2, N'ระเบียบบริษัท', 2, NULL),
        (4, 2, N'นโยบายผู้บริหาร', 3, NULL),
        (5, 2, N'HR News', 4, NULL),
        (6, 2, N'ISO News', 5, NULL),
        (7, 2, N'Monthly Report KPIS 5S', 6, NULL),
        (8, 2, N'กิจกรรม 5 ส', 7, NULL),
        (9, 2, N'ความรู้องค์กร', 8, NULL),
        -- คู่มือ
        (10, 3, N'คู่มือการใช้งาน-Hand Lift', 1, NULL),
        (11, 3, N'คู่มือการใช้งาน-การใช้เครื่องชั่ง', 2, NULL),
        -- SHE News
        (12, 4, N'CSR News', 1, NULL),
        (13, 4, N'Safety News', 2, NULL),
        (14, 4, N'Health news', 3, NULL),
        (15, 4, N'Environment news', 4, NULL),
        -- PR Board
        (16, 5, N'ประชาสัมพันธ์กิจกรรม', 1, NULL),
        (17, 5, N'สุขสันต์วันเกิดชาวศิริวัฒนา', 2, NULL),
        (18, 5, N'มุมสาระน่ารู้...คู่ชาวศิริวัฒนา', 3, NULL),
        (19, 5, N'สาระดีดีเพื่อชีวิตสุขสันต์', 4, NULL),
        (20, 5, N'Awards of Sirivatana', 5, NULL),
        -- Hot News
        (21, 6, N'News', 1, NULL),
        (22, 6, N'Business News', 2, NULL),
        (23, 6, N'Spot News', 3, NULL),
        (24, 6, N'Entertainment', 4, NULL),
        (25, 6, N'Daily Tips', 5, NULL),
        (26, 6, N'Press News', 6, NULL),
        -- ISO
        (27, 7, N'Procedure', 1, NULL),
        (28, 7, N'Work Instruction (WI)', 2, NULL),
        -- Operation Services
        (29, 8, N'ระบบ MI (ใบลา, แจ้งซ่อม, ใบขอซื้อ, ฯลฯ)', 1, NULL),
        (30, 8, N'กราฟฝ่ายซ่อมบำรุงโครงสร้าง', 2, NULL),
        (31, 8, N'แผนงานซ่อมบำรุงโครงสร้าง', 3, NULL),
        (32, 8, N'ซ่อมบำรุงโครงสร้าง::รายงานพนักงาน/ชั่วโมงทำงานปกติ', 4, NULL),
        (33, 8, N'ซ่อมบำรุงโครงสร้าง::รายงานพนักงาน/ชั่วโมงทำงาน OT', 5, NULL),
        (34, 8, N'กราฟฝ่ายซ่อมบำรุงเครื่องจักร', 6, NULL),
        (35, 8, N'Report timesheet for accounting', 7, NULL),
        (36, 8, N'เอกสารฝ่ายจัดซื้อ', 8, NULL),
        (37, 8, N'WI', 9, NULL),
        (38, 8, N'REPORT C.A.R. and Problem', 10, NULL),
        (39, 8, N'OK REPORT', 11, NULL),
        (40, 8, N'OK LIMIT COLOR', 12, NULL),
        (41, 8, N'REPORT Checklist and Machine Problem', 13, NULL),
        (42, 8, N'PL Print - พิมพ์ใบพาเลท', 14, NULL),
        (43, 8, N'Planning Warehouse', 15, NULL),
        (44, 8, N'QC Pallet- รายงานสถานะการตรวจสอบพาเลท', 16, NULL),
        (45, 8, N'Paper group price for RFQ', 17, NULL),
        (46, 8, N'FG : Job Report', 18, NULL),
        (47, 8, N'FG : แสดงรายงาน New Job', 19, NULL),
        (48, 8, N'Stock On-Hand', 20, NULL),
        (49, 8, N'Stock On-Hand Item นอกรายการ', 21, NULL),
        (50, 8, N'Stock On-Hand (Store)', 22, NULL),
        (51, 8, N'Q.C. TimeSheet', 23, NULL),
        (52, 8, N'Q.C. Report', 24, NULL),
        (53, 8, N'ตารางการจองห้องประชุม', 25, NULL),
        (54, 8, N'ระบบ QC-Inspection', 26, NULL),
        (55, 8, N'โปรแกรมวาดลายเซ็นต์สำหรับใช้ใน MI', 27, NULL),
        (56, 8, N'Q-Point', 28, NULL),
        (57, 8, N'รายการถ่ายภาพเม็ดสกรีน', 29, NULL),
        (58, 8, N'รายการ PO รอรับเข้าคลังกระดาษ', 30, NULL),
        (59, 8, N'ตัวอย่างไฟล์งาน (NCR)', 31, NULL),
        (60, 8, N'รายการรอ OK งาน', 32, NULL),
        (61, 8, N'Timesheet Laos : Master plan', 33, NULL),
        (62, 8, N'ดูดิว Delivery', 34, NULL),
        (63, 8, N'รายงานปัญหาจาก Timesheet และ CAR/PAR', 35, NULL),
        (64, 8, N'Mixed Ink Planning', 36, NULL),
        (65, 8, N'Color Limit', 37, NULL),
        (66, 8, N'Planning Production', 38, NULL),
        (67, 8, N'ระบบจัดทำโครงสร้าง (OrgChart)', 39, NULL),
        (68, 8, N'Production Dashboard', 40, NULL);
    SET IDENTITY_INSERT dbo.Sub_category OFF;
END
GO

/* ---------- Right side: Operation Services (only when missing) ----------
   Items start without a link; set each URL in Admin → หมวดหมู่ (รูปแบบ "ลิงก์ไปเว็บอื่น"). */
IF NOT EXISTS (SELECT 1 FROM dbo.Main_category WHERE side = 3 AND name = N'Operation Services')
BEGIN
    DECLARE @ops_id INT;
    INSERT INTO dbo.Main_category (name, side, sort_order)
    VALUES (N'Operation Services', 3, 1);
    SET @ops_id = SCOPE_IDENTITY();

    INSERT INTO dbo.Sub_category (mc_id, name, sort_order)
    SELECT @ops_id, name, sort_order FROM (VALUES
        (N'ระบบ MI (ใบลา, แจ้งซ่อม, ใบขอซื้อ, ฯลฯ)', 1),
        (N'กราฟฝ่ายซ่อมบำรุงโครงสร้าง', 2),
        (N'แผนงานซ่อมบำรุงโครงสร้าง', 3),
        (N'ซ่อมบำรุงโครงสร้าง::รายงานพนักงาน/ชั่วโมงทำงานปกติ', 4),
        (N'ซ่อมบำรุงโครงสร้าง::รายงานพนักงาน/ชั่วโมงทำงาน OT', 5),
        (N'กราฟฝ่ายซ่อมบำรุงเครื่องจักร', 6),
        (N'Report timesheet for accounting', 7),
        (N'เอกสารฝ่ายจัดซื้อ', 8),
        (N'WI', 9),
        (N'REPORT C.A.R. and Problem', 10),
        (N'OK REPORT', 11),
        (N'OK LIMIT COLOR', 12),
        (N'REPORT Checklist and Machine Problem', 13),
        (N'PL Print - พิมพ์ใบพาเลท', 14),
        (N'Planning Warehouse', 15),
        (N'QC Pallet- รายงานสถานะการตรวจสอบพาเลท', 16),
        (N'Paper group price for RFQ', 17),
        (N'FG : Job Report', 18),
        (N'FG : แสดงรายงาน New Job', 19),
        (N'Stock On-Hand', 20),
        (N'Stock On-Hand Item นอกรายการ', 21),
        (N'Stock On-Hand (Store)', 22),
        (N'Q.C. TimeSheet', 23),
        (N'Q.C. Report', 24),
        (N'ตารางการจองห้องประชุม', 25),
        (N'ระบบ QC-Inspection', 26),
        (N'โปรแกรมวาดลายเซ็นต์สำหรับใช้ใน MI', 27),
        (N'Q-Point', 28),
        (N'รายการถ่ายภาพเม็ดสกรีน', 29),
        (N'รายการ PO รอรับเข้าคลังกระดาษ', 30),
        (N'ตัวอย่างไฟล์งาน (NCR)', 31),
        (N'รายการรอ OK งาน', 32),
        (N'Timesheet Laos : Master plan', 33),
        (N'ดูดิว Delivery', 34),
        (N'รายงานปัญหาจาก Timesheet และ CAR/PAR', 35),
        (N'Mixed Ink Planning', 36),
        (N'Color Limit', 37),
        (N'Planning Production', 38),
        (N'ระบบจัดทำโครงสร้าง (OrgChart)', 39),
        (N'Production Dashboard', 40)
    ) AS v(name, sort_order);
END
GO
