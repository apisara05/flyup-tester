const { expect } = require('@playwright/test');
const path = require('node:path');
const data = require('../test-data.json');
const number = value => Number(value.replace(/[^\d.]/g, ''));
const listPath = '/pioneer/dashboard/projects';
const galleryImages = page => page.locator('img[src*="/flyup/projects/"]:not([alt="cover"])');

async function cookies(page) {
  const accept = page.getByRole('button', { name: /^(ยอมรับทั้งหมด|ยอมรับคุกกี้ทั้งหมด|Accept all|Accept all cookies)$/i }).first();
  await page.addLocatorHandler(accept, button => button.click());
}

// Wait for a write response containing the edited value, then the saved UI.
// This serializes edits instead of starting several autosaves simultaneously.
async function save(page, action, value) {
  const responsePromise = page.waitForResponse(response => {
    const request = response.request();
    if (!['POST', 'PUT', 'PATCH'].includes(request.method())) return false;
    const raw = request.postData();
    if (!raw) return false;
    try { return JSON.stringify(request.postDataJSON()).includes(String(value)); }
    catch { return raw.includes(String(value)); }
  }, { timeout: 60_000 });
  // Attach a rejection handler immediately if the action itself fails.
  responsePromise.catch(() => { });
  await action();
  const response = await responsePromise;
  expect(response.ok(), `Autosave HTTP ${response.status()}: ${new URL(response.url()).pathname}`).toBeTruthy();
  await expect(page.getByText('กำลังบันทึก...', { exact: true })).toHaveCount(0);
}

async function fill(page, locator, value, numeric = false) {
  await expect(locator).toBeVisible();
  // An unchanged server value need not trigger another autosave request.
  const current = await locator.evaluate(element => element.isContentEditable ? element.innerText : element.value);
  if (numeric ? number(current) === Number(value) && current.trim() !== '' : current === String(value)) return;
  await save(page, async () => {
    // Focus first so the masked input can remove its formatting. Insert the
    // complete number in one event; per-character typing can trigger clamping
    // (e.g. the intended 30 became 60) before all digits have been entered.
    if (numeric) {
      await locator.click();
      await expect(locator).toBeFocused();
      await locator.press('ControlOrMeta+A');
      await page.keyboard.insertText(String(value));
    } else await locator.fill(String(value));
    await locator.press('Tab');
    if (numeric) {
      await expect.poll(async () => number(await locator.inputValue()), {
        timeout: 5_000,
        message: `Numeric input did not keep ${value}; check field validation or formatting before waiting for autosave`
      }).toBe(Number(value));
    } else if (await locator.evaluate(element => element.isContentEditable)) {
      await expect(locator).toHaveText(String(value));
    } else {
      await expect(locator).toHaveValue(String(value));
    }
  }, value);
}

async function newDraft(page, name) {
  await page.goto(listPath);
  await expect(page.getByRole('heading', { name: 'โปรเจกต์ของฉัน', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'สร้างโปรเจกต์ใหม่', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/overview\/\d+$/);
  const id = page.url().match(/\/overview\/(\d+)/)[1];
  await page.getByRole('link', { name: /^ข้อมูลพื้นฐาน/ }).click();
  await fill(page, page.getByTestId('basics-title-input'), name);
  return id;
}

async function basics(page) {
  await fill(page, page.getByTestId('basics-description-input'), 'ระบบทดสอบการบันทึกโปรเจกต์แบบร่าง');
  await page.getByRole('button', { name: 'เลือกหมวดหมู่', exact: true }).click();
  await save(page, () => page.getByText('Web Application', { exact: true }).click(), '');
  for (const [id, value] of [
    ['basics-funding-goal-input', 100000], ['basics-project-duration-input', 4],
    ['basics-soft-cap-input', 70000], ['basics-campaign-duration-input', 30], ['basics-revenue-share-input', 5]
  ]) await fill(page, page.getByTestId(id), value, true);
  await expect.poll(async () => number(await page.getByTestId('basics-soft-cap-input').inputValue())).toBe(70000);
  await page.getByTestId('basics-cover-image-input').setInputFiles(path.join(__dirname, '../media/cover.png'));
  await expect(page.getByRole('img', { name: 'cover', exact: true })).toBeVisible();
  await expect(page.getByText('กำลังอัปโหลดรูปปก...', { exact: true })).toHaveCount(0);
  await page.getByTestId('basics-additional-images-input').setInputFiles(path.join(__dirname, '../media/detail.png'));
  await expect(galleryImages(page)).toHaveCount(1);
  await expect(page.getByText('กำลังอัปโหลดรูปภาพ...', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ถัดไป', exact: true })).toBeVisible();
  await page.reload();
  await expect.poll(async () => number(await page.getByTestId('basics-soft-cap-input').inputValue())).toBe(70000);
  await expect(page.getByRole('img', { name: 'cover', exact: true })).toBeVisible();
  await expect(galleryImages(page)).toHaveCount(1);
}

async function story(page, id) {
  await page.goto(`/project/overview/${id}/step/2`);
  await fill(page, page.locator('[contenteditable="true"]'), 'โปรเจกต์ทดสอบ UC14 สำหรับตรวจการบันทึกแบบร่าง ข้อมูลนี้ใช้ทดสอบเท่านั้น ไม่เปิดระดมทุนจริง');
  await fill(page, page.locator('textarea:not([data-testid])'), 'ความเสี่ยงด้านระยะเวลาพัฒนาและการทดสอบ จัดการโดยติดตามงานรายสัปดาห์');
  await page.getByTestId('faq-question-input').fill('โปรเจกต์ใช้เพื่ออะไร');
  await page.getByTestId('faq-answer-input').fill('ใช้ทดสอบการสร้างและบันทึกแบบร่าง UC14 เท่านั้น');
  await save(page, () => page.getByTestId('faq-add-btn').click(), 'โปรเจกต์ใช้เพื่ออะไร');
}

async function phase(page, id, index, write = false) {
  await page.goto(`/project/overview/${id}/step/3?phase=${index + 1}`);
  const title = page.locator('input[maxlength="50"]');
  await expect(page.getByRole('heading', { name: `Milestone ${index + 1}`, exact: true })).toBeVisible();
  const row = data.milestones[index];
  const fields = [title, page.locator('textarea'), page.locator('input[inputmode="numeric"]'), page.locator('input.flex-grow')];
  const values = [row.name, row.description, '30', row.acceptanceCriteria];
  if (write) {
    for (let i = 0; i < fields.length; i++) await fill(page, fields[i], values[i]);
    await page.reload();
  }
  // Persistence checks are mandatory even when the page previously said saved.
  for (let i = 0; i < fields.length; i++) await expect(fields[i]).toHaveValue(values[i]);
}

async function draftRow(page, name) {
  await page.goto(listPath);
  const heading = page.getByRole('heading', { name, exact: true });
  await expect(heading).toBeVisible();
  const row = page.locator('div').filter({ has: heading }).filter({ has: page.getByRole('button', { name: /^(แก้ไข|แก้ไขโปรเจกต์)$/ }) }).last();
  await expect(row).toContainText('แบบร่าง');
  await row.getByRole('button', { name: /^(แก้ไข|แก้ไขโปรเจกต์)$/ }).click();
}
module.exports = { cookies, fill, newDraft, basics, story, phase, draftRow, number, listPath, galleryImages };
