# UC21 ตรวจสอบโปรเจกต์

รันด้วย `npm.cmd run test:uc21` หรือรันรวมด้วย `npm.cmd test`

เพิ่ม TC21_001 อนุมัติ, TC21_002 ปฏิเสธพร้อมเหตุผล และ TC21_003 อนุมัติแก้ไข โดยแยก session Admin, Pioneer และผู้ชมสาธารณะ แต่ละเคสตรวจการแจ้งเตือนใหม่และบันทึกตรวจสอบใหม่เทียบก่อนดำเนินการ

## สถานะการเตรียม

ยังไม่ได้รันการอนุมัติ/ปฏิเสธจริง และยังไม่ได้ยืนยัน selectors หน้ารายละเอียด UC21 เพราะไม่มี Project ID / Request ID ที่เตรียมไว้ หน้าจอ Admin เดิมแสดงเมนูจริง `/admin/projects-approval`, `/admin/project-edit-requests` และ `/admin/audit-logs` แต่ session เบราว์เซอร์ปัจจุบันเปลี่ยนบัญชีและถูกส่งกลับหน้าแรกเมื่อเปิดหน้า Admin

ไฟล์ `uc21-data.json` เป็นแม่แบบที่ต้องเติมจากรายการ QA จริง เทสจะ Skipped เมื่อยังไม่มี projectId และจะ Fail ก่อนกดตัดสินหากข้อมูลจำเป็นไม่ครบ ผล Skipped ไม่ใช่ Pass ห้ามนำข้อความ Actual Output ในเอกสารมาใช้ยืนยันว่าทดสอบผ่านแล้ว

## ข้อมูลที่ต้องระบุ

- approve และ reject ต้องเป็นโปรเจกต์ pending_review คนละ ID; edit ต้องระบุ Project ID และ Request ID ที่ยังรอพิจารณา
- name, ownerName, ownerEmail ต้องตรงกับโปรเจกต์จริง ownerState เป็นไฟล์ session ของ Pioneer เจ้าของนั้น
- reviewURL ต้องเป็นหน้าที่เปิดคำขอเฉพาะรายการโดยตรง และยังตรวจผลได้หลังตัดสิน reviewSelector เป็นกรอบรายละเอียดของรายการนั้น identitySelector เป็นข้อความ Project ID ที่แน่นอน
- statusSelector, pendingText, resultText ใช้ข้อความสถานะที่ระบบแสดงจริง ต้องยืนยันก่อนว่าสถานะปฏิเสธเป็น rejected หรือ Draft ไม่ควรเดา
- reviewTexts ระบุชื่อ/คำอธิบาย หมวดหมู่ เป้าหมาย Soft Cap ระยะเวลา ส่วนแบ่งกำไร เรื่องราวและเงื่อนไขที่คาดหวัง phases ใส่ชื่อ Milestone ทั้ง 4 mediaSelector เลือก img ของโปรเจกต์เท่านั้น
- actionName และ confirmName เป็นชื่อปุ่มตรงตัว confirmSelector เป็นกรอบหน้าต่างยืนยัน หากเว้นว่างจะใช้ `[role="dialog"]` ต้องตรวจว่าตรงกับ DOM จริง
- ownerURL และ ownerSelector ใช้หน้ารายละเอียดของ Pioneer ownerStatusSelector เลือกสถานะภายในกรอบนั้น
- notificationURL ต้องแสดงรายการแจ้งเตือนที่โหลดเสร็จ notificationSelector เลือกหนึ่งรายการ notificationText ต้องเฉพาะเจาะจงต่อโปรเจกต์และผลตัดสิน auditSelector เลือกหนึ่งแถวในบันทึกตรวจสอบ auditActionText ระบุการกระทำที่ต้องการตรวจ
- publicTexts ใส่ข้อมูลที่ต้องปรากฏสาธารณะหลังอนุมัติ publicUnavailableText ใช้ข้อความเมื่อเปิดโปรเจกต์ที่ถูกปฏิเสธแบบไม่ล็อกอิน
- reject.reasonSelector เป็นช่องเหตุผลที่อยู่ในกรอบ reviewSelector
- edit.requestIdentityText ต้องระบุ Request ID ที่แสดงจริง pendingRequestSelector เลือกคำขอ ID นี้เฉพาะสถานะรอพิจารณา

รูปแบบ edit.changes:

```json
[{"oldSelector":"selector ค่าเดิมในหน้าเปรียบเทียบ", "newSelector":"selector ค่าใหม่ในหน้าเปรียบเทียบ", "publicSelector":"selector ช่องบนหน้าสาธารณะ", "old":"ค่าเดิม", "new":"ค่าใหม่"}]
```

รูปแบบ edit.unchanged: `[{"selector":"selector ของช่องสาธารณะที่ต้องไม่เปลี่ยน"}]`

Selectors ในแม่แบบยังไม่ได้กำหนดเพื่อไม่แสร้งว่าตรวจเว็บจริงครบแล้ว เมื่อระบุ fixture และตรวจ DOM จริงครบจึงรัน E2E ได้ เคสทำการตัดสินจริงบน BASE_URL ที่ตั้งไว้ ไม่รันซ้ำกับรายการที่ตัดสินแล้ว ควรเตรียม fixture ใหม่สำหรับแต่ละรอบ
