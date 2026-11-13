import { chromium } from "playwright";
import assert from "node:assert/strict";

const appUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4174";
const viewports = [
  {name:"desktop",width:1440,height:900},
  {name:"mobile",width:390,height:844},
  {name:"samsung-tab-s7-landscape",width:2560,height:1600},
  {name:"samsung-tab-s7-portrait",width:1600,height:2560}
];
const browser = await chromium.launch({headless:true});
const failures = [];
for (const device of viewports) {
  const context = await browser.newContext({
    viewport:{width:device.width,height:device.height},
    isMobile:device.name==="mobile",
    deviceScaleFactor:1
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror",e=>pageErrors.push(e.message));
  try {
    const response = await page.goto(appUrl+"/demo", {waitUntil:"networkidle",timeout:30000});
    assert.equal(response?.status(),200,"Demo entry point must load");
    await page.locator(".calendar-kiosk").waitFor({timeout:15000});
    assert.equal(await page.getByRole("button",{name:"Month",exact:true}).getAttribute("aria-pressed"),"true","Month is the default");
    await page.getByRole("button",{name:"Year",exact:true}).click();
    await page.locator(".kiosk-year-grid").waitFor();
    await page.getByRole("button",{name:"Month",exact:true}).click();
    await page.locator(".kiosk-month-grid").waitFor();
    await page.getByRole("button",{name:"Monthly screensaver"}).click();
    const overlay = page.locator(".kiosk-month-screensaver");
    await overlay.waitFor({timeout:7000});
    const cells = overlay.locator(".kiosk-saver-day");
    const count = await cells.count();
    assert.ok(count===35 || count===42, "Month should show full 5 or 6 weeks");
    const geometry = await overlay.evaluate(node=>{
      const r=node.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:window.innerWidth,h:window.innerHeight};
    });
    assert.ok(geometry.left >= -2 && geometry.top >= -2, "Screensaver must start on screen");
    assert.ok(geometry.right <= geometry.w+2 && geometry.bottom <= geometry.h+2, "Screensaver cannot overflow viewport");
    await page.screenshot({path:`artifacts/screensaver-${device.name}.png`,fullPage:false});
    await overlay.click({position:{x:20,y:20}});
    await overlay.waitFor({state:"detached"});
    assert.deepEqual(pageErrors,[],"No uncaught client error");
    console.log(`PASS ${device.name}: month/week nav, screensaver ${count} cells, viewport geometry, wake, no exceptions`);
  } catch(err) {
    failures.push(`${device.name}: ${err?.stack||err}`);
    await page.screenshot({path:`artifacts/failed-${device.name}.png`,fullPage:false}).catch(()=>{});
  } finally {
    await context.close();
  }
}
await browser.close();
if(failures.length){console.error(failures.join("\n\n"));process.exitCode=1;}
