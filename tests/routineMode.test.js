import {test} from "node:test";
import assert from "node:assert/strict";
import {timeOfDayMode,nextLocalDate,routineGreeting} from "../src/lib/routineMode.js";
test("morning is 05:00 through 10:59; evening is 18:00 through 22:59",()=>{
  for(const [hour,expected] of [[0,"day"],[4,"day"],[5,"morning"],[10,"morning"],[11,"day"],[17,"day"],[18,"evening"],[22,"evening"],[23,"day"]]){
    assert.equal(timeOfDayMode(new Date(2026,10,13,hour,30)),expected);
  }
});
test("tomorrow uses local calendar arithmetic across month and year changes",()=>{
  assert.equal(nextLocalDate(new Date(2026,10,30,22)), "2026-12-01");
  assert.equal(nextLocalDate(new Date(2026,11,31,23)), "2027-01-01");
});
test("routine greetings are explicit and bounded",()=>{
  assert.match(routineGreeting("morning"),/morning/i);
  assert.match(routineGreeting("evening"),/wind down/i);
});
