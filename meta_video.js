const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const CHROME_PATH =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const USER_DATA_DIR =
    '/Users/nitesh/chrome-meta-profile';

  const META_URL = 'https://meta.ai/';
  const SCENES_FILE = './scenes.json';

  const scenes = JSON.parse(fs.readFileSync(SCENES_FILE, 'utf8'));

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: { width: 1280, height: 720 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = context.pages()[0] || await context.newPage();

  await page.goto(META_URL, { waitUntil: 'domcontentloaded' });
  console.log('✅ Meta AI loaded');

  // Focus real editor
  await page.waitForFunction(() => {
    const el = document.querySelector('div[contenteditable="true"]');
    if (!el) return false;
    el.focus();
    return true;
  });

  console.log('✅ Real editor focused');

  for (const scene of scenes) {
    console.log(`🎬 Scene ${scene.scene} started`);

    const imagePath = path.resolve(
      `Scene_${String(scene.scene).padStart(2, '0')}.png`
    );

    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }

    // Clear editor
    await page.keyboard.down('Meta');
    await page.keyboard.press('A');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');

    // Type prompt
    await page.keyboard.type(scene.prompt, { delay: 9 });
    console.log('✍️ Prompt typed');

    // Open attachment menu
    await page.click(
      'button[data-testid="composer-add-attachment-button"]',
      { force: true }
    );
    console.log('➕ Attachment menu opened');

    // Wait for hidden file input
    await page.waitForSelector(
      'input[type="file"]',
      { state: 'attached', timeout: 5000 }
    );

    // Attach image
    await page.setInputFiles('input[type="file"]', imagePath);
    console.log('🖼️ Image attached');

    // Close attachment menu
    await page.keyboard.press('Escape');
    console.log('❎ Attachment menu closed');

    // Wait before sending
    console.log('⏳ Waiting 9 seconds before sending...');
    await page.waitForTimeout(9000);

    // Refocus editor
    await page.evaluate(() => {
      const el = document.querySelector('div[contenteditable="true"]');
      el && el.focus();
    });

    // Send prompt (START VIDEO GENERATION)
    await page.keyboard.press('Enter');
    console.log('🚀 Video generation triggered');

    // 🔴 CRITICAL: WAIT 3 MINUTES BEFORE NEXT SCENE
    console.log('🕒 Cooling down for 1 minutes to avoid Meta AI crash...');
    await page.waitForTimeout(60000); // 1 minutes

    console.log(`✅ Scene ${scene.scene} cooldown completed`);
  }

  console.log('🎉 ALL SCENES SENT SUCCESSFULLY');
})();
