const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('../scripts/env');
const fixtures = require('../uc21-data.json');

// Exact fixture URLs/selectors must come from the prepared QA records.
// No automatic selection of an arbitrary pending production project.
test.describe.configure({ mode: 'default' });
for (const [key, title] of [
  ['approve', 'TC21_001 approve complete project and publish Funding'],
  ['reject', 'TC21_002 reject project with reason'],
  ['edit', 'TC21_003 approve project edit request']
]) {
  test(title, async ({ browser }, info) => {
    const d = fixtures[key];
    test.skip(!d.projectId, `Set ${key} in uc21-data.json with an authorized QA fixture`);
    const required = ['name', 'ownerEmail', 'ownerName', 'reviewURL', 'reviewSelector',
      'identitySelector', 'statusSelector', 'pendingText', 'resultText', 'actionName',
      'confirmName', 'ownerURL', 'ownerSelector', 'ownerStatusSelector',
      'notificationURL', 'notificationSelector', 'notificationText',
      'auditSelector', 'auditActionText', 'ownerState'];
    for (const field of required) expect(d[field], `${key}.${field} must be configured before any decision`).toBeTruthy();
    expect(String(d.projectId)).toMatch(/^\d+$/);
    expect(d.reviewTexts.length, 'Expected basic data, story and funding terms are required').toBeGreaterThan(0);
    expect(d.mediaSelector, 'Use a selector for the actual project media').toBeTruthy();
    expect(d.phases, 'Specify all four expected milestone names').toHaveLength(4);
    if (key === 'reject') {
      expect(d.reason).toBeTruthy();
      expect(d.reasonSelector).toBeTruthy();
      expect(d.publicUnavailableText).toBeTruthy();
    }
    if (key === 'edit') {
      expect(d.requestId).toBeTruthy();
      expect(d.requestIdentityText).toBeTruthy();
      expect(d.changes.length).toBeGreaterThan(0);
      expect(d.unchanged.length, 'Specify public fields that must remain unchanged').toBeGreaterThan(0);
      expect(d.pendingRequestSelector).toBeTruthy();
    }
    const ownerState = path.resolve(__dirname, '..', d.ownerState);
    expect(fs.existsSync(ownerState), 'Prepare the correct Pioneer owner session').toBeTruthy();
    const adminLogin = await require('../scripts/admin-login')(browser);
    const baseURL = process.env.BASE_URL || 'https://www.fly-up.app';
    const contexts = [];
    try {
      const adminContext = await browser.newContext({ baseURL, storageState: adminLogin.statePath });
      const ownerContext = await browser.newContext({ baseURL, storageState: ownerState });
      const guestContext = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      contexts.push(adminContext, ownerContext, guestContext);
      const admin = await adminContext.newPage();
      const owner = await ownerContext.newPage();
      const guest = await guestContext.newPage();
      for (const page of [admin, owner, guest]) await require('../scripts/cookies')(page);
      await owner.goto('/pioneer/profile');
      await expect(owner.getByRole('heading', { name: 'ตั้งค่าโปรไฟล์', exact: true })).toBeVisible();
      await expect.poll(() => owner.locator('input[disabled]').evaluateAll(es => es.map(e => e.value)),
        { message: 'Session must belong to the specified Pioneer owner' }).toContain(d.ownerEmail);
      await owner.goto(d.ownerURL);
      await expect(owner.locator(d.ownerSelector)).toContainText(d.name);
      await owner.goto(d.notificationURL);
      const notices = owner.locator(d.notificationSelector).filter({ hasText: d.notificationText });
      const beforeNotices = await notices.count();
      await admin.goto('/admin/audit-logs');
      const audit = admin.locator(d.auditSelector).filter({ hasText: d.name }).filter({ hasText: d.auditActionText });
      const beforeAudit = await audit.count();
      await admin.goto(d.reviewURL);
      const review = admin.locator(d.reviewSelector);
      await expect(review).toHaveCount(1);
      await expect(review.locator(d.identitySelector)).toHaveText(d.projectIdentityText || String(d.projectId));
      await expect(review).toContainText(d.name);
      await expect(review).toContainText(d.ownerName);
      await expect(review.locator(d.statusSelector)).toHaveText(d.pendingText);
      for (const text of [...d.reviewTexts, ...d.phases]) await expect(review).toContainText(text);
      const media = review.locator(d.mediaSelector);
      await expect(media.first()).toBeVisible();
      for (const image of await media.all()) {
        await expect.poll(() => image.evaluate(e => e.complete && e.naturalWidth > 0)).toBe(true);
      }
      const publicURL = `/projects/${d.projectId}`;
      const unchangedBefore = [];
      if (key === 'edit') {
        await expect(review).toContainText(d.requestIdentityText);
        for (const change of d.changes) {
          await expect(review.locator(change.oldSelector)).toHaveText(change.old);
          await expect(review.locator(change.newSelector)).toHaveText(change.new);
        }
        await guest.goto(publicURL);
        for (const change of d.changes) await expect(guest.locator(change.publicSelector)).toHaveText(change.old);
        for (const field of d.unchanged) unchangedBefore.push(await guest.locator(field.selector).innerText());
      }
      if (key === 'reject') await review.locator(d.reasonSelector).fill(d.reason);
      await review.getByRole('button', { name: d.actionName, exact: true }).click();
      // Require the expected confirmation, never click a generic first button.
      const confirmation = admin.locator(d.confirmSelector || '[role="dialog"]');
      await expect(confirmation).toBeVisible();
      await confirmation.getByRole('button', { name: d.confirmName, exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await admin.goto(d.reviewURL);
      if (key === 'edit') await expect(admin.locator(d.pendingRequestSelector)).toHaveCount(0);
      else await expect(admin.locator(d.reviewSelector).locator(d.statusSelector)).toHaveText(d.resultText);
      await owner.goto(d.ownerURL);
      const ownerRecord = owner.locator(d.ownerSelector);
      await expect(ownerRecord).toContainText(d.name);
      await expect(ownerRecord.locator(d.ownerStatusSelector)).toHaveText(d.resultText);
      if (key === 'reject') await expect(ownerRecord).toContainText(d.reason);
      await guest.goto(publicURL);
      if (key === 'reject') {
        await expect(guest.getByText(d.publicUnavailableText, { exact: true })).toBeVisible();
        await expect(guest.getByRole('button', { name: 'ลงทุนโปรเจกต์นี้', exact: true })).toHaveCount(0);
      } else {
        await expect(guest.getByRole('heading', { name: d.publicName || d.name, exact: true })).toBeVisible();
        await expect(guest.getByRole('button', { name: 'ลงทุนโปรเจกต์นี้', exact: true })).toBeVisible();
        for (const text of d.publicTexts) await expect(guest.locator('main, #root').first()).toContainText(text);
        if (key === 'edit') {
          for (const change of d.changes) await expect(guest.locator(change.publicSelector)).toHaveText(change.new);
          for (let i = 0; i < d.unchanged.length; i++) await expect(guest.locator(d.unchanged[i].selector)).toHaveText(unchangedBefore[i]);
        }
      }
      await expect(async () => {
        await owner.goto(d.notificationURL);
        expect(await notices.count(), 'A new owner notification must be created').toBeGreaterThan(beforeNotices);
      }).toPass({ timeout: 30_000 });
      if (key === 'reject') await expect(notices.last()).toContainText(d.reason);
      await expect(async () => {
        await admin.goto('/admin/audit-logs');
        expect(await audit.count(), 'A new matching audit entry must be created').toBeGreaterThan(beforeAudit);
      }).toPass({ timeout: 30_000 });
      await info.attach('uc21-result', { body: JSON.stringify({ projectId: d.projectId, requestId: d.requestId,
        ownerEmail: d.ownerEmail, result: d.resultText, action: key }), contentType: 'application/json' });
    } finally { await Promise.all(contexts.map(context => context.close())); }
  });
}
