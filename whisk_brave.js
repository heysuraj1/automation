const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // 🔴 CHANGE ONLY IF YOUR BRAVE PATH IS DIFFERENT
  const BRAVE_PATH =
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

  // ✅ CLONED PROFILE (NOT original Brave profile)
  const USER_DATA_DIR =
  '/Users/nitesh/Library/Application Support/BraveSoftware/Brave-Browser';


  const PROJECT_URL =
    'https://labs.google/fx/tools/whisk/project';

  const scenes = JSON.parse(fs.readFileSync('./scenes.json', 'utf8'));

  const context = await chromium.launchPersistentContext(
    USER_DATA_DIR,
    {
      executablePath: BRAVE_PATH,
      headless: false,
      viewport: { width: 1280, height: 720 },
      args: ['--disable-blink-features=AutomationControlled']
    }
  );

  const page = await context.newPage();
  await page.goto(PROJECT_URL, { waitUntil: 'networkidle' });

  for (const scene of scenes) {
    console.log(`🎬 Scene ${scene.scene}`);

    // Prompt box
    const promptBox = await page.waitForSelector('textarea', { timeout: 0 });
    await promptBox.fill(scene.prompt);

    // Capture existing images BEFORE generation
    const existingImages = await page.$$eval('img', imgs =>
      imgs.map(img => img.src)
    );

    // 🔥 Trigger generation via Enter (most stable)
    await promptBox.press('Enter');

    // Wait for NEW image only
    const imageUrlHandle = await page.waitForFunction(
      prevImages => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const fresh = imgs.find(img => !prevImages.includes(img.src));
        return fresh ? fresh.src : null;
      },
      existingImages,
      { timeout: 0 }
    );

    const imageUrl = await imageUrlHandle.jsonValue();

    // Open image and save
    const imgPage = await context.newPage();
    await imgPage.goto(imageUrl);
    await imgPage.waitForLoadState('networkidle');

    const buffer = await imgPage.screenshot();
    fs.writeFileSync(
      `Scene_${String(scene.scene).padStart(2, '0')}.png`,
      buffer
    );

    await imgPage.close();

    console.log(`✅ Scene ${scene.scene} saved`);

    // Cooldown for stability
    await page.waitForTimeout(3000);
  }

  console.log('🎉 All scenes generated successfully');
})();
