
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
  const context = await browser.new_context({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // Using DuckDuckGo
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&ia=web`);

    // Wait for results to load
    try {
      await page.waitForSelector('article[data-testid="result"]', { timeout: 15000 });
    } catch (e) {
      // Fallback for different DDG layouts
      await page.waitForSelector('.result', { timeout: 5000 });
    }

    const results = await page.evaluate(() => {
      // Try multiple selectors for DDG
      let items = Array.from(document.querySelectorAll('article[data-testid="result"]'));
      if (items.length === 0) items = Array.from(document.querySelectorAll('.result'));

      return items.slice(0, 5).map(item => {
        const titleEl = item.querySelector('h2') || item.querySelector('.result__title');
        const linkEl = item.querySelector('a[data-testid="result-title-a"]') || item.querySelector('.result__a');
        const snippetEl = item.querySelector('div[data-result="snippet"]') || item.querySelector('.result__snippet');

        return {
          title: titleEl ? titleEl.innerText : '',
          url: linkEl ? linkEl.href : '',
          snippet: snippetEl ? snippetEl.innerText : ''
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
