const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {

  const CHROME_PATH =
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const USER_DATA_DIR =
    'C:\\Users\\nitesh\\chrome-meta-profile';

  const META_URL = 'https://meta.ai/';
  const SCENES_FILE = './scenes.json';
  const IMAGE_FOLDER = path.join(__dirname, 'downloads');

  const scenes = JSON.parse(fs.readFileSync(SCENES_FILE, 'utf8'));

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });

  const page = context.pages()[0] || await context.newPage();

  await page.goto(META_URL, { waitUntil: 'domcontentloaded' });
  console.log('✅ Meta AI loaded');

  /* ============================================================
     🔴 CLICK "CREATE VIDEO" ON FIRST LOAD
     ============================================================ */

  // await page.waitForSelector('button[data-slot="capability-pill"]');

  // const createVideoButton = page.locator(
  //   'button[data-slot="capability-pill"]:has-text("Create video")'
  // );

  // if (await createVideoButton.isVisible()) {
  //   await createVideoButton.click();
  //   console.log('🎬 Create video mode activated');
  //   await page.waitForTimeout(2000);
  // }

  /* ============================================================
     🟢 FOCUS REAL EDITOR
     ============================================================ */

  // await page.waitForFunction(() => {
  //   const el = document.querySelector('div[contenteditable="true"]');
  //   if (!el) return false;
  //   el.focus();
  //   return true;
  // });

  console.log('✅ Real editor focused');

  /* ============================================================
     🚀 MAIN LOOP
     ============================================================ */

  for (const scene of scenes) {

    console.log(`🎬 Scene ${scene.scene} started`);

    const imagePath = path.join(
      IMAGE_FOLDER,
      `Scene_${String(scene.scene).padStart(2, '0')}.png`
    );

    if (!fs.existsSync(imagePath)) {
      console.log(`❌ Image not found: ${imagePath}`);
      continue;
    }

    // Clear editor (Windows)
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
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

    // Wait for file input
    await page.waitForSelector('input[type="file"]', {
      state: 'attached',
      timeout: 5000
    });

    // Attach image
    await page.setInputFiles('input[type="file"]', imagePath);
    console.log('🖼️ Image attached');

    // Close attachment popover
    await page.keyboard.press('Escape');

    console.log('⏳ Waiting 9 seconds before sending...');
    await page.waitForTimeout(9000);

    // Refocus editor
    await page.evaluate(() => {
      const el = document.querySelector('div[contenteditable="true"]');
      if (el) el.focus();
    });

    // Send (start video generation)
    await page.keyboard.press('Enter');
    console.log('🚀 Video generation triggered');

    console.log('🕒 Cooling down 60 seconds...');
    await page.waitForTimeout(60000);

    console.log(`✅ Scene ${scene.scene} completed`);
  }

  console.log('🎉 ALL SCENES SENT SUCCESSFULLY');

})();
