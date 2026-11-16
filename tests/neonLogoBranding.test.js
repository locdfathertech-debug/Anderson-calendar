import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const logo=read("public/anderson-neon-logo.svg");
test("neon logo is a valid self-contained raster-backed SVG",()=>{
  const m=logo.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(m,"Expected embedded WebP; no external image requests");
  const bytes=Buffer.from(m[1],"base64");
  assert.equal(bytes.toString("ascii",0,4),"RIFF");
  assert.equal(bytes.toString("ascii",8,12),"WEBP");
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length,"RIFF byte count must match");
  assert.ok(bytes.length>4000,"Image cannot be an empty placeholder");
  assert.match(logo,/viewBox="0 0 192 192"/);
});
test("every website logo rendering point uses new neon identity",()=>{
  for(const path of ["src/App.jsx","src/CalendarKiosk.jsx","src/Planner.jsx","src/FamilyOnboarding.jsx","index.html"]){
    const body=read(path);
    assert.ok(body.includes("/anderson-neon-logo.svg"),path+" does not use the new logo");
    assert.ok(!body.includes("/anderson-circular-logo.svg"),path+" still references the old logo");
    assert.ok(!body.includes("/anderson-family-calendar-logo.png"),path+" still references the old png");
  }
});
test("installable PWA and kiosk launch icons are updated",()=>{
  for(const path of ["public/manifest.webmanifest","public/kiosk.webmanifest"]){
    const m=JSON.parse(read(path));
    assert.deepEqual(m.icons.map(i=>i.src),["/anderson-neon-logo.svg"]);
    assert.equal(m.icons[0].type,"image/svg+xml");
    assert.equal(m.icons[0].sizes,"any");
  }
  const sw=read("public/sw.js");
  assert.ok(sw.includes("/anderson-neon-logo.svg"));
  assert.ok(sw.includes("anderson-shell-neon-logo-v2"),"Old service worker cache must be invalidated");
});
