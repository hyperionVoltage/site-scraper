const crawler = require("crawler");
const https = require("https");
const fs = require("fs");
const fsExtra = require("fs-extra");

let scrapedUrl;
let scrapedFolder;

const isUrl = (string) => {
  var expression = /^(https:|http:|www\.)\S*/;
  var regex = new RegExp(expression);

  return string.match(regex);
};

process.argv.slice(2).forEach((val) => {
  try {
    const stat = fs.lstatSync(val);
    if (stat.isDirectory()) {
      scrapedFolder = val;
    }
  } catch (e) {
    if (isUrl(val)) {
      scrapedUrl = val;
    } else {
      return console.log("Some invalid data was passed into the program");
    }
  }
});

if (!scrapedUrl) {
  return console.log(
    "Please make sure that the inserted url follows the basic url format, {http/https}://www.{hostname}"
  );
}

if (!scrapedFolder) {
  return console.log(
    "Please make sure the folder you inserted exists and is valid"
  );
}

if (fs.existsSync("./siteTemplate")) {
  fsExtra.copySync(
    "./siteTemplate",
    scrapedFolder,
    { recursive: true, overwrite: true },
    (err) => {
      if (err) {
        return console.log("Error copying template files");
      }
    }
  );
} else {
  return console.log("Template files were not found, Please contact support");
}

let gridElements = "";

const c = new crawler({
  callback: (err, res) => {
    if (err) console.error(err);
    const images = res.$("img");
    images.each((index) => {
      const imageUrl = images[index].attribs.src;
      if (isUrl(imageUrl)) {
        gridElements += `<div class="item">
        <img src="./images/${index}.png" />
        <a
          href="${imageUrl}"
        >
          ${imageUrl}
        </a>
      </div>`;
        https.get(imageUrl, (res) => {
          const file = fs.createWriteStream(
            `${scrapedFolder}/images/${index}.png`
          );
          res.pipe(file);
          file.on("finish", () => {
            file.close();
          });
        });
      }
    });

    fs.readFile(`${scrapedFolder}/index.html`, "utf8", (err, data) => {
      if (err) return console.log("Error reading html file");
      const replaced = data.replace(/replace/g, gridElements);

      fs.writeFile(`${scrapedFolder}/index.html`, replaced, "utf8", (err) => {
        if (err) return console.log("Error replacing image content");
      });
    });
  },
});

c.queue(scrapedUrl);
