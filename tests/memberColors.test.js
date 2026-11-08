import test from "node:test";
import assert from "node:assert/strict";
import { assignedMemberColors, nextMemberColor, memberColorForSave, isMemberColor, memberColorHex, memberColorInk, MEMBER_COLOR_LABELS, MEMBER_COLORS } from "../src/lib/memberColors.js";
import { kioskMemberStyle } from "../src/lib/kiosk.js";
const member = (id, color) => ({ id, data: { color } });
test("saved colors survive ordering and new assignments avoid them", () => {
  const members = [member("a", "teal"), member("b", "purple")];
  assert.equal(assignedMemberColors(members).get("b"), "purple");
  assert.equal(nextMemberColor(members), "orange");
});
test("legacy members without a color receive stable, distinct colors", () => {
  const members = [member("z"), member("b"), member("a", "teal")];
  assert.deepEqual([...assignedMemberColors(members)], [...assignedMemberColors([...members].reverse())]);
  assert.equal(new Set(assignedMemberColors(members).values()).size, 3);
});
test("palette exhaustion returns a supported color", () => {
  assert.ok(MEMBER_COLORS[nextMemberColor(Object.keys(MEMBER_COLORS).map((c) => member(c, c)))]);
});
test("saving a profile preserves explicit and visible colors, with an unused fallback for missing choices", () => {
  const members = [member("a", "teal"), member("b", "violet"), member("c")];
  assert.equal(memberColorForSave(member("b", "rose"), members), "rose");
  assert.equal(memberColorForSave(member("b", ""), members), "violet");
  assert.equal(memberColorForSave(member("c"), members), assignedMemberColors(members).get("c"));
  for (const invalid of [undefined, "", "unknown", "constructor", "__proto__"]) {
    const color = memberColorForSave(member(undefined, invalid), members);
    assert.ok(Object.hasOwn(MEMBER_COLORS, color));
    assert.ok(!new Set(assignedMemberColors(members).values()).has(color));
  }
});

test("24 named colors and custom hex choices stay valid and stable on save", () => {
  assert.equal(Object.keys(MEMBER_COLORS).length, 24);
  assert.deepEqual(Object.keys(MEMBER_COLOR_LABELS), Object.keys(MEMBER_COLORS));
  assert.ok(isMemberColor("NAVY"));
  assert.ok(isMemberColor("#Ab12Ef"));
  assert.equal(memberColorHex("#Ab12Ef"), "#ab12ef");
  assert.equal(memberColorHex("ocean"), "#3b82f6");
  const members = [member("a", "#Ab12Ef"), member("b", "navy")];
  assert.equal(assignedMemberColors(members).get("a"), "#ab12ef");
  assert.equal(memberColorForSave(member("a", ""), members), "#ab12ef");
  assert.equal(memberColorForSave(member("a", "#00BBDD"), members), "#00bbdd");
  for (const invalid of ["#abc", "#12345g", "red;url(foo)", "constructor", "__proto__", null]) {
    assert.equal(isMemberColor(invalid), false);
    assert.ok(isMemberColor(memberColorForSave(member(undefined, invalid), members)));
  }
  const generated = assignedMemberColors(Array.from({ length: 24 }, (_, i) => member(String(i).padStart(2, "0"))));
  assert.equal(new Set(generated.values()).size, 24);
  assert.equal(nextMemberColor([member("a", "#36C7BB")]), "orange");
});

test("new and custom colors match kiosk cards with readable contrasting ink", () => {
  assert.equal(memberColorInk("navy"), "#ffffff");
  assert.equal(memberColorInk("peach"), "#000000");
  assert.deepEqual(kioskMemberStyle("#123456"), { "--member-color": "#123456", "--member-ink": "#ffffff" });
  const luminance = hex => {
    const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = rgb.map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const additional = Object.keys(MEMBER_COLORS).slice(6);
  for (const color of [...additional, "#000000", "#ffffff", "#777777", "#ffaabb", "#001122"]) {
    const style = kioskMemberStyle(color);
    assert.equal(style["--member-color"], memberColorHex(color));
    const a = luminance(style["--member-color"]), b = luminance(style["--member-ink"]);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, color);
  }
  assert.deepEqual(kioskMemberStyle("constructor"), kioskMemberStyle("teal"));
});
