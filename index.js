const crawler = require("crawler");
const https = require("https");
const fs = require("fs");
const fsExtra = require("fs-extra");

let scrapedUrl;
let scrapedFolder;

// Check if the given string is a string
const isUrl = (string) => {
  var expression = /^(https:|http:|www\.)\S*/;
  var regex = new RegExp(expression);

  return string.match(regex);
};

// Get the params and assing them to a folder var and a url var
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

// Sanity check
if (!scrapedUrl) {
  return console.log(
    "Please make sure that the inserted url follows the basic url format, {http/https}://www.{hostname}"
  );
}

// Sanity check
if (!scrapedFolder) {
  return console.log(
    "Please make sure the folder you inserted exists and is valid"
  );
}

// Sanity check and copying of the template folder
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

// The images array, that will be injected to the html file
let gridElements = "";

// Use the crawler module
const c = new crawler({
  callback: (err, res) => {
    if (err) console.error(err);
    // Get the img tags from the crawled site
    const images = res.$("img");
    // Iterate over the images and get the needed information (src in this case)
    images.each((index) => {
      const imageUrl = images[index].attribs.src;
      // Push the created image element to the grid array
      if (isUrl(imageUrl)) {
        gridElements += `<div class="item">
        <img src="./images/${index}.png" />
        <a
          href="${imageUrl}"
        >
          ${imageUrl}
        </a>
      </div>`;
        // Download the actual image to the images folder
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

    // Get the created folder's html
    fs.readFile(`${scrapedFolder}/index.html`, "utf8", (err, data) => {
      if (err) return console.log("Error reading html file");
      // replace the token inside of the html file to the grid we created
      const replaced = data.replace(/replace/g, gridElements);

      // write the new data to the file
      fs.writeFile(`${scrapedFolder}/index.html`, replaced, "utf8", (err) => {
        if (err) return console.log("Error replacing image content");
      });
    });
  },
});

c.queue(scrapedUrl);
