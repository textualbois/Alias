import { launch } from 'puppeteer';
import clipboard from 'clipboardy';
//import fs from 'fs';
//import  preparePageForTests from './preparePageForTestsAlt.js';
import { writeFileSync } from 'fs';
import { group } from 'console';
import { performance } from 'perf_hooks';
import { notDeepEqual } from 'assert';
//var scrollIntoView = require('scroll-into-view');
const mainPageLink = 'https://dictionary.cambridge.org/browse/english/';
const translatorLink =  'https://translate.yandex.ru/?lang=en-ru';
const languages = ['русский','немецкий','испанский','турецкий'];
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4)' +
        ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36';

console.log("lolllolol \n");

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 2;

  while(checkCounts++ <= maxChecks){
    let html = await page.content();
    let currentHTMLSize = html.length; 

    let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
      countStableSizeIterations++;
    else 
      countStableSizeIterations = 0; //reset the counter

    if(countStableSizeIterations >= minStableSizeIterations) {
      console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }  
};

async function selectLinks(aPage) {
  console.log("selecting links\n")
  var linkHandles = await aPage.$x('//div[@class="pr"]/div/div/div/div/div/div/a[@href][@title]');
  let res = [];
  for (const handle of linkHandles) {
    res.push(await aPage.evaluate(el => { return el.getAttribute('href'); },(handle)));
  }
  return res;
};

async function grabWords(aPage, link) {
  console.log("grabbing words\n")
  await aPage.goto(link,{waitUntil: 'networkidle0'});
  var wordPlusType = [[],[]]
  var paths = await aPage.$x('//div/div/div/div/div/div/div/a[@href][@title][not(@target)]')
  for (const path of paths){
    let tempWordMeta = [await aPage.evaluate(el=>{return el.innerText;},path), "normal"]
      if (tempWordMeta[0].slice(-5)  == "idiom"){
        tempWordMeta[0] = tempWordMeta[0].slice(0,tempWordMeta[0].length - 6)
        tempWordMeta[1] = "idiom"
      } else if (tempWordMeta[0].slice(-6)  == "phrase"){
        tempWordMeta[0] = tempWordMeta[0].slice(0,tempWordMeta[0].length - 7)
        tempWordMeta[1] = "phrase"
      };
    wordPlusType[0].push(tempWordMeta[0])
    wordPlusType[1].push(tempWordMeta[1])
  };
  return wordPlusType;
};

async function typeWord(aPage, inputBarXpath, word) { //this variant to type string
  console.log("attempting to type word - ", word, " \n");
  await aPage.waitForTimeout(700);
  var inputBar = await aPage.$x(inputBarXpath);
  await inputBar[0].click();
  await aPage.keyboard.type(word, { delay: 121 });
  return;
};

async function pasteWord(aPage, inputBarXpath, word) { //this variant to copy string
  console.log("attempting to paste word - \n", word, "\n");
  await aPage.waitForTimeout(500);
  var inputBar = await aPage.$x(inputBarXpath);
  await inputBar[0].click();
  clipboard.writeSync(word);
  await aPage.keyboard.down('Control');
  await aPage.keyboard.down('Shift');
  await aPage.keyboard.press('KeyV');
  await aPage.keyboard.up('Control');
  await aPage.keyboard.up('Shift');
  return;
};

async function translateWords(aPage, words, languages){
  let res = []
  console.log("translating word - \n", words, "\n")
  await pasteWord(aPage, "/html/body/div[1]/main/div[1]/div[1]/div[3]/div[1]/div/div[1]/div[1]/div", words)
  for (const language of languages){
    await typeWord(aPage,"/html/body/div[1]/main/div[1]/div[1]/div[1]/button[3]",language)
    aPage.keyboard.press('ArrowDown');
    aPage.keyboard.press('Enter');
    await waitTillHTMLRendered(aPage)
    let path = await aPage.$x("//main/div[1]/div[1]/div[3]/div[2]/div/div[1]/div[1]/pre")
    let translation = await aPage.evaluate(el=>{return el.innerText;}, path[0])

    res.push(translation)
    let delButton = await aPage.$x('/html/body/div[1]/main/div[1]/div[1]/div[3]/div[1]/div/div[3]/button')
    await delButton[0].click();
  }
  return res;
};

async function fillDictWithWordObjects(aPage, translator, links, languages) {
  console.log("filling dict with words\n")
  let fullDict = []
  for (const link of links) {
    await aPage.goto(link,{waitUntil: 'networkidle2'});
    let curWords = await grabWords(aPage, link, languages); //returns [[word_1,word_2...word_n],[word_1_type,..word_n_type]]
    let words_to_translate = curWords[0].join(". ")//join words, join with ". " between
    let translations = await translateWords(translator, words_to_translate, languages) //[language_1, language_2,.. language_n]

    var translation_for_one_language = [] //returns [[word1L1, word2L1,..wordnL1],[],...[],[word1Ln,...wordnLn]]
    for(const translation of translations){
      translation_for_one_language.push(translation.split(". "))
    }
    
    for (let wordCounter = 0; wordCounter < curWords[0].length; wordCounter++){
      var wordObj = {
        'type': curWords[1][wordCounter],
        'asked английский': 0,
        'answered английский': 0,
        'failed английский': 0,
        'complaints': [],
        'Английский': curWords[0][wordCounter],
      };
      for (let language = 0; language < languages.length; language++){
        wordObj[languages[language]] = null
        wordObj["asked " + languages[language]] = 0
        wordObj["answered " + languages[language]] = 0
        wordObj["failed " + languages[language]] = 0
        if (translation_for_one_language[language][wordCounter] != curWords[0][wordCounter]){
          wordObj[languages[language]] = translation_for_one_language[language][wordCounter]
        }
      }
      fullDict.push(wordObj);
    };
  };
  return fullDict;
};



(async function() {
  console.log('inside async function\n');
  const browser = await launch({
    args: ['--no-sandbox','--start-maximized'], //может ли браузер проверять наличие доп аргументов? argc, argv
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: false,
    //userDataDir: '/Users/ivansemin/Library/Application Support/Google/Chrome',
    defaultViewport: null // меняет разрешение окна браузера //
    // есть еще что-то такое, нашел в исходном коде одного сайта ' content="width=device-width '
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions(mainPageLink,["notifications"]);

  console.log("starting browser\n");
  const page1 = await browser.newPage();
  const translator = await browser.newPage();
  await page1.setUserAgent(userAgent);
  await translator.setUserAgent(userAgent);
  await page1.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver',{
        get: () => false,
    });
    });
    await translator.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver',{
          get: () => false,
      });
      });
    await page1.evaluateOnNewDocument(() => {
      window.navigator.chrome = {
          runtime: {},
      };
    });
      await translator.evaluateOnNewDocument(() => {
        window.navigator.chrome = {
            runtime: {},
          };
      });
  //await preparePageForTests(page1);
  //await preparePageForTests(translator);
  await translator.goto(translatorLink);


  for (let letter = 0; letter < 26; letter++){ 
  
    await page1.goto(mainPageLink+(letter+10).toString(36)); //toString - перебор по алфавиту
    await page1.waitForTimeout(850);

    let linksForLetter = await selectLinks(page1);

    let fullDict = await fillDictWithWordObjects (page1, translator, linksForLetter, languages)

    let jsonDict = JSON.stringify(fullDict, null, "\t")
    writeFileSync((i + 10).toString(36)+".json", jsonDict,"utf-8");
    writeFileSync((i + 10).toString(36)+"_autocopy.json", jsonDict,"utf-8");
  };

  

  console.log("should be finished\n");
  console.log(performance.now());

  //await browser.close();
})();