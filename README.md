# Sirivatana Intranet + CMS

เว็บอินทราเน็ต พร้อมระบบจัดการเนื้อหา (CMS) สำหรับโพสต์ข่าว / ประชาสัมพันธ์
หมวดหมู่ที่สร้างจะไปแสดงเป็นเมนู sidebar ซ้าย/ขวา และโพสต์ในหมวด "กลาง" จะขึ้นเป็นข่าวด้านบนหน้าแรก

**เทคโนโลยี:** Node.js + Express · Microsoft SQL Server · HTML / CSS (Tailwind CDN) / JavaScript ล้วน (vanilla)

---

## 1. ต้องติดตั้งอะไรก่อน

| โปรแกรม | เวอร์ชัน | ใช้ทำอะไร |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20 ขึ้นไป (แนะนำ LTS) | รันเซิร์ฟเวอร์ |
| Microsoft SQL Server | 2017 ขึ้นไป (Express / Developer ก็ได้) | ฐานข้อมูล |
| SQL Server Management Studio (SSMS) | ไม่บังคับ | เปิดดู/แก้ข้อมูลในฐานข้อมูล |

### ตั้งค่า SQL Server ให้เชื่อมต่อได้ (ทำครั้งเดียว)

ระบบเชื่อมต่อด้วย **TCP + SQL Login (username/password)** ต้องเปิด 2 อย่างนี้:

1. **เปิด TCP/IP:** เปิด *SQL Server Configuration Manager* → SQL Server Network Configuration →
   Protocols for MSSQLSERVER (หรือ SQLEXPRESS) → **TCP/IP = Enabled** → แท็บ IP Addresses → IPAll → TCP Port = `1433`
   → รีสตาร์ท service SQL Server
2. **เปิด SQL Server Authentication:** ใน SSMS คลิกขวาที่ชื่อเซิร์ฟเวอร์ → Properties → Security →
   เลือก **SQL Server and Windows Authentication mode** → รีสตาร์ท service
   แล้วสร้าง login (หรือใช้ `sa`) ที่มีสิทธิ์สร้างฐานข้อมูล

> ถ้าไม่อยากติดตั้ง SQL Server ลงเครื่อง ใช้ Docker ได้:
> ```bash
> docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
> ```

---

## 2. ติดตั้งและรันครั้งแรก

```bash
# 1) ติดตั้ง package
npm install

# 2) สร้างไฟล์ .env จากตัวอย่าง แล้วแก้ค่าให้ตรงกับเครื่อง (ดูหัวข้อ 3)
copy .env.example .env        # Windows (cmd)
# cp .env.example .env        # macOS / Linux / Git Bash

# 3) สร้างฐานข้อมูล + ตาราง + ข้อมูลเริ่มต้น (role, หมวดหมู่จาก sidebar เดิม)
npm run db:init

# 4) สร้างบัญชีผู้ดูแลระบบคนแรก
npm run create-admin -- <รหัสพนักงาน> <ชื่อ> <นามสกุล> <username> <password>
#    ตัวอย่าง: npm run create-admin -- 2559001 สมชาย ใจดี admin MyPassw0rd!

# 5) รันเซิร์ฟเวอร์
npm run dev      # โหมดพัฒนา (แก้โค้ดแล้วรีสตาร์ทเอง)
# npm start      # โหมดใช้งานจริง
```

เปิดเบราว์เซอร์:

- หน้าเว็บ: <http://localhost:3000>
- หลังบ้าน (CMS): <http://localhost:3000/admin/login.html>

> `npm run db:init` รันซ้ำได้ ไม่ลบข้อมูลเดิม (สร้างเฉพาะตาราง/ข้อมูลที่ยังไม่มี)

---

## 3. ไฟล์ `.env`

คัดลอกจาก `.env.example` แล้วแก้ค่า **ห้าม commit ไฟล์ `.env`** (อยู่ใน `.gitignore` แล้ว)

```ini
PORT=3000                      # พอร์ตของเว็บ
NODE_ENV=development           # production เมื่อใช้งานจริง (cookie จะใช้ได้เฉพาะ HTTPS)

# Microsoft SQL Server
DB_SERVER=localhost            # ชื่อเครื่อง/IP ของ SQL Server
DB_PORT=1433
DB_NAME=SirivatanaIntranet     # ชื่อฐานข้อมูล (db:init จะสร้างให้ถ้ายังไม่มี)
DB_USER=sa                     # SQL login
DB_PASSWORD=change_me
DB_ENCRYPT=false               # true ถ้าใช้ Azure SQL หรือบังคับเข้ารหัส
DB_TRUST_SERVER_CERT=true      # true สำหรับเครื่อง dev ที่ใช้ certificate ของตัวเอง

# คีย์สำหรับเซ็น token ล็อกอิน ต้องยาวและเดาไม่ได้
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_HOURS=8            # ล็อกอินค้างได้กี่ชั่วโมง

UPLOAD_MAX_MB=20               # ขนาดไฟล์อัปโหลดสูงสุดต่อไฟล์
```

สร้าง `JWT_SECRET` แบบสุ่ม:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. สิทธิ์ผู้ใช้

| Role | ทำอะไรได้ |
|---|---|
| `admin` ผู้ดูแลระบบ | ทุกอย่าง: จัดการผู้ใช้/สิทธิ์, หมวดหมู่, โพสต์ของทุกคน, ดู Audit log |
| `editor` ผู้โพสต์ | สร้าง/แก้ไข/ลบ **โพสต์ของตัวเอง** |
| `user` ผู้ใช้ทั่วไป | ล็อกอินได้ แต่ไม่มีสิทธิ์โพสต์ |

