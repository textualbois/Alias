import * as dotenv from 'dotenv';
import { launch } from 'puppeteer';
import clipboard from 'clipboardy';
//import fs from 'fs';
import  waitTillHTMLRendered from './waitTillHTMLRendered.js';
import  preparePageForTests from './preparePageForTests.js';
import { writeFileSync } from 'fs';
import { group } from 'console';
import { performance } from 'perf_hooks';
import { notDeepEqual } from 'assert';
//var scrollIntoView = require('scroll-into-view');
const mainPageLink = 'https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html';
const mainPageLink2 = 'https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html';

const languages = ['русский','немецкий','испанский','турецкий'];

console.log("lolllolol \n");



(async function() {
  console.log('inside async function\n');
  const browser = await launch({
    args: ['--no-sandbox','--start-maximized'], //может ли браузер проверять наличие доп аргументов? argc, argv
    executablePath: dotenv.config().parsed.webBrowser,
    headless: false,
    //userDataDir: '/Users/ivansemin/Library/Application Support/Google/Chrome',
    defaultViewport: null // меняет разрешение окна браузера //
    // есть еще что-то такое, нашел в исходном коде одного сайта ' content="width=device-width '
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions(mainPageLink,["notifications"]);

  console.log("starting browser\n");
  const page1 = await browser.newPage();

  await preparePageForTests(page1);
  await page1.goto(mainPageLink);

  const page2 = await browser.newPage();

  await preparePageForTests(page2);
  await page2.goto(mainPageLink2);
  await waitTillHTMLRendered(page2)
  

  console.log("should be finished\n");
  console.log(performance.now());

  //await browser.close();
})();