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
    const neonLogo=page.locator('.kiosk-family img[src="/anderson-neon-logo.svg"]');
    await neonLogo.waitFor();
    const appearance=await neonLogo.evaluate(element=>({
      loaded:element.complete && element.naturalWidth>0,
      objectFit:getComputedStyle(element).objectFit,
      displayedWidth:element.getBoundingClientRect().width,
      displayedHeight:element.getBoundingClientRect().height
    }));
    assert.ok(appearance.loaded,"The new neon logo should render successfully");
    assert.equal(appearance.objectFit,"contain","Logo may never crop its circular border");
    assert.ok(appearance.displayedWidth<=215 && appearance.displayedHeight<=215,"Logo should fit tablet sidebar without monopolizing space");
    const manifest=await page.evaluate(async()=>await (await fetch("/kiosk.webmanifest")).json());
    assert.equal(manifest.icons[0].src,"/anderson-neon-logo.svg","Kiosk install icon should match website logo");

    assert.equal(await page.getByRole("button",{name:"Month",exact:true}).getAttribute("aria-pressed"),"true","Month is the default");
    await page.getByRole("button",{name:"Day",exact:true}).click();
    const dayView=page.getByRole("region",{name:"Daily agenda"});
    await dayView.waitFor();
    assert.equal(await page.getByRole("button",{name:"Day",exact:true}).getAttribute("aria-pressed"),"true");
    await dayView.getByRole("heading").first().waitFor();
    await page.getByRole("button",{name:"Next day"}).click();
    await dayView.waitFor();
    await page.getByRole("button",{name:"Today",exact:true}).click();
    await page.getByRole("button",{name:"Agenda",exact:true}).click();
    const agendaView=page.getByRole("region",{name:"14-day family agenda"});
    await agendaView.waitFor();
    assert.equal(await agendaView.locator(".kiosk-agenda-group").count(),14,
      "Agenda must show exactly 14 days, including dates without events");
    assert.ok(await agendaView.locator(".kiosk-agenda-event").count() > 0,
      "Sample household must show events in rolling agenda");
    await agendaView.getByRole("button",{name:/Add event on /}).first().waitFor();
    await page.getByRole("button",{name:"Month",exact:true}).click();
    await page.locator(".kiosk-month-grid").waitFor();
    await page.getByRole("button",{name:"Year",exact:true}).click();
    await page.locator(".kiosk-year-grid").waitFor();
    await page.getByRole("button",{name:"Month",exact:true}).click();
    await page.locator(".kiosk-month-grid").waitFor();
    await page.getByRole("button",{name:"Week",exact:true}).click();
    await page.locator(".kiosk-week-scroll").waitFor();
    const quickAddSlots = page.locator(".kiosk-week-create-slot");
    assert.ok(await quickAddSlots.count() >= 90, "Parent should have hourly quick-add slots across the week");
    const timedCard = page.locator(".kiosk-timeline-event").filter({hasText:"Family breakfast"});
    await timedCard.getByText("09:00 – 10:00").waitFor();
    assert.ok(await timedCard.locator(".kiosk-week-member-avatar").count() >= 1, "Week event should include member avatar");
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
    await page.getByRole("textbox",{name:"Send family message"}).fill("@AI add bananas to the grocery list");
    await page.getByRole("button",{name:"Send message"}).click();
    await page.getByRole("button",{name:"Confirm add to groceries"}).click();
    await page.locator(".family-chat-bubble.assistant").getByText(/Added "bananas"/).waitFor();
    await page.getByRole("dialog",{name:"Family chat and AI assistant"}).getByRole("button",{name:"Close family chat"}).click();
    await page.getByRole("button",{name:"Grocery List"}).click();
    await page.getByRole("region",{name:"Family grocery list"}).getByText("bananas").waitFor();
    await page.getByRole("button",{name:/Add 4 ingredients for Smoked chicken/}).click();
    await page.locator(".grocery-items").getByText("long-grain rice").waitFor();

    await page.getByRole("textbox",{name:"Grocery item"}).fill("bread");
    await page.getByRole("button",{name:"Add grocery item"}).click();
    await page.locator(".grocery-items").getByText("bread").waitFor();
    await page.getByRole("checkbox",{name:"Bought bread"}).check();
    await page.locator(".grocery-items").getByText("bread").waitFor({state:"detached",timeout:7000});
    await page.getByRole("button",{name:"Daily Routine"}).click();
    await page.getByText(/Your day starts here|Tomorrow is coming up|Today’s family overview/).waitFor();

    const repeating=page.getByRole("region",{name:"Recurring routines today"});
    await repeating.waitFor();
    await repeating.getByText("Make the bed").waitFor();
    await repeating.getByText("Morning routine").waitFor();
    await page.getByRole("button",{name:"Parent portal",exact:true}).click();
    const gate=page.getByRole("dialog",{name:/Create your Parent PIN|Parent portal/});
    await gate.waitFor();
    await gate.getByLabel("Parent PIN",{exact:true}).fill("246810");
    const confirm=gate.getByLabel("Confirm Parent PIN");
    if(await confirm.count()) await confirm.fill("246810");
    await gate.getByRole("button",{name:/Set PIN & unlock|Unlock/}).click();
    const choresTab=page.getByRole("button",{name:"Chores",exact:true});
    await choresTab.waitFor();
    await choresTab.click();
    const manager=page.getByRole("region",{name:"Recurring family routines"});
    await manager.waitFor();
    await manager.getByLabel("Task name").fill("Brush teeth");
    await manager.getByLabel("Assigned family account").selectOption("sample-parent");
    await manager.getByRole("button",{name:"Save routine"}).click();
    await manager.locator(".routine-template-list").getByText("Brush teeth").waitFor();
    await manager.getByRole("button",{name:/Generate due chores for/}).click();
    await manager.getByText(/Created [1-9] assigned chores? across 1 day/).waitFor();
    // The status overview is read-only; only parent-authorized actions write.
    await manager.locator(".routine-week-summary").getByText(/Awaiting approval/).waitFor();
    await manager.getByRole("button",{name:"Generate next 7 days"}).click();
    await manager.getByText(/Created [1-9][0-9]* assigned chores? across 7 days/).waitFor();
    await manager.locator(".routine-week-summary").getByText(/Not generated/).waitFor();
    await page.getByText("Brush teeth",{exact:true}).first().waitFor();
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
