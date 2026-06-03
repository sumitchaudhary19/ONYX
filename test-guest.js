import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });

  page.on('pageerror', error => {
    console.log('BROWSER PAGE ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle0' });
    
    // Click Guest Mode
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const guestBtn = buttons.find(b => b.textContent.includes('Guest Mode'));
      if (guestBtn) guestBtn.click();
    });

    // Wait for form to appear
    await page.waitForSelector('input[placeholder="First name"]');

    // Fill form
    await page.type('input[placeholder="First name"]', 'Test');
    await page.type('input[placeholder="Last name"]', 'Guest');
    await page.type('input[placeholder="Username"]', 'testguest' + Date.now());
    await page.type('input[placeholder="Email address"]', 'testguest' + Date.now() + '@example.com');
    await page.type('input[placeholder="Password"]', 'Password123!');

    // Submit form
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('Create guest account'));
      if (submitBtn) submitBtn.click();
    });

    console.log('Form submitted, waiting 5 seconds for results...');
    await new Promise(r => setTimeout(r, 5000));

    const html = await page.content();
    if (html.includes('guest-intro.mp4')) {
      console.log('SUCCESS: Video is playing!');
    } else {
      console.log('FAILURE: Video not found in DOM.');
    }
    
  } catch (err) {
    console.error('Error navigating/testing:', err);
  }

  await browser.close();
})();
