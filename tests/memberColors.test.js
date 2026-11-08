import test from "node:test";
import assert from "node:assert/strict";
import { assignedMemberColors, nextMemberColor, memberColorForSave, MEMBER_COLORS } from "../src/lib/memberColors.js";
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
