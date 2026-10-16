const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('../scripts/env');

const projectId = process.env.COMPLAINT_PROJECT_ID || '280';
const projectName = process.env.COMPLAINT_PROJECT_NAME || 'QA-FlyUp-280-Edited';
const projectPath = `/projects/${projectId}`;
const listPath = '/booster/complaints';
const adminState = path.resolve(__dirname, '..', process.env.COMPLAINT_ADMIN_STATE || '.auth/admin.json');
const file = path.resolve(__dirname, '..', process.env.COMPLAINT_EVIDENCE_FILE || 'media/uc6-evidence.png');
const positiveTitle = 'QA ทดสอบการส่งคำร้องเรียน UC6';
const positiveDescription = 'คำร้องนี้ใช้ทดสอบการบันทึกข้อมูล การแนบหลักฐาน และการแสดงสถานะรอดำเนินการของระบบ FlyUp เท่านั้น ไม่ใช่ข้อกล่าวหาหรือข้อร้องเรียนเกี่ยวกับการดำเนินงานจริงของโปรเจกต์';
const cancelTitle = 'QA ทดสอบยกเลิกคำร้อง UC6';
const cancelDescription = 'ข้อความสำหรับทดสอบการยกเลิกก่อนส่งคำร้องเรียน โดยไม่สร้างคำร้องใหม่ในระบบ';
test.use({ storageState: path.join(__dirname, '../.auth/booster.json') });
test.describe.configure({ mode: 'default' }); // Cancel first, then submit; no shared page/context.

test.beforeEach(async ({ page }) => { await require('../scripts/cookies')(page); });

const modalHeading = page => page.getByRole('heading', { name: 'ร้องเรียนโปรเจกต์', exact: true });
const modal = page => page.locator('div').filter({ has: modalHeading(page) })
  .filter({ has: page.getByRole('button', { name: 'ยกเลิก', exact: true }) })
  .filter({ has: page.locator('textarea') }).last();

async function complaintList(page) {
  await page.goto(listPath);
  await expect(page).toHaveURL(/\/booster\/complaints\/?$/);
  await expect(page.getByRole('heading', { name: 'การร้องเรียน', exact: true })).toBeVisible();
}

async function eligibleModal(page) {
  await page.goto(projectPath);
  const heading = page.getByRole('heading', { name: projectName, exact: true });
  const unavailable = page.getByRole('heading', { name: 'ไม่พบโปรเจกต์นี้', exact: true });
  await expect(heading.or(unavailable)).toBeVisible();
  test.skip(await unavailable.isVisible(), `QA project ${projectId} is unavailable; prepare an accessible QA fixture`);
  const button = page.getByRole('button', { name: 'ร้องเรียนโปรเจกต์นี้', exact: true });
  const reported = page.getByText(/ร้องเรียน(?:โปรเจกต์นี้)?(?:ไป)?แล้ว|ส่งคำร้องเรียน.*แล้ว/).first();
  if (await reported.isVisible()) test.skip(true, 'Account already complained about this QA project');
  await expect(button, 'Booster must have complaint rights for the QA fixture').toBeVisible();
  test.skip(!(await button.isEnabled()), 'Booster is not eligible to complain about this QA project');
  await button.click();
  await expect(modalHeading(page)).toBeVisible();
  return modal(page);
}

async function fillComplaint(form, title, description) {
  // Both placeholders were inspected in the real report form.
  await form.getByPlaceholder('เช่น ข้อมูลโปรเจกต์ไม่ตรงกับความเป็นจริง', { exact: true }).fill(title);
  await form.getByPlaceholder('อธิบายสิ่งที่ต้องการรายงานให้ละเอียด (อย่างน้อย 10 ตัวอักษร)', { exact: true }).fill(description);
}

// The list/detail selectors below need confirmation once QA/Admin data exists.
async function verifyRecord(page, title, description) {
  const titleText = page.getByText(title, { exact: true }).first();
  await expect(titleText).toBeVisible();
  const details = page.locator('div,tr,article').filter({ has: titleText })
    .filter({ has: page.getByRole('button', { name: 'ดูรายละเอียด', exact: true }) }).last();
  if (await details.count()) await details.getByRole('button', { name: 'ดูรายละเอียด', exact: true }).click();
  else await titleText.click();
  const heading = page.getByRole('heading', { name: title, exact: true });
  await expect(heading).toBeVisible();
  const evidenceLinks = page.getByRole('link', { name: /^(ดูหลักฐานที่แนบ|เปิดดูหลักฐาน)$|uc6-evidence/ });
  const record = page.locator('main,div').filter({ has: heading })
    .filter({ has: page.getByText(description, { exact: false }) })
    .filter({ has: evidenceLinks }).last();
  await expect(record).toContainText(projectName);
  await expect(record).toContainText(description);
  await expect(record).toContainText('รอดำเนินการ');
  // Uploaded evidence is renamed by storage; Admin exposes a generic link.
  const attachment = record.getByRole('link', { name: /^(ดูหลักฐานที่แนบ|เปิดดูหลักฐาน)$|uc6-evidence/ }).first();
  await expect(attachment).toBeVisible();
  const href = await attachment.getAttribute('href');
  expect(href, 'Saved evidence link must exist').toBeTruthy();
  expect(new URL(href, page.url()).protocol).toMatch(/^https?:$/);
  return new URL(href, page.url()).href;
}

