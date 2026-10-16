import { test, expect } from '@playwright/test';//Login

test.describe('Login (UC10)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('https://fly-up.app/login');
    });

    test('TC10_001 - Login success', async ({ page }) => {
        await page.locator('input[name="email"]').fill('664259011@webmail.npru.ac.th');
        await page.locator('input[name="password"]').fill('123456789Aa.');

        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();


    });

    test('TC10_002 - Empty email & password', async ({ page }) => {
        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        await expect(page.getByText(/กรุณากรอกข้อมูล/)).toBeVisible();
    });

    test('TC10_003 - Missing password', async ({ page }) => {
        await page.locator('input[name="email"]').fill('664259011@webmail.npru.ac.th');

        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        await expect(page.getByText(/กรุณากรอกข้อมูล/)).toBeVisible();
    });

    test('TC10_004 - Missing email', async ({ page }) => {
        await page.locator('input[name="password"]').fill('Apisara_za11');

        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        await expect(page.getByText(/กรุณากรอกข้อมูล/)).toBeVisible();
    });

    test('TC10_005 - Invalid email format', async ({ page }) => {
        await page.locator('input[name="email"]').fill('abc123');
        await page.locator('input[name="password"]').fill('Apisara_za11');
        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        //  ใช้ regex กันข้อความไม่ตรง
        await expect(page.getByRole('status').filter({ hasText: 'รูปแบบอีเมลไม่ถูกต้อง' })).toBeVisible();
    });

    test('TC10_006 - Wrong password', async ({ page }) => {
        // Use a verified password-login account, not the Google-only Pioneer.
        const passwordAccount = process.env.LOGIN_EMAIL;
        test.skip(!passwordAccount, 'Set LOGIN_EMAIL to a verified password-login account');
        await page.locator('input[name="email"]').fill(passwordAccount);
        await page.locator('input[name="password"]').fill('wrongPassword');

        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        await expect(page.getByRole('status').filter({ hasText: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })).toBeVisible();
        await expect(page).toHaveURL(/\/login\/?$/);
    });

    test('TC10_007 - Email not found', async ({ page }) => {
        await page.locator('input[name="email"]').fill('notfound@email.com');
        await page.locator('input[name="password"]').fill('123456');

        await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();

        await expect(page.getByText(/ไม่พบ|ไม่ถูกต้อง/)).toBeVisible();
    });

    test('TC10_008 - Forgot password', async ({ page }) => {
        await page.goto('https://fly-up.app/forgot/password');

        //  เช็คว่าหน้าโหลดถูกต้อง
        await expect(page.getByText(/ลืมรหัสผ่าน/)).toBeVisible();

        const emailInput = page.locator('input[name="email"]');
        const resetBtn = page.getByRole('button', { name: /เซ็ต|รีเซ็ต/, exact: true });

        //  กรณี email ไม่มีในระบบ
        await emailInput.fill('notfound@email.com');
        await resetBtn.click();


        //  กลับไปหน้า login
        await page.getByRole('link', { name: /เข้าสู่ระบบ/, exact: true }).click();
        await expect(page).toHaveURL(/login/);

        //  กลับมาหน้า forgot ใหม่
        await page.goto('https://fly-up.app/forgot/password');

        //  กรณี email ถูกต้อง
        await emailInput.fill('test@example.com');
        await resetBtn.click();

        await expect(
            page.getByText(/ส่งลิงก์รีเซ็ตรหัสผ่าน|ส่งลิงก์ไปยังอีเมล/)
        ).toBeVisible();
    });

    test('TC10_009 - Login with Google', async ({ page }) => {
        await page.goto('https://fly-up.app/login');

        // กดปุ่ม Login with Google
        await page.getByRole('button', {
            name: "เข้าสู่ระบบด้วย Google"
        }).click();

        // รอ redirect ไปหน้า Google
        await page.waitForURL(/accounts\.google\.com/);

        // ตรวจว่าเข้าหน้า Sign in ของ Google แล้ว
        await expect(
            page.getByRole('heading', { name: 'Sign in' })
        ).toBeVisible();

    });
});
