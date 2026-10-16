const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
require('../scripts/env');
const data = require('../uc23-data.json');

test.describe.configure({ mode: 'default' });

function configured(d, fields) {
  for (const field of fields) expect(d[field], `Configure uc23-data.json: ${field}`).toBeTruthy();
}

function targetURL(value) {
  const base = new URL(process.env.BASE_URL || 'https://www.fly-up.app');
  const url = new URL(value, base);
  expect(url.origin, 'Fixture must belong to BASE_URL').toBe(base.origin);
  return url.href;
}

async function openRecord(page, d) {
  await page.goto(targetURL(d.detailURL));
  const record = page.locator(d.recordSelector);
  await expect(record).toHaveCount(1);
  for (const [selector, value] of [
    [d.projectIdSelector, d.projectId], [d.milestoneIdSelector, d.milestoneId],
    [d.disbursementIdSelector, d.disbursementId], [d.ownerSelector, d.ownerName],
    [d.amountSelector, d.amountText], [d.bankSelector, d.bankText]
  ]) await expect(record.locator(selector)).toHaveText(String(value));
  return record;
}

async function session(browser) {
  const result = await require('../scripts/admin-login')(browser);
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'https://www.fly-up.app', storageState: result.statePath
  });
  const page = await context.newPage();
  await require('../scripts/cookies')(page);
  return { context, page };
}

const common = ['projectId', 'milestoneId', 'disbursementId', 'detailURL', 'recordSelector',
  'projectIdSelector', 'milestoneIdSelector', 'disbursementIdSelector', 'ownerSelector',
  'ownerName', 'amountSelector', 'amountText', 'bankSelector', 'bankText', 'statusSelector',
  'pendingText', 'openButtonName', 'modalSelector', 'referenceSelector', 'confirmButtonName',
  'confirmedBySelector', 'confirmedAtSelector', 'referenceSavedSelector'];

// Negative case first so the positive decision cannot consume its pending fixture.
test('TC23_002 empty transfer reference must block confirmation', async ({ browser }, info) => {
  const d = data.emptyReference;
  test.skip(!d.disbursementId, 'Prepare a pending QA disbursement in uc23-data.json');
  configured(d, [...common, 'referenceRequiredText']);
  const { context, page } = await session(browser);
  try {
    const record = await openRecord(page, d);
    await expect(record.locator(d.statusSelector)).toHaveText(d.pendingText);
    const selectors = [d.referenceSavedSelector, d.confirmedBySelector, d.confirmedAtSelector];
    const before = await Promise.all(selectors.map(selector => record.locator(selector).innerText()));
    await record.getByRole('button', { name: d.openButtonName, exact: true }).click();
    const modal = page.locator(d.modalSelector);
    await expect(modal).toBeVisible();
    const reference = modal.locator(d.referenceSelector);
    await reference.fill('');
    await expect(reference).toHaveValue('');
    for (const field of d.otherFields) await modal.locator(field.selector).fill(field.value);
    const confirm = modal.getByRole('button', { name: d.confirmButtonName, exact: true });
    if (await confirm.isEnabled()) await confirm.click();
    // Either an explicit UI explanation or native HTML required validation is valid.
    await expect.poll(async () => {
      const message = modal.getByText(d.referenceRequiredText, { exact: false });
      if (await message.isVisible()) return true;
      return reference.evaluate(e => e.required && e.validity.valueMissing && !e.checkValidity());
    }, { message: 'An empty reference must be blocked with an explanation' }).toBe(true);
    await expect(modal).toBeVisible();
    const saved = await openRecord(page, d);
    await expect(saved.locator(d.statusSelector)).toHaveText(d.pendingText);
    for (let i = 0; i < selectors.length; i++) await expect(saved.locator(selectors[i])).toHaveText(before[i]);
    await info.attach('empty-reference-result', { body: JSON.stringify({
      disbursementId: d.disbursementId, status: d.pendingText, confirmationUnchanged: true
    }), contentType: 'application/json' });
  } finally { await context.close(); }
});

