import fetch from "node-fetch";
import jsdom from "jsdom";
import fs from "fs";
import https from "https";

(async function () {
  const domain = "clarity-surf";
  const domainName = "https://clarity.surf/fdl/csgo/maps/";
  const getHTML = async (url) => {
    const servers = await fetch(url);
    return await servers.text();
  };
  const clarityCSGO = await getHTML(domainName);
  const { JSDOM } = jsdom;
  const { document } = new JSDOM(clarityCSGO).window;
  const collection = Array.from(
    document.getElementsByTagName("pre")[0].children
  );
  const allMaps = collection.map((map) => {
    return {
      href: `${domainName}${map.href}`,
      name: map.href || "",
    };
  });
  const surfMaps = allMaps.filter((map) => map.name.startsWith("surf"));
  const groups = {};
  surfMaps.forEach((surfMap) => {
    const mapNameWithoutExtension = surfMap.name.split(".")[0] || "";
    if (mapNameWithoutExtension) {
      if (groups[mapNameWithoutExtension]) {
        groups[mapNameWithoutExtension].push(surfMap);
      } else {
        groups[mapNameWithoutExtension] = [surfMap];
      }
    }
  });

  const callAPI = (url, dest, success, error) => {
    const file = fs.createWriteStream(dest);
    const request = https
      .get(url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close(success); // close() is async, call cb after close completes.
        });
      })
      .on("error", function (err) {
        // Handle errors
        fs.unlink(dest, error); // Delete the file async. (But we don't check the result)
        if (error) error(err.message);
      });
  };

  const parentPath = `/scrape-${domain}/surf`;
  console.log("Initial setup");
  console.log("---------------------------------");

  if (!fs.existsSync(parentPath)) {
    console.log("Creating parent directory:", parentPath);
    fs.mkdirSync(parentPath, { recursive: true });
    console.log("---------------------------------");
  }

  const apiPromise = (href, dest) => {
    return new Promise((res, rej) => {
      callAPI(href, dest, res, rej);
    });
  };

  const processMaps = async () => {
    const files = Object.keys(groups);
    const result = [];
    console.log("Starting download process");
    console.log("---------------------------------");
    console.log("---------------------------------");
    for (let i = 0; i < files.length; i++) {
      const mapName = files[i] || "";
      const mapNameWithParentPath = `${parentPath}/${mapName}`;
      if (!fs.existsSync(mapNameWithParentPath)) {
        console.log("Creating child directory:", mapNameWithParentPath);
        fs.mkdirSync(mapNameWithParentPath, { recursive: true });
      }
      console.log("Downloading map:", mapName);
      console.log("---------------------------------");
      const filesToDownload = groups[mapName] || [];
      for (let i = 0; i < filesToDownload.length; i++) {
        const fileConfig = filesToDownload[i] || {};
        console.log("Downloading file:", fileConfig.name);
        result.push(
          await apiPromise(
            fileConfig.href,
            `${parentPath}/${mapName}/${fileConfig.name}`
          )
        );
        console.log("Download complete:", fileConfig.name);
        console.log("---------------------------------");
      }
    }
    console.log("Process complete");
    return result;
  };
  await processMaps();
})();
