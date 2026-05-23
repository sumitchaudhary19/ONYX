import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('BROWSER PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('https://onyx-drab.vercel.app', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully. Capturing errors above (if any).');
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();
