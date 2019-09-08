// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/

const test = require('muggle-test')
const assert = require('muggle-assert')
const puppeteer = require('puppeteer')

async function runOnPage (page, asyncFunc) {
  // this html file loads ./bundle.js which is ./tab-race.js browserified
  // -r is used to allow window.require('tab-race') in other script
  await page.goto(`file://${require.resolve('./test.html')}`)

  return new Promise((resolve, reject) => {
    page.exposeFunction('resolveNodePromise', resolve)
      .then(() => page.exposeFunction('rejectNodePromise', reject))
      .then(() => page.addScriptTag({
        // immediately invoke passed function on the page and wait for it to resolve
        content:
        `(${asyncFunc.toString()})()
          .then(window.resolveNodePromise)
          .catch(window.rejectNodePromise)`
      }))
      .catch(reject)
  })
}

async function runOnNewPage (browser, asyncFunc) {
  const page = await browser.newPage()

  return runOnPage(page, asyncFunc)
}

test('race should only be won by one tab', async () => {
  // run 10 times to ensure consistency
  for (let i = 1; i <= 10; i++) {
    const browser = await puppeteer.launch()

    // run it on 20 separate pages
    const promises = []
    for (let i = 0; i < 20; i++) {
      promises.push(
        runOnNewPage(browser, async () => {
          const { race } = require('tab-race')

          return race('one-tab-test')
        })
      )
    }

    const results = await Promise.all(promises)

    const numWinners = results.filter((result) => result === true).length

    assert.equal(numWinners, 1, 'there should be exactly one winner')

    browser.close()
  }
})

test('endRace() resets to allow one new winner', async () => {
  // run 10 times to ensure consistency
  for (let i = 1; i <= 10; i++) {
    const browser = await puppeteer.launch()

    await runOnNewPage(browser, async () => {
      const { endRace, race } = require('tab-race')

      await race('endrace-test')
      endRace('endrace-test')
    })

    // run it on 10 separate pages
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        await runOnNewPage(browser, async () => {
          const { race } = require('tab-race')

          return race('endrace-test')
        })
      )
    }

    const results = await Promise.all(promises)

    const numWinners = results.filter((result) => result === true).length

    assert.equal(numWinners, 1, 'there should be exactly one winner')

    browser.close()
  }
})

test('endRace() finishes in unload handler', async () => {
  // run 10 times to ensure consistency
  for (let i = 1; i <= 10; i++) {
    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await runOnPage(page, async () => {
      const { endRace, race } = require('tab-race')

      await race('endRace-sync-test')
      window.onunload = () => endRace('endRace-sync-test')
    })

    await page.close({ runBeforeUnload: true })

    const result = await runOnNewPage(browser, async () => {
      const { race } = require('tab-race')

      return race('endRace-sync-test')
    })

    assert.equal(result, true, 'race should have ended')

    browser.close()
  }
})
