const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/scrape', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Você deve fornecer um termo de pesquisa (q) na URL.' });
  }

  async function getProductFromNuuvem(browser) {
    const page = await browser.newPage();

    await page.goto(`https://www.nuuvem.com/br-pt/catalog/page/1/search/${query}`);

    const nuuvemProduct = await page.evaluate(() => {
      const nodeList = document.getElementsByClassName("product__available product__purchasable product-card product-card__cover product-btn-add-to-cart--container")
      const productsArray = [...nodeList]
      const productAllAtributes = productsArray[0]
      var name = productAllAtributes.getAttribute('data-track-product-name')
      var price = productAllAtributes.getAttribute('data-track-product-price')
      var img = productAllAtributes.getAttribute('data-track-product-image-url')
      var link = productAllAtributes.getAttribute('data-track-product-url')

      const product = {
        Nome: name,
        Preço: price,
        Imagem: img,
        link: link
      }

      return product
    })
    return nuuvemProduct
  }

  async function getProductFromEpic(browser) {
    const page = await browser.newPage();

    await page.goto(`https://store.epicgames.com/en-US/browse?q=${query}&sortBy=relevancy&sortDir=DESC&count=40`);

    const epicProduct = await page.evaluate(() => {
      var baseUrl = "https://store.epicgames.com"
      const nodeList = document.getElementsByClassName("css-lrwy1y")[0]
      if (nodeList) {
        var name = nodeList.querySelector('.css-rgqwpc').textContent
        var price = nodeList.querySelector('.css-119zqif').textContent.substring(2)
        var link = baseUrl + nodeList.querySelector(".css-g3jcms").getAttribute('href')

        var imgDiv = nodeList.querySelector('.css-uwwqev')
        var img = imgDiv.querySelector('img').src

        const product = {
          Nome: name,
          Preço: price,
          Imagem: img,
          link: link
        }


        return product
      } 
      return {}
      
    })
    return epicProduct
  }

  async function enterInSteamPage(page) {
    await page.goto(`https://store.steampowered.com/search/?term=${query}`);

    const linkSteam = await page.evaluate(() => {
      const nodeList = document.getElementById("search_resultsRows")
      const produtLink = nodeList.querySelector('a:first-child');
      if (produtLink) {
        var linkHref = produtLink.getAttribute('href');
        return linkHref
      } else {
        return ""
      }
    })
    return linkSteam
  }

  async function getProductFromSteam(browser) {
    const page = await browser.newPage();

    const link = await enterInSteamPage(page)
    if (link == "") {
      return {}
    }

    await page.evaluate(() => {
      var dataDeExpiracao = new Date("2023-12-31");
      document.cookie = `birthtime=1101873601;expires=${dataDeExpiracao};path=/; dominio=store.steampowered.com;`;
    })

    await page.goto(`${link}`)

    const steamProduct = await page.evaluate(() => {
      var name = document.getElementById("appHubAppName").textContent
      var divImg = document.getElementById("gameHeaderImageCtn")
      var img = divImg.querySelector('img:first-child').src;
      var priceElement = document.getElementsByClassName("game_purchase_price price")[0]
      var priceNotFormated = priceElement.getAttribute('data-price-final')
      var price = priceNotFormated.slice(0, priceNotFormated.length - 2) + "." + priceNotFormated.slice(-2);

      var link = window.location.href;

      const product = {
        Nome: name,
        Preço: price,
        Imagem: img,
        link: link
      }
      console.log(product)

      return product
    })
    return steamProduct
  }

  try {
    const browser = await puppeteer.launch({ headless: "new" });

    const nuuvemProduct = await getProductFromNuuvem(browser)
    // const nuuvemProduct = {}
    const steamProduct = await getProductFromSteam(browser)
    // const steamProduct = {}

    const epicProduct = await getProductFromEpic(browser)

    await browser.close();

    res.json({ Nuuvem: nuuvemProduct, Steam: steamProduct, Epic: epicProduct });
  } catch (error) {
    console.error(`Erro ao fazer scraping com a consulta ${query}: ${error.message}`);
    res.status(500).json({ error: 'Erro ao acessar a página e realizar o scraping.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
