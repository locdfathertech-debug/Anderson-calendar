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
    // Wait for the opacity transition before checking legibility/screenshot.
    await overlay.evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
    const opacity = await overlay.evaluate(element => Number.parseFloat(getComputedStyle(element).opacity));
    assert.ok(opacity >= .99, "Screensaver must be fully opaque when ready");
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
    await page.getByRole("button",{name:"Open family chat and AI assistant"}).click();
    await page.getByRole("dialog",{name:"Family chat and AI assistant"}).waitFor();
    await page.getByRole("textbox",{name:"Send family message"}).fill("Hello family!");
    await page.getByRole("button",{name:"Send message"}).click();
    await page.locator(".family-chat-bubble.mine").getByText("Hello family!").waitFor();
    await page.getByRole("textbox",{name:"Send family message"}).fill("@AI what is for dinner?");
    await page.getByRole("button",{name:"Send message"}).click();
    await page.locator(".family-chat-bubble.assistant").waitFor();
    const note = await page.locator(".family-chat-bubble.assistant").innerText();
    assert.match(note,/dinner|meal|parent/i,"AI must provide advisory suggestion");
    await page.getByRole("button",{name:"Close family chat"}).click();
    await page.getByRole("dialog",{name:"Family chat and AI assistant"}).waitFor({state:"detached"});
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
