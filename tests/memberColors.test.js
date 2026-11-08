import test from "node:test";
import assert from "node:assert/strict";
import { assignedMemberColors, nextMemberColor, MEMBER_COLORS } from "../src/lib/memberColors.js";
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
