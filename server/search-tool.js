
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  // Read query from stdin to avoid shell escaping issues entirely
  const query = fs.readFileSync(0, 'utf-8').trim();

  if (!query) {
    console.error(JSON.stringify({ error: 'No query provided' }));
    process.exit(1);
  }

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // Using Bing Search via Playwright
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);

    // Wait for results to load
    try {
      await page.waitForSelector('#b_results', { timeout: 15000 });
    } catch (e) {
      // If we hit bot detection or no results, log the page content for debugging
      const content = await page.content();
      if (content.includes('unusual traffic') || content.includes('Verify you are a human')) {
         throw new Error('Bot detected by Bing');
      }
      console.error('Page content:', content);
      throw e;
    }

    const results = await page.evaluate(() => {
      let items = Array.from(document.querySelectorAll('li.b_algo'));

      return items.slice(0, 5).map(item => {
        const titleEl = item.querySelector('h2 a');
        const snippetEl = item.querySelector('.b_caption p') ||
                          item.querySelector('.b_algoSnippet') ||
                          item.querySelector('.b_lineclamp2') ||
                          item.querySelector('.b_lineclamp3');

        return {
          title: titleEl ? titleEl.innerText.trim() : '',
          url: titleEl ? titleEl.href : '',
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        };
      }).filter(item => item.title && item.url);
    });

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
