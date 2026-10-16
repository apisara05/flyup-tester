import { test, expect } from '@playwright/test';//สมัครสมาชิก Booster

test.describe('Register - UC1', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://fly-up.app/register');
    });

    test('TC11_001 - Required fields validation', async ({ page }) => {


        // ไม่กรอกข้อมูลใด ๆ
        await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

        await page.locator('div').filter({ hasText: 'กรุณากรอกข้อมูลให้ครบถ้วน' }).nth(3);

    });

    test('TC11_002 - Duplicate email', async ({ page }) => {
        await page.getByRole('heading', { name: 'Booster', exact: true }).click();

        await page.locator('input[name="first_name"]').fill('Apisara');
        await page.locator('input[name="last_name"]').fill('Samboonruang');
        test.skip(!process.env.LOGIN_EMAIL, 'Set LOGIN_EMAIL to an existing Booster account');
        await page.locator('input[name="email"]').fill(process.env.LOGIN_EMAIL);
        await page.locator('input[name="phone"]').fill('0633209493');
        await page.locator('input[name="password"]').fill('Apisara_za11');
        await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

        await page.getByRole('checkbox').check();

        await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

        await expect(page.getByRole('status').filter({ hasText: /อีเมล.*(?:ใช้|ลงทะเบียน).*แล้ว|email.*(?:already|exist)/i })).toBeVisible();

    });


    test('TC11_003 - Invalid password format', async ({ page }) => {
        await page.getByRole('heading', { name: 'Booster', exact: true }).click();
        await page.locator('input[name="phone"]').fill('0633209493');

        await page.locator('input[name="first_name"]').fill('Apisara');
        await page.locator('input[name="last_name"]').fill('Samboonruang');
        await page.locator('input[name="email"]').fill(`apisara449samboonruang@gmail.com`);

        // รหัสผ่านไม่ผ่านเงื่อนไข
        await page.locator('input[name="password"]').fill('short');
        await page.locator('input[name="confirmPassword"]').fill('short');
        await page.getByRole('checkbox').check();

        await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

        await expect(
            page.getByRole('status').filter({ hasText: /รูปแบบรหัสผ่านไม่ถูกต้อง|รหัสผ่าน.*(?:8|ตัวพิมพ์|อักขระ|อย่างน้อย|ไม่ถูกต้อง)/ })
        ).toBeVisible();

        // เคสทดสอบที่ 1: ตรวจสอบการข้ามไม่กรอกข้อมูล
    });

        test('TC11_004 - Required fields validation', async ({ page }) => {

            // ไม่กรอกข้อมูลใด ๆ แล้วสั่งให้ค้นหาปุ่มที่มีข้อความว่า 'สร้างบัญชี' จากนั้นทำการคลิก
            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

            // มองหากล่องข้อความ (div) ที่ด้านในมีคำว่า 'กรุณากรอกข้อมูลให้ครบถ้วน' (ตัวที่ 4 ในหน้าเว็บ)
            // ข้อสังเกต: บรรทัดนี้ลืมใส่ expect(...).toBeVisible(); เพื่อใช้ในการตรวจผลลัพธ์จริง
            await page.locator('div').filter({ hasText: 'กรุณากรอกข้อมูลให้ครบถ้วน' }).nth(3);

        });

        // เคสทดสอบที่ 2: ตรวจสอบกรณีที่ใช้อีเมลซ้ำกับที่มีในระบบ
        test('TC11_005 - Duplicate email', async ({ page }) => {
            await page.getByRole('heading', { name: 'Booster', exact: true }).click();
            // สั่งพิมพ์ (fill) ข้อมูลลงในช่องอินพุตต่างๆ โดยอ้างอิงจากชื่ออินพุต (name)
            await page.locator('input[name="first_name"]').fill('Apisara'); // พิมพ์ชื่อ
            await page.locator('input[name="last_name"]').fill('Samboonruang'); // พัญชื่อสกุล
            test.skip(!process.env.LOGIN_EMAIL, 'Set LOGIN_EMAIL to an existing Booster account');
            await page.locator('input[name="email"]').fill(process.env.LOGIN_EMAIL);
            await page.locator('input[name="phone"]').fill('0633209493'); // พิมพ์เบอร์โทร
            await page.locator('input[name="password"]').fill('Apisara_za11'); // พิมพ์รหัสผ่าน
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11'); // พิมพ์ยืนยันรหัสผ่าน

            await page.getByRole('checkbox').check(); // ค้นหาช่องติ๊กถูก (Checkbox) ในหน้าเว็บแล้วทำการติ๊กยอมรับเงื่อนไข

            await page.getByRole('button', { name: 'สร้างบัญชี' }).click(); // คลิกปุ่ม 'สร้างบัญชี'

            // ตรวจสอบผลลัพธ์ (expect) ว่าหน้าจอต้องแสดงข้อความเตือน 'อีเมลนี้มีการใช้งานในระบบแล้ว' ขึ้นมาให้เห็น (toBeVisible)
            await expect(page.getByRole('status').filter({ hasText: /อีเมล.*(?:ใช้|ลงทะเบียน).*แล้ว|email.*(?:already|exist)/i })).toBeVisible();

        });

        // เคสทดสอบที่ 3: ตรวจสอบถ้ารหัสผ่านไม่ตรงตามรูปแบบที่ระบบกำหนด
        test('TC11_006 - Invalid password format', async ({ page }) => {
            await page.getByRole('heading', { name: 'Booster', exact: true }).click();
            await page.locator('input[name="phone"]').fill('0633209493');
            // พิมพ์ข้อมูลส่วนตัวลงในช่องกรอกตามปกติ
            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`apisara449samboonruang@gmail.com`);

            // ตั้งใจพิมพ์รหัสผ่านที่ไม่ผ่านเงื่อนไข (ไม่มีตัวพิมพ์ใหญ่ และไม่มีอักขระพิเศษ) และพิมพ์สองช่องไม่ตรงกัน
            await page.locator('input[name="password"]').fill('short');
            await page.locator('input[name="confirmPassword"]').fill('short');
            await page.getByRole('checkbox').check();

            await page.getByRole('button', { name: 'สร้างบัญชี' }).click(); // คลิกปุ่ม 'สร้างบัญชี'

            // ตรวจสอบผลลัพธ์ (expect) ว่าหน้าเว็บต้องแสดงข้อความเตือนเรื่องกฎการตั้งรหัสผ่านขึ้นมาให้เห็น
            await expect(
                page.getByRole('status').filter({ hasText: /รูปแบบรหัสผ่านไม่ถูกต้อง|รหัสผ่าน.*(?:8|ตัวพิมพ์|อักขระ|อย่างน้อย|ไม่ถูกต้อง)/ })
            ).toBeVisible();

        });


        test('TC11_007 - register success (Pioneer)', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`${Date.now()}@webmail.npru.ac.th`);
            await page.locator('input[name="phone"]').fill('0633209493');
            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

            await page.getByRole('checkbox').check();
            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

        });


        test('TC11_008 - no role selected', async ({ page }) => {
            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`${Date.now()}@webmail.npru.ac.th`);
            await page.locator('input[name="phone"]').fill('0633209493');
            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

            await expect(page.getByText('กรุณาเลือกบทบาท')).toBeVisible();
        });


        test('TC11_009 - missing required fields', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            // ไม่กรอก email

            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

            await expect(page.getByText('กรุณากรอกข้อมูลให้ครบถ้วน')).toBeVisible();
        });


        test('TC11_010 - password mismatch', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`${Date.now()}@webmail.npru.ac.th`);
            await page.locator('input[name="phone"]').fill('0633209493');

            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('654321Aa');

            await page.getByRole('checkbox').check();
            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

            await expect(page.getByText('รหัสผ่านไม่ตรงกัน')).toBeVisible();
        });


        test('TC11_011 - duplicate email', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill('apisara449samboonruang@gmail.com');
            await page.locator('input[name="phone"]').fill('0633209493');
            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

            await page.getByRole('checkbox').check();
            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

        });


        test('TC11_012 - invalid institution email', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`${Date.now()}@webmail.npru.ac.th`);
            await page.locator('input[name="phone"]').fill('0633209493');
            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

            await page.getByRole('checkbox').check();

            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();
        });


        test('TC11_013 - terms not accepted', async ({ page }) => {
            await page.getByText('Pioneerผู้สร้างโปรเจกต์').click();

            await page.locator('input[name="first_name"]').fill('Apisara');
            await page.locator('input[name="last_name"]').fill('Samboonruang');
            await page.locator('input[name="email"]').fill(`test${Date.now()}@mail.com`);
            await page.locator('input[name="phone"]').fill('0633209493');
            await page.locator('input[name="password"]').fill('Apisara_za11');
            await page.locator('input[name="confirmPassword"]').fill('Apisara_za11');

            // ไม่ check checkbox
            await page.getByRole('button', { name: 'สร้างบัญชี' }).click();

            await expect(page.getByText('กรุณายอมรับข้อกำหนดและเงื่อนไข')).toBeVisible();
        });
});
