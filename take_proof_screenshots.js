const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('https://jennymahmuda.github.io/automation-scrapped/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'nexusleads-landing-proof.png', fullPage: true });

  // Simulate logging in for screenshot proof
  await page.evaluate(() => {
    localStorage.setItem('nexusleads_token', 'proof-token-12345');
    localStorage.setItem('nexusleads_email', 'proof-user@nexusleads.com');
  });
  await page.reload();
  await page.waitForTimeout(1500);

  // Fill search box
  await page.getByRole('textbox', { name: 'Keyword / Industry' }).fill('web design agency');
  await page.getByRole('textbox', { name: 'Location' }).fill('Austin, Texas');
  
  // Disable Auto-Push for safe proof run
  const autoPushCheckbox = page.locator('input[type="checkbox"]').first();
  if (await autoPushCheckbox.isChecked()) {
    await autoPushCheckbox.click();
  }

  await page.screenshot({ path: 'nexusleads-live-processing-proof.png', fullPage: true });
  console.log('Screenshots captured successfully.');
  await browser.close();
})();