test('TC6_002 cancel complaint without creating a record', async ({ page }, info) => {
  await complaintList(page);
  await expect(page.getByText(cancelTitle, { exact: true })).toHaveCount(0);
  const before = await page.locator('h2,h3').allTextContents();
  const writes = [];
  const listener = request => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && (request.postData() || '').includes(cancelTitle)) {
      writes.push({ method: request.method(), pathname: new URL(request.url()).pathname });
    }
  };
  page.on('request', listener);
  try {
    const form = await eligibleModal(page);
    await fillComplaint(form, cancelTitle, cancelDescription);
    await form.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(modalHeading(page)).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/?$`));
    await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
    await complaintList(page);
    await expect(page.getByText(cancelTitle, { exact: true })).toHaveCount(0);
    expect(writes, 'Cancel must not send a write containing the complaint title').toEqual([]);
    await info.attach('cancel-comparison', {
      body: JSON.stringify({ beforeHeadings: before, afterHeadings: await page.locator('h2,h3').allTextContents(), writes }, null, 2),
      contentType: 'application/json'
    });
  } finally { page.off('request', listener); }
});

test('TC6_001 submit QA complaint and verify same record in Admin', async ({ page, browser }, info) => {
  // Verify all external prerequisites BEFORE creating a one-per-account complaint.
  let adminList = process.env.COMPLAINT_ADMIN_LIST_URL;
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.AUTO_LOGIN !== 'false') {
    const adminLogin = await require('../scripts/admin-login')(browser);
    adminList = adminLogin.listURL;
  } else {
    const savedLocation = path.join(__dirname, '../.auth/admin-location.json');
    if (!adminList && fs.existsSync(savedLocation)) adminList = JSON.parse(fs.readFileSync(savedLocation, 'utf8')).listURL;
  }
  test.skip(!fs.existsSync(adminState) || !adminList, 'Requires verified Admin session and COMPLAINT_ADMIN_LIST_URL; no complaint submitted');
  expect(fs.existsSync(file), 'Prepare a supported QA evidence file').toBeTruthy();
  const adminContext = await browser.newContext({ storageState: adminState, baseURL: process.env.BASE_URL || 'https://www.fly-up.app' });
  try {
    const admin = await adminContext.newPage();
    await require('../scripts/cookies')(admin);
    await admin.goto(adminList);
    expect(new URL(admin.url()).pathname, 'Admin URL must remain in Admin area').toMatch(/^\/admin(?:\/|$)/);
    await expect(admin.getByRole('heading', { name: /คำร้องเรียน|การร้องเรียน/ }).first()).toBeVisible();
    await complaintList(page);
    const evidenceURL = process.env.COMPLAINT_EVIDENCE_URL;
    if (await page.getByText(positiveTitle, { exact: true }).isVisible()) {
      info.annotations.push({ type: 'reused-complaint', description: 'Verifying the existing QA complaint; no new submission is tested in this run.' });
    } else {
    const form = await eligibleModal(page);
    await fillComplaint(form, positiveTitle, positiveDescription);
    await form.locator('input[type="file"]').setInputFiles(file);
    await expect(form.getByText(path.basename(file), { exact: false })).toBeVisible();
    const link = form.locator('input[type="url"]');
    if (evidenceURL && await link.count()) {
      expect(new URL(evidenceURL).protocol).toMatch(/^https?:$/);
      await link.fill(evidenceURL);
    }
    await expect(form.getByRole('button', { name: 'ส่งคำร้องเรียน', exact: true })).toBeEnabled();
    await form.getByRole('button', { name: 'ส่งคำร้องเรียน', exact: true }).click();
    const confirm = page.getByRole('button', { name: /^(ยืนยัน|ยืนยันการส่งคำร้องเรียน)$/ }).first();
    await expect.poll(async () => {
      if (await confirm.isVisible()) return 'confirm';
      if (!(await modalHeading(page).isVisible())) return 'closed';
      return 'pending';
    }, { timeout: 30_000 }).toMatch(/^(confirm|closed)$/);
    if (await confirm.isVisible()) await confirm.click();
    await expect(modalHeading(page)).not.toBeVisible();
    await complaintList(page);
    }
    const boosterEvidence = await verifyRecord(page, positiveTitle, positiveDescription);
    await admin.goto(adminList);
    const adminEvidence = await verifyRecord(admin, positiveTitle, positiveDescription);
    expect(adminEvidence, 'Admin must see the same saved evidence').toBe(boosterEvidence);
    if (evidenceURL) {
      await expect(admin.getByRole('link', { name: evidenceURL, exact: true })).toBeVisible();
    }
    await info.attach('complaint-match', { body: JSON.stringify({ projectId, title: positiveTitle, status: 'รอดำเนินการ', boosterEvidence, adminEvidence }, null, 2), contentType: 'application/json' });
    // Do not approve/reject/delete the complaint.
  } finally { await adminContext.close(); }
});
