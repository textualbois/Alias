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
const mainPageLink = 'https://dictionary.cambridge.org/browse/english/';
const refferer = 'https://www.google.com/search?q=яндекс+переводчик'
const translatorLink =  'https://translate.yandex.ru/?lang=en-ru';
const languages = ['русский','немецкий','испанский','турецкий'];
const translate = false;

console.log("lolllolol \n");


async function selectLinks(aPage) {
  console.log("line 22 - selecting links\n")
  var linkHandles = await aPage.$x('//div[@class="pr"]/div/div/div/div/div/div/a[@href][@title]');
  let res = [];
  for (const handle of linkHandles) {
    res.push(await aPage.evaluate(el => { return el.getAttribute('href'); },(handle)));
  }
  return res;
};

async function grabWords(aPage) {
  console.log("line 32 - grabbing words\n")
  //await aPage.goto(link,{waitUntil: 'networkidle0'});
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
  console.log("line 52 - attempting to type word - ", word, " \n");
  await aPage.waitForTimeout(700);
  var inputBar = await aPage.$x(inputBarXpath);
  await inputBar[0].click();
  await aPage.keyboard.type(word, { delay: 121 });
  return;
};

async function pasteWord(aPage, inputBarXpath, word) { //this variant to copy string
  console.log("line 61 - attempting to paste word - ", word, "\n");
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
  console.log("line 76 - translating word - \n", words, "\n")
  await pasteWord(aPage, "/html/body/div[1]/main/div[1]/div[1]/div[3]/div[1]/div/div[1]/div[1]/div", words)
  for (const language of languages){
    await typeWord(aPage,"/html/body/div[1]/main/div[1]/div[1]/div[1]/button[3]",language)
    aPage.keyboard.press('ArrowDown');
    aPage.keyboard.press('Enter');
    await waitTillHTMLRendered(aPage);
    let path = await aPage.$x("//main/div[1]/div[1]/div[3]/div[2]/div/div[1]/div[1]/pre")
    let translation = await aPage.evaluate(el=>{return el.innerText;}, path[0])

    res.push(translation)
    let delButton = await aPage.$x('/html/body/div[1]/main/div[1]/div[1]/div[3]/div[1]/div/div[3]/button')
    await delButton[0].click();
  }
  return res;
};

async function fillDictWithWordObjects(aPage, translator, dictlinks, languages) {
  console.log("line 94 - filling dict with words\n")
  let fullDict = []
  for (const link of dictlinks) {
    console.log("line 97 - visiting"+link+"\n")
    await aPage.goto(link,{waitUntil: 'networkidle2'});
    await waitTillHTMLRendered(aPage);
    let curWords = await grabWords(aPage); //returns [[word_1,word_2...word_n],[word_1_type,..word_n_type]]
    if (translate){
      let words_to_translate = curWords[0].join(". ")//join words, join with ". " between
      let translations = await translateWords(translator, words_to_translate, languages) //[language_1, language_2,.. language_n]

      var translation_for_one_language = [] //returns [[word1L1, word2L1,..wordnL1],[],...[],[word1Ln,...wordnLn]]
      for(const translation of translations){
        translation_for_one_language.push(translation.split(". "))
      }
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
      if (translate){
        for (let language = 0; language < languages.length; language++){
          wordObj[languages[language]] = null
          wordObj["asked " + languages[language]] = 0
          wordObj["answered " + languages[language]] = 0
          wordObj["failed " + languages[language]] = 0
          if (translation_for_one_language[language][wordCounter] != curWords[0][wordCounter]){
            wordObj[languages[language]] = translation_for_one_language[language][wordCounter]
          }
        }
      }
      fullDict.push(wordObj);
    };
  };
  return fullDict;
};



(async function() {
  console.log('line 134 - inside async function\n');
  const browser = await launch({
    args: ['--no-sandbox','--start-maximized'], //может ли браузер проверять наличие доп аргументов? argc, argv
    executablePath: dotenv.config().parsed.webBrowser,
    headless: false,
    //userDataDir: dotenv.config().parsed.userDataDir,
    defaultViewport: null // меняет разрешение окна браузера //
    // есть еще что-то такое, нашел в исходном коде одного сайта ' content="width=device-width '
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions(mainPageLink,["notifications"]);

  console.log("starting browser\n");
  const page1 = await browser.newPage();
  await preparePageForTests(page1);
  if (translate){
    var translator = await browser.newPage();
    await preparePageForTests(translator);
    await translator.goto(refferer);
    var yandex = await translator.$x('//*[@id="rso"]/div[1]/div/div/div/div/div/div/div[1]/a/h3');
    await yandex[0].click();
  }


  for (let letter = 18; letter < 26; letter++){ 
    console.log(`line 164 - going to ${mainPageLink}${(letter + 10).toString(36)}`)
    await page1.goto(mainPageLink+(letter+10).toString(36)); //toString - перебор по алфавиту
    await waitTillHTMLRendered(page1);

    let linksForLetter = await selectLinks(page1);

    let fullDict = await fillDictWithWordObjects (page1, translator, linksForLetter, languages)

    let jsonDict = JSON.stringify(fullDict, null, "\t")
    writeFileSync("words/"+(letter + 10).toString(36)+".json", jsonDict,"utf-8");
    writeFileSync("words/"+(letter + 10).toString(36)+"_autocopy.json", jsonDict,"utf-8");
  };

  

  console.log("should be finished\n");
  console.log(performance.now());

  //await browser.close();
})();