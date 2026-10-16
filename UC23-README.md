# UC23 ปล่อยเงิน

รัน `npm.cmd run test:uc23` หรือรวมทุกชุดด้วย `npm.cmd test`

เพิ่ม TC23_002 เลขอ้างอิงว่างก่อน TC23_001 ยืนยันธุรกรรมทดสอบ เพื่อไม่ให้เคสสำเร็จเปลี่ยนสถานะรายการก่อนตรวจเคสว่าง ไม่เปลี่ยนเคสเดิมที่ผ่านแล้ว

## สถานะ

เป็นโค้ดและแม่แบบข้อมูลที่ยังต้องเติมจากรายการ QA จริง ยังไม่ได้ตรวจ DOM หน้ารายละเอียดการปล่อยเงิน และไม่ได้ยืนยันการโอนเงินจริงหรือธุรกรรมทดสอบ ไม่มี Project ID / Milestone ID / Disbursement ID ที่ผู้ใช้ระบุ ผลรันทดสอบจึงยังไม่ถือว่า Pass เทสจะ Skipped หากไม่มี disbursementId และจะ Fail ก่อนกดตัดสินหากข้อมูลจำเป็นไม่ครบ

## เตรียมข้อมูลใน uc23-data.json

emptyReference และ confirmTransfer ใช้รายการคนละ ID หรือรายการเดียวกันที่ยังรอโอน โดยเทสเคสว่างก่อน ระบุค่าที่แสดงจริงพร้อม selectors เฉพาะรายการ:

- detailURL, recordSelector: หน้าที่เปิดรายการ Disbursement เฉพาะ ID โดยตรงและกรอบรายการ
- projectId / milestoneId / disbursementId และ selectors ของแต่ละ ID: ตรวจตัวตนรายการก่อนดำเนินการ
- ownerName, amountText, bankText และ selectors: ชื่อ Pioneer ยอดเงิน และบัญชีรับเงินที่ต้องตรงกับข้อมูลจริง
- statusSelector, pendingText: ข้อความสถานะรอโอนที่แสดงในระบบ
- openButtonName, modalSelector, referenceSelector, confirmButtonName: ปุ่มเปิดหน้าต่าง ช่องเลขอ้างอิง และปุ่มยืนยันจริง
- confirmedBySelector, confirmedAtSelector, referenceSavedSelector: ช่องข้อมูลที่ต้องไม่เปลี่ยนในเคสว่าง และต้องบันทึกหลังยืนยันสำเร็จ
- otherFields: `[{"selector":"ช่องบังคับอื่น", "value":"ค่าทดสอบ"}]` เพื่อแยกทดสอบเฉพาะเลขอ้างอิง
- emptyReference.referenceRequiredText: ข้อความบังคับกรอกจริง รองรับ HTML required validation ด้วย

## เคสยืนยันสำเร็จ

ใช้ BASE_URL ของระบบทดสอบและตั้ง sandboxOrigin ให้ตรงกัน เคสนี้ไม่ทำงานบน fly-up.app ใช้ transferReference จากธุรกรรมทดสอบที่โอนสำเร็จแล้ว พร้อมไฟล์หลักฐานใน testTransactionEvidence และ testTransferVerified=true เทสไม่ส่งคำสั่งโอนผ่านธนาคาร

ระบุ confirmedText, paidText, milestoneStatusSelector และ expectedAdminName ตรวจประวัติผ่าน historyURL / historyRowSelector โดยเลขอ้างอิงต้องไม่เคยมีมาก่อน เตรียม session Pioneer เจ้าของใน ownerState พร้อม ownerEmail และรายการแจ้งเตือน ownerNotificationURL / ownerNotificationSelector / ownerNotificationText ที่เฉพาะโปรเจกต์นั้น

ตั้ง isFinalPhase เป็น true หรือ false โดยชัดเจน หาก true ต้องระบุ previousPaidSelectors ทั้ง 3 เฟสก่อนหน้าในกรอบรายการ projectURL, allPhaseSelector (สถานะทั้ง 4 เฟส), projectStatusSelector, completedText พร้อม session Booster ผู้เกี่ยวข้องและข้อมูลแจ้งเตือน Booster / ข้อความแจ้งปิดโปรเจกต์ของ Pioneer

notificationSelector และ historyRowSelector ต้องเลือกหนึ่งรายการ ไม่เลือกทั้งตาราง หน้า notificationURL ต้องแสดงรายการที่โหลดเสร็จ เทสเปรียบเทียบจำนวนก่อนและหลังเพื่อยืนยันว่ามีรายการใหม่ ไม่รับรายการเก่าเป็นผลสำเร็จ

ห้ามกรอก Actual Output ว่าผ่านจากแม่แบบนี้ก่อนรันตรวจจริง สถานะ confirmed / paid / Completed ต้องตั้งข้อความตามข้อกำหนดและ UI ที่ยืนยันแล้ว
