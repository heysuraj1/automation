const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

(async () => {

  const CHROME_PATH =
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const USER_DATA_DIR =
    'C:\\Users\\mypcccc\\chrome-automation-profile';

  const QWEN_URL = 'https://chat.qwen.ai';

  const SCENES_PATH = path.join(__dirname, 'scenes.json');
  const DOWNLOAD_FOLDER = path.join(__dirname, 'downloads');

  const MAX_PER_RUN = 10;

  if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER);
  }

  let scenes = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: null,
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = await context.newPage();
  await page.goto(QWEN_URL, { waitUntil: 'load' });

  console.log('🌐 Qwen loaded');

  /* Activate Image Mode */

  await page.waitForSelector('.mode-select .ant-dropdown-trigger');
  await page.click('.mode-select .ant-dropdown-trigger');
  await page.waitForTimeout(800);

  await page.click('li[role="menuitem"] span:has-text("Create Image")');
  await page.waitForTimeout(1500);

  await page.click('.size-selector .ant-dropdown-trigger');
  await page.waitForTimeout(800);

  await page.click('li[role="menuitem"]:has-text("9:16")');
  await page.waitForTimeout(1500);

  console.log('🚀 Starting generation loop');

  let generatedCount = 0;

  for (let i = 0; i < scenes.length; i++) {

    if (generatedCount >= MAX_PER_RUN) break;

    if (scenes[i].Completed === true) {
      console.log(`⏭ Scene ${scenes[i].scene} skipped`);
      continue;
    }

    console.log(`🎬 Generating Scene ${scenes[i].scene}`);

    const promptBox = await page.waitForSelector('textarea');

    const previousImages = await page.$$eval('img.qwen-image', imgs =>
      imgs.map(img => img.src)
    );

    await promptBox.fill('');
    await promptBox.type(scenes[i].prompt, { delay: 8 });
    await promptBox.press('Enter');

    console.log('⏳ Waiting 40 seconds...');
    await page.waitForTimeout(40000);

    console.log('🔍 Detecting new image...');

    const newImageHandle = await page.waitForFunction(
      prev => {
        const imgs = Array.from(document.querySelectorAll('img.qwen-image'));
        const fresh = imgs.find(img => !prev.includes(img.src));
        return fresh ? fresh.src : null;
      },
      previousImages,
      { timeout: 0 }
    );

    const imageUrl = await newImageHandle.jsonValue();

    console.log('🖼 Image URL extracted');
    console.log(imageUrl);

    /* DIRECT DOWNLOAD USING HTTPS */

    const filePath = path.join(
      DOWNLOAD_FOLDER,
      `Scene_${String(scenes[i].scene).padStart(2, '0')}.png`
    );

    await new Promise((resolve, reject) => {
      https.get(imageUrl, res => {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(resolve);
        });
      }).on('error', reject);
    });

    console.log(`📥 Saved Scene_${scenes[i].scene}.png`);

    scenes[i].Completed = true;
    fs.writeFileSync(SCENES_PATH, JSON.stringify(scenes, null, 2));

    console.log(`🟢 Scene ${scenes[i].scene} marked Completed`);

    generatedCount++;

    console.log('🕒 Waiting 40 seconds before next...');
    await page.waitForTimeout(40000);
  }

  console.log(`🎉 Run finished. Generated ${generatedCount} images.`);

})();
