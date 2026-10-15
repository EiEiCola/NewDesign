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

/* ---------- Categories (only when empty) ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Main_category)
BEGIN
    DECLARE @mc TABLE (name NVARCHAR(200), side TINYINT, sort_order INT);
    INSERT INTO @mc VALUES
        (N'ข่าวประชาสัมพันธ์', 1, 1),
        (N'HR Board', 2, 1),
        (N'คู่มือ', 2, 2),
        (N'SHE News', 2, 3),
        (N'PR Board', 2, 4),
        (N'Hot News', 2, 5),
        (N'ISO', 2, 6);

    INSERT INTO dbo.Main_category (name, side, sort_order)
    SELECT name, side, sort_order FROM @mc;

    DECLARE @sc TABLE (main NVARCHAR(200), name NVARCHAR(200), sort_order INT);
    INSERT INTO @sc VALUES
        (N'ข่าวประชาสัมพันธ์', N'ข่าวเด่น', 1),
        (N'HR Board', N'ประกาศคำสั่ง', 1),
        (N'HR Board', N'ระเบียบบริษัท', 2),
        (N'HR Board', N'นโยบายผู้บริหาร', 3),
        (N'HR Board', N'HR News', 4),
        (N'HR Board', N'ISO News', 5),
        (N'HR Board', N'Monthly Report KPIS 5S', 6),
        (N'HR Board', N'กิจกรรม 5 ส', 7),
        (N'HR Board', N'ความรู้องค์กร', 8),
        (N'คู่มือ', N'คู่มือการใช้งาน-Hand Lift', 1),
        (N'คู่มือ', N'คู่มือการใช้งาน-การใช้เครื่องชั่ง', 2),
        (N'SHE News', N'CSR News', 1),
        (N'SHE News', N'Safety News', 2),
        (N'SHE News', N'Health news', 3),
        (N'SHE News', N'Environment news', 4),
        (N'PR Board', N'ประชาสัมพันธ์กิจกรรม', 1),
        (N'PR Board', N'สุขสันต์วันเกิดชาวศิริวัฒนา', 2),
        (N'PR Board', N'มุมสาระน่ารู้...คู่ชาวศิริวัฒนา', 3),
        (N'PR Board', N'สาระดีดีเพื่อชีวิตสุขสันต์', 4),
        (N'PR Board', N'Awards of Sirivatana', 5),
        (N'Hot News', N'News', 1),
        (N'Hot News', N'Business News', 2),
        (N'Hot News', N'Spot News', 3),
        (N'Hot News', N'Entertainment', 4),
        (N'Hot News', N'Daily Tips', 5),
        (N'Hot News', N'Press News', 6),
        (N'ISO', N'Procedure', 1),
        (N'ISO', N'Work Instruction (WI)', 2);

    INSERT INTO dbo.Sub_category (mc_id, name, sort_order)
    SELECT m.mc_id, s.name, s.sort_order
    FROM @sc s JOIN dbo.Main_category m ON m.name = s.main;
END
GO
