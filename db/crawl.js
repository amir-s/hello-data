const $$ = require('cheerio');
const fs = require('fs');
const { parseDescription } = require('../utils');

const BASE = 'https://bing.gifposter.com';
async function get(url) {
  const response = await fetch(url);
  const html = await response.text();
  return $$.load(html);
}

async function getNext(path) {
  const $ = await get(`${BASE}${path}`);
  const url = $('img#bing_wallpaper').attr('src');
  const date = $('div.date time').text();
  const link = $('div.date a').attr('href');
  const title = $('div.title').text();
  const description = $('div.description').text();

  const nextURL = $('div.nav-btn a.next').attr('href');
  const next = nextURL === 'javascript:void(0)' ? null : nextURL;

  return {
    photo: {
      title,
      description,
      url,
      link,
      date,
    },
    next,
  };
}

function saveToFile(data, file) {
  fs.writeFileSync(`./${file}.json`, JSON.stringify(data, null, 2));
}

async function crawl() {
  const photos = [];
  let url = '/wallpaper-1014-MachineElephant.html';
  let index = 0;
  while (true) {
    const { photo, next } = await getNext(url);

    photos.push(photo);
    saveToFile(photos, 'photos');
    console.log(index, photo.date, photo.title);

    if (!next) return;

    url = next;
    index++;
  }
}

function clean() {
  const data = JSON.parse(fs.readFileSync('./photos.json', 'utf-8'));
  const parsed = data.map(item => {
    const { title, url, link } = item;

    const normalizedTitle = title.replace(/\s/gi, ' ').replace('©', '(©') + ')';
    const description = parseDescription(normalizedTitle);
    let normalizedLink = link.replace('//search', '/search');
    if (normalizedLink === 'https://www.bing.com/') normalizedLink = null;

    return {
      title: description.title,
      url,
      link: normalizedLink,
      description,
    };
  });
  saveToFile(parsed, 'parsed');
}

clean();