**ให้สิทธิ์โพสต์:** admin เข้าเมนู *ผู้ใช้และสิทธิ์* → แก้ไขผู้ใช้ → เปลี่ยนสิทธิ์เป็น **ผู้โพสต์**

---

## 5. วิธีใช้งาน CMS

1. **หมวดหมู่** (admin): สร้างหมวดหมู่หลัก เลือกตำแหน่ง
   - **ซ้าย / ขวา** → แสดงเป็นเมนูใน sidebar
   - **กลาง** → โพสต์ในหมวดนี้ขึ้นข่าวสไลด์ด้านบนหน้าแรก
   แล้วเพิ่มหมวดหมู่รองข้างใน
2. **สร้างโพสต์:** เลือกหมวดหมู่รอง, ใส่หัวข้อ/เนื้อหา, สถานะ **เผยแพร่**
   - รูป **Header** = รูปปก (1 รูป) · **แกลเลอรี่** = รูปประกอบหลายรูป · **รูปคั่นเนื้อหา** = ปุ่มรูปภาพบนแถบเครื่องมือ · **ไฟล์แนบ** ได้หลายไฟล์
   - **เริ่มแสดง / หมดอายุ** ปล่อยว่างได้ (ว่าง = แสดงทันที / แสดงตลอด)
3. หน้าเว็บ: กดหมวดหลัก → หมวดรอง → เห็นรายการโพสต์ → กดอ่าน

---

## 6. โครงสร้างโปรเจกต์

```
NewDesign/
├── database/
│   ├── schema.sql            # สร้างตารางทั้งหมด
│   └── seed.sql              # role + หมวดหมู่เริ่มต้น
├── scripts/
│   ├── run-sql.js            # npm run db:init
│   └── create-admin.js       # npm run create-admin
├── src/                      # Backend (Express)
│   ├── server.js             # จุดเริ่มรันเซิร์ฟเวอร์
│   ├── app.js                # ตั้งค่า Express, static files, routes
│   ├── config/               # ค่าจาก .env, การเชื่อมต่อ DB, ค่าคงที่ (role, status ...)
│   ├── middlewares/          # ตรวจล็อกอิน/สิทธิ์, อัปโหลดไฟล์, จัดการ error
│   ├── routes/               # กำหนด URL ของ API
│   ├── controllers/          # logic ของแต่ละ API
│   ├── services/             # audit log, จัดการไฟล์
│   └── utils/                # validate, sanitize HTML, error class
├── public/                   # Frontend (เสิร์ฟเป็นไฟล์ static)
│   ├── index.html, category.html, content.html, ...   # หน้าเว็บ
│   ├── admin/                # หน้าหลังบ้าน CMS
│   ├── css/  js/  images/  docs/
├── uploads/                  # ไฟล์ที่อัปโหลด (ไม่อยู่ใน git) แยกโฟลเดอร์ ปี/เดือน
├── .env.example
└── package.json
```

### API หลัก

| Method | URL | สิทธิ์ |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` · GET `/api/auth/me` | - |
| GET/POST/PUT | `/api/users` · `/api/users/:id/password` · `/api/users/roles` | admin |
| GET | `/api/categories` | admin, editor |
| POST/PUT/DELETE | `/api/categories/main/:id` · `/api/categories/sub/:id` | admin |
| GET/POST/PUT/DELETE | `/api/contents` · `/api/contents/:id` | admin, editor (ของตัวเอง) |
| POST/PUT/DELETE | `/api/contents/:id/media` · `/media/order` · `/media/:cmId` | admin, editor (ของตัวเอง) |
| GET | `/api/audit-logs` | admin |
| GET | `/api/public/menu` · `/featured` · `/sub-categories/:id/contents` · `/contents/:id` | ทุกคน |

---

## 7. ความปลอดภัยที่ทำไว้

- รหัสผ่านเก็บเป็น bcrypt hash · ล็อกอินผิด 5 ครั้งใน 15 นาที ถูกล็อกชั่วคราว
- Token ล็อกอินอยู่ใน cookie `httpOnly` + `SameSite=Strict` (JavaScript อ่านไม่ได้ / กัน CSRF)
- ทุก query ใช้ parameter (กัน SQL injection)
- เนื้อหาโพสต์ผ่าน `sanitize-html` ก่อนบันทึก (กัน XSS) · รูปในเนื้อหาต้องมาจาก `/uploads/` เท่านั้น
- ไฟล์อัปโหลดเปลี่ยนชื่อเป็น UUID, จำกัดนามสกุล/ขนาด, ไฟล์ที่ไม่ใช่รูป/PDF บังคับดาวน์โหลด
- บันทึก Audit log: LOGIN, LOGIN_FAILED, LOGOUT, CREATE, UPDATE, DELETE, VIEW

---

## 8. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `Failed to connect to localhost:1433` | ยังไม่เปิด TCP/IP หรือ service SQL Server ไม่ได้รัน (ดูหัวข้อ 1) |
| `Login failed for user 'sa'` | รหัสผิด หรือยังไม่เปิด SQL Server Authentication |
| ใช้ SQL Server Express แล้วต่อไม่ได้ | Express มักไม่ได้ใช้พอร์ต 1433 ให้ตั้ง TCP Port = 1433 ใน Configuration Manager |
| `Missing environment variable: JWT_SECRET` | ยังไม่ได้สร้างไฟล์ `.env` |
| หน้าเว็บแสดงเมนูแบบเดิม ไม่ใช่จาก DB | เปิดไฟล์ HTML ตรงๆ หรือ API ต่อ DB ไม่ได้ ต้องเปิดผ่าน `http://localhost:3000` |
| เวลาใน Audit log ไม่ตรง | ให้เครื่องที่รัน Node และ SQL Server ตั้ง timezone เดียวกัน |
