const puppeteer = require("puppeteer");
const fs = require("fs");
const converter = require("json-2-csv");
const domain = "RS0506";
//const URL_TO_SCRAPE = `https://www.shanghairanking.com/rankings/gras/2022/${domain}`;
//const URL_TO_SCRAPE = `https://www.shanghairanking.com/rankings/arwu/2022`

const BASE = `https://www.shanghairanking.com/rankings/gras`;
const DOMAIN = `RS0103`;

//const URL_TO_SCRAPE = 'https://www.shanghairanking.com/rankings/arwu/2020'
//const FILE_TO_SAVE = `./data/ranks_arwu_2020.csv`

const savePages = async (year, domain) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const URL_TO_SCRAPE = `${BASE}/${year}/${domain}`;
  //console.log('---' + URL_TO_SCRAPE)
  await page.goto(URL_TO_SCRAPE);
  // gets last page
  let pagesCountBtn = await page.waitForSelector(
    `.ant-pagination li:nth-child(8) a`
  );
  const pagesCount = await pagesCountBtn.evaluate((el) => el.textContent);

  // loop through all the pages

  let json = [];
  let typesCount = (await page.$$(`thead th:nth-child(5) ul li`)).length;
  for (let i = 1; i <= pagesCount; i++) {
    let list = await readPage(i, page, typesCount);
    console.log(`page ${i} saved`);
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
const readPage = async (pg, page, typesCount) => {
  let json; // 5 types from drop down

  for (let typeNum = 1; typeNum <= typesCount; typeNum++) {
    let list = await readPageRankTypes(typeNum, pg, page);
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
const readPageRankTypes = async (rnkNum, pgNum, page) => {
  // save every score of type at this page

  // click on pagination button
  const paginationBtn = await page.waitForSelector(
    `.ant-pagination li[title="${pgNum}"] a`
  );
  await paginationBtn.click();

  // click at dropDown arrow to open drop down
  const img = await page.waitForSelector(
    "thead th:nth-child(5) .rank-select img"
  );
  await img.click();

  // select specific option from drop down popup
  const option = await page.waitForSelector(
    `thead th:nth-child(5) li:nth-child(${rnkNum})`
  );
  await option.click();

  //const element = await page.waitForSelector('thead th:nth-child(6) .rank-select input');
  //const rnk = await element.evaluate(el => el.value);

  const list = await page.evaluate(() => {
    // value of slected item at DropDown
    let scorType = document
      .querySelectorAll(".rank-select")[2]
      .querySelector("input").value;

    return [...document.querySelectorAll(".rk-table tbody tr")].map(
      (row, idx) => {
        //let rank = a.querySelector('.ranking').textContent.trim();
        let univ = "---";
        let scor = "---";
        try {
          univ = row.querySelector(".tooltiptext").textContent.trim();
          // column of score - 5
          scor = row.querySelector("td:nth-child(5)").textContent.trim();
        } catch (err) {
          console.log(err, idx);
        }
        return { /*rank,*/ univ, [scorType]: scor };
      }
    );
  });
  // console.log(JSON.stringify(list, null, 5))
  return list;
};
(async function () {
  for (let yr = 2021; yr <= 2022; yr++) {
    await savePages(`${yr}`, "RS0210");
  }
})();