test('TC23_001 confirm test transfer and complete final phase when applicable', async ({ browser }, info) => {
  const d = data.confirmTransfer;
  test.skip(!d.disbursementId, 'Prepare a pending QA disbursement and real test transaction reference');
  configured(d, [...common, 'sandboxOrigin', 'transferReference', 'testTransactionEvidence',
    'confirmedText', 'paidText', 'milestoneStatusSelector', 'expectedAdminName',
    'historyURL', 'historyRowSelector', 'ownerState', 'ownerEmail', 'ownerNotificationURL',
    'ownerNotificationSelector', 'ownerNotificationText']);
  // This user-run test records a completed test transfer; it never initiates a bank transfer.
  const baseOrigin = new URL(process.env.BASE_URL || 'https://www.fly-up.app').origin;
  expect(baseOrigin, 'Positive confirmation requires the explicitly configured test origin').toBe(new URL(d.sandboxOrigin).origin);
  expect(new URL(baseOrigin).hostname, 'Use a test system for financial confirmation').not.toMatch(/(^|\.)fly-up\.app$/i);
  expect(d.testTransferVerified, 'Verify the completed test transaction and reference first').toBe(true);
  expect(typeof d.isFinalPhase, 'Explicitly state whether this is the final phase').toBe('boolean');
  expect(fs.existsSync(path.resolve(__dirname, '..', d.testTransactionEvidence)), 'Provide evidence from the actual test transfer').toBe(true);
  for (const value of [d.detailURL, d.historyURL, d.ownerNotificationURL]) targetURL(value);
  if (d.isFinalPhase) {
    configured(d, ['projectURL', 'projectStatusSelector', 'completedText', 'allPhaseSelector',
      'boosterState', 'boosterNotificationURL', 'boosterNotificationSelector', 'boosterNotificationText',
      'ownerCompletedNotificationText']);
    expect(d.previousPaidSelectors.length, 'Final phase requires all three preceding phases').toBe(3);
  }
  const ownerState = path.resolve(__dirname, '..', d.ownerState);
  expect(fs.existsSync(ownerState)).toBe(true);
  const { context, page } = await session(browser);
  const contexts = [context];
  try {
    const ownerContext = await browser.newContext({ baseURL: baseOrigin, storageState: ownerState });
    contexts.push(ownerContext);
    const owner = await ownerContext.newPage();
    await require('../scripts/cookies')(owner);
    await owner.goto('/pioneer/profile');
    await expect(owner.getByRole('heading', { name: 'ตั้งค่าโปรไฟล์', exact: true })).toBeVisible();
    await expect.poll(() => owner.locator('input[disabled]').evaluateAll(es => es.map(e => e.value))).toContain(d.ownerEmail);
    await owner.goto(targetURL(d.ownerNotificationURL));
    const notices = owner.locator(d.ownerNotificationSelector).filter({ hasText: d.ownerNotificationText });
    const beforeNotices = await notices.count();
    let booster, boosterNotices, beforeBooster, ownerCompleted, beforeOwnerCompleted;
    if (d.isFinalPhase) {
      const boosterState = path.resolve(__dirname, '..', d.boosterState);
      expect(fs.existsSync(boosterState)).toBe(true);
      const boosterContext = await browser.newContext({ baseURL: baseOrigin, storageState: boosterState });
      contexts.push(boosterContext);
      booster = await boosterContext.newPage();
      await require('../scripts/cookies')(booster);
      await booster.goto(targetURL(d.boosterNotificationURL));
      expect(new URL(booster.url()).pathname).toMatch(/^\/booster\//);
      boosterNotices = booster.locator(d.boosterNotificationSelector).filter({ hasText: d.boosterNotificationText });
      beforeBooster = await boosterNotices.count();
      ownerCompleted = owner.locator(d.ownerNotificationSelector).filter({ hasText: d.ownerCompletedNotificationText });
      beforeOwnerCompleted = await ownerCompleted.count();
    }
    await page.goto(targetURL(d.historyURL));
    const history = page.locator(d.historyRowSelector).filter({ hasText: d.transferReference });
    await expect(history, 'Test reference must not already be recorded').toHaveCount(0);
    const record = await openRecord(page, d);
    await expect(record.locator(d.statusSelector)).toHaveText(d.pendingText);
    for (const selector of d.previousPaidSelectors) await expect(record.locator(selector)).toHaveText(d.paidText);
    await record.getByRole('button', { name: d.openButtonName, exact: true }).click();
    const modal = page.locator(d.modalSelector);
    await expect(modal).toBeVisible();
    await modal.locator(d.referenceSelector).fill(d.transferReference);
    for (const field of d.otherFields) await modal.locator(field.selector).fill(field.value);
    if (d.noteSelector && d.note) await modal.locator(d.noteSelector).fill(d.note);
    await modal.getByRole('button', { name: d.confirmButtonName, exact: true }).click();
    await expect(modal).not.toBeVisible();
    const saved = await openRecord(page, d);
    await expect(saved.locator(d.statusSelector)).toHaveText(d.confirmedText);
    await expect(saved.locator(d.milestoneStatusSelector)).toHaveText(d.paidText);
    await expect(saved.locator(d.referenceSavedSelector)).toHaveText(d.transferReference);
    await expect(saved.locator(d.confirmedBySelector)).toHaveText(d.expectedAdminName);
    await expect(saved.locator(d.confirmedAtSelector)).toHaveText(/\d{1,4}.*\d/);
    await page.goto(targetURL(d.historyURL));
    await expect(history).toHaveCount(1);
    await expect(history).toContainText(d.amountText);
    await expect(history).toContainText(d.expectedAdminName);
    await expect(async () => {
      await owner.goto(targetURL(d.ownerNotificationURL));
      expect(await notices.count()).toBeGreaterThan(beforeNotices);
    }).toPass({ timeout: 30_000 });
    await expect(notices.last()).toContainText(d.transferReference);
    await expect(notices.last()).toContainText(d.amountText);
    if (d.isFinalPhase) {
      await page.goto(targetURL(d.projectURL));
      const phases = page.locator(d.allPhaseSelector);
      await expect(phases).toHaveCount(4);
      for (const phase of await phases.all()) await expect(phase).toHaveText(d.paidText);
      await expect(page.locator(d.projectStatusSelector)).toHaveText(d.completedText);
      expect(await ownerCompleted.count()).toBeGreaterThan(beforeOwnerCompleted);
      await expect(async () => {
        await booster.goto(targetURL(d.boosterNotificationURL));
        expect(await boosterNotices.count()).toBeGreaterThan(beforeBooster);
      }).toPass({ timeout: 30_000 });
    }
    await info.attach('disbursement-result', { body: JSON.stringify({ projectId: d.projectId,
      milestoneId: d.milestoneId, disbursementId: d.disbursementId, transferReference: d.transferReference,
      confirmed: true, paid: true, finalPhase: d.isFinalPhase }), contentType: 'application/json' });
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
