# UC6 ส่งคำร้องเรียน

ตั้งค่า .env ให้ใช้ storemate - เพื่อนคู่คลัง ID51 ตามที่ผู้ใช้เลือกแทน QA ID280 ซึ่งเปิดไม่ได้ ตรวจบนเว็บจริงแล้วว่าบัญชี Booster เปิดฟอร์มร้องเรียน ID51 ได้ ยังไม่ได้ส่งคำร้องในรอบนี้

รันเฉพาะ UC6: `npm.cmd run test:uc6`
รันทุกไฟล์: `npm.cmd run test:all`

TC6_002 ทดสอบยกเลิกก่อน TC6_001 เพราะระบบอนุญาตให้ร้องเรียนโปรเจกต์หนึ่งได้เพียงครั้งเดียว TC6_001 จะส่งข้อความที่ระบุชัดว่าเป็นการทดสอบ QA พร้อม media/uc6-evidence.png และตรวจข้อมูลฝั่ง Booster กับ Admin โดยไม่ตัดสินคำร้อง

```dotenv
COMPLAINT_PROJECT_ID=51
COMPLAINT_PROJECT_NAME=storemate - เพื่อนคู่คลัง
COMPLAINT_EVIDENCE_FILE=media/uc6-evidence.png
COMPLAINT_ADMIN_STATE=.auth/admin.json
```

Admin ล็อกอินอัตโนมัติจาก ADMIN_EMAIL และ ADMIN_PASSWORD ใน .env ตรวจเฉพาะการล็อกอินได้ด้วย `npm.cmd run login:admin` เทสตรวจสิทธิ์ Admin ก่อนส่งคำร้อง

ฟอร์มและหน้า Admin ตรวจ selectors จากเว็บจริงแล้ว แต่ยังไม่ได้ยืนยัน E2E ทั้งสองเคสผ่านครบ ผล Skipped เมื่อโปรเจกต์เปิดไม่ได้ หมดสิทธิ์ หรือร้องเรียนแล้ว ไม่ถือเป็น Pass หลังส่งสำเร็จต้องเปลี่ยนข้อมูลทดสอบที่มีสิทธิ์เพื่อรันซ้ำ
