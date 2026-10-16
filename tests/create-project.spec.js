const { test, expect } = require('@playwright/test');
const ui = require('../scripts/ui');
const data = require('../test-data.json');
const path = require('node:path');
require('../scripts/env');

// Keep UC14 on the Pioneer session even when launched by an editor that
// selects the investment config and its Booster storageState.
test.use({ storageState: path.join(__dirname, '../.auth/pioneer.json') });
test.setTimeout(300_000);
test.beforeAll(async ({ }, info) => {
    if (!['playwright.uc14.config.js', 'playwright.uc14-002.config.js', 'playwright.uc14-all.config.js', 'playwright.all.config.js'].includes(path.basename(info.config.configFile)) && process.env.AUTO_LOGIN !== 'false') {
        await require('../scripts/google-login')();
    }
});

test.beforeEach(async ({ page }) => { await ui.cookies(page); });

test('TC14_001 create draft, persist all fields and 4 phases', async ({ page }, info) => {
    const name = `UC14-001-${Date.now()}`;
    const id = await ui.newDraft(page, name);
    await info.attach('created-draft', { body: JSON.stringify({ id, name }), contentType: 'application/json' });
    await ui.basics(page);
    await ui.story(page, id);
    for (let p = 0; p < 4; p++) await ui.phase(page, id, p, true);
    await ui.draftRow(page, name);
    await page.goto(`/project/overview/${id}/step/1`);
    await expect(page.getByTestId('basics-title-input')).toHaveValue(name);
    for (const [field, value] of [
        ['basics-funding-goal-input', data.targetAmount], ['basics-soft-cap-input', data.softCap],
        ['basics-project-duration-input', 4], ['basics-campaign-duration-input', 30], ['basics-revenue-share-input', 5]
    ]) await expect.poll(async () => ui.number(await page.getByTestId(field).inputValue())).toBe(value);
    await expect(page.getByRole('button', { name: 'Web Application', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'cover', exact: true })).toBeVisible();
    await expect(ui.galleryImages(page)).toHaveCount(1);
    await page.goto(`/project/overview/${id}/step/2`);
    await expect(page.locator('[contenteditable="true"]')).toContainText('โปรเจกต์ทดสอบ UC14');
    await expect(page.locator('textarea:not([data-testid])')).toHaveValue(/ความเสี่ยงด้านระยะเวลา/);
    await expect(page.getByText(/^Q:\s*โปรเจกต์ใช้เพื่ออะไร$/)).toBeVisible();
    await expect(page.getByText(/^A:\s*ใช้ทดสอบการสร้างและบันทึกแบบร่าง UC14 เท่านั้น$/)).toBeVisible();
    for (let p = 0; p < 4; p++) await ui.phase(page, id, p);
    // Never click ส่งคำขอสร้างโปรเจกต์ in this case.

});
test('TC14_002 incomplete phases 3-4 must block submission', async ({ page }, info) => {
    const name = `UC14-002-${Date.now()}`;
    const id = await ui.newDraft(page, name);
    await info.attach('created-draft', { body: JSON.stringify({ id, name }), contentType: 'application/json' });
    await ui.basics(page);
    await ui.story(page, id);
    for (let p = 0; p < 2; p++) await ui.phase(page, id, p, true);
    for (let p = 3; p <= 4; p++) {
        await page.goto(`/project/overview/${id}/step/3?phase=${p}`);
        await expect(page.getByRole('heading', { name: `Milestone ${p}`, exact: true })).toBeVisible();
        await expect(page.locator('input[maxlength="50"]')).toHaveValue('');
        await expect(page.locator('textarea')).toHaveValue('');
        await expect(page.locator('input[inputmode="numeric"]')).toHaveValue('');
        await expect(page.locator('input.flex-grow')).toHaveValue('');
    }
    await page.goto(`/project/overview/${id}/step/4`);
    // Accepting terms isolates milestone validation from unchecked-terms blocking.
    // Running this test accepts actual creation terms but does not submit/publish.
    await page.getByRole('checkbox', { name: /ข้าพเจ้าได้อ่านและยอมรับข้อตกลง/ }).check();
    const submit = page.getByRole('button', { name: 'ส่งคำขอสร้างโปรเจกต์', exact: true });
    await expect(submit, 'Must block submission because mandatory phase 3-4 fields are empty').toBeDisabled();
    const incompleteReason = page.getByText(/(?:Milestone|ไมล์สโตน|Phase).*(?:ไม่ครบ|ครบ.*4|ขาด|กรอก)|(?:กรอก|ขาด).*(?:Milestone|ไมล์สโตน|Phase)/i).first();
    await info.attach('incomplete-milestone-state', {
        body: JSON.stringify({ draftId: id, completedPhases: 2,
            emptyPhases: [3, 4], submitDisabled: await submit.isDisabled(),
            originalRequirement: 'Show why mandatory milestones are incomplete' }, null, 2),
        contentType: 'application/json'
    });
    await info.attach('incomplete-milestone-screen', {
        body: await page.screenshot(), contentType: 'image/png'
    });
    // Missing explanatory text is a product requirement failure, not a reason
    // to skip Draft persistence checks or silently mark the test as passed.
    await expect.soft(incompleteReason,
        'TC14_002: submission is disabled, but the UI must also explain that Phase 3-4 are incomplete. Milestone: 2 alone is not an explanation.'
    ).toBeVisible({ timeout: 5_000 });
    // Do not click an enabled submit button on production; report failure instead.
    await ui.draftRow(page, name);
    await ui.phase(page, id, 0);
    await ui.phase(page, id, 1);
    info.annotations.push({ type: 'scope', description: 'No submission click performed. Admin queue was not accessed; Draft persistence and UI blocking checked.' });
});
