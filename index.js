/*
for run successfully this scraper needs 2 things to exist on the page:
1. to find the apgination buttons
2. to find the Rank Types drop down
*/
const puppeteer = require("puppeteer");
const fs = require("fs");
const converter = require("json-2-csv");
const domain = "RS0506";
//const URL_TO_SCRAPE = `https://www.shanghairanking.com/rankings/gras/2022/${domain}`;
//const URL_TO_SCRAPE = `https://www.shanghairanking.com/rankings/arwu/2022`

const BASE = `https://www.shanghairanking.com/rankings/arwu`;
const DOMAIN = `RS0103`;



const scrapePages = async (year, domain) => {
  const browser = await puppeteer.launch();
  const pup_page = await browser.newPage();
  const URL_TO_SCRAPE = `${BASE}/${year}${domain? `/${domain}`: ''}`;
  console.log('-STARTED SCRAPING- ' + URL_TO_SCRAPE)
  await pup_page.goto(URL_TO_SCRAPE);
  // gets total num of pages
  let pagesCountBtn = await pup_page.waitForSelector(
    `.ant-pagination li:nth-child(8) a`
  );
  const pagesCount = await pagesCountBtn.evaluate((el) => el.textContent);

  // loop through all the pages
  let json = [];
  let typesCount = (await pup_page.$$(`thead th:last-child ul li`)).length;

  for (let page = 1; page <= pagesCount; page++) {
    let list = await readPage(page, pup_page, typesCount);
    console.log(`trying to scrape page ${page}`);
    json = [...json, ...list];
  }

  // convert json to csv
  const FILE_TO_SAVE = `./data/ranks_${year}_${domain}.csv`;
  converter.json2csv(json, (err, csv) => {
    if (err) return;
    fs.writeFile(FILE_TO_SAVE, csv, function (err) {
      if (err) throw err;
      console.log("CSV file created!");
    });
  });

  browser.close();
};

//reading each page of pagination & all its score types
const readPage = async (pageNum, pup_page, typesCount) => {
  let json; // all types from drop down

  for (let typeNum = 1; typeNum <= typesCount; typeNum++) {
    let list = await readPageRankForTypes(typeNum, pageNum, pup_page);
    if (!json?.length) {
      // first time
      json = list;
    } else {
      // more times - only need to update more fields at the row
      json = json.map((row, i) => {
        return { ...row, ...list[i] };
      });
    }
  }

  return json;
};

const readPageRankForTypes = async (rnkNum, pgNum, page) => {
  // save every score of type at this page

  try {
    // click on pagination button
    const paginationBtn = await page.waitForSelector(
      `.ant-pagination li[title="${pgNum}"] a`
    );
    await paginationBtn.click();

    // click at dropDown arrow to open drop down
    const img = await page.waitForSelector(
      `thead th:last-child .rank-select img`
    );
    await img.click();

    // select specific item from drop down popup
    const option = await page.waitForSelector(
      `thead th:last-child li:nth-child(${rnkNum})`
    );
    await option.click();

    const list = await page.evaluate(() => {
      // value of selected item at DropDown
      let scorType = document.querySelector('thead th:last-child .rank-select input').value;
  

      return [...document.querySelectorAll(".rk-table tbody tr")].map(
        (row, idx) => {
          let univ = "---";
          let scor = "---";
          try {
            univ = row.querySelector(".tooltiptext").textContent.trim();
            // column of score - 5
            scor = row.querySelector("td:last-child").textContent.trim();
          } catch (err) {
            console.log(err, idx);
          }
          return { /*rank,*/ univ, [scorType]: scor };
        }
      );
    });

    return list
  } catch(err) {
    console.log('ERROR: ', err);
    return []
  }
  
  //return list;
};

(async function () {
  for (let yr = 2023; yr <= 2023; yr++) {
    await scrapePages(`${yr}`, "");
  }
})();
