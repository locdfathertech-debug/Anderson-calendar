// Authenticated acceptance suite for disposable accounts in a SEPARATE staging
// Supabase project. Never point this test at the family production database.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const required = ["E2E_STAGING_SUPABASE_URL","E2E_STAGING_SUPABASE_KEY",
  "E2E_PARENT_A_EMAIL","E2E_PARENT_A_PASSWORD","E2E_CHILD_A_EMAIL","E2E_CHILD_A_PASSWORD",
  "E2E_PARENT_B_EMAIL","E2E_PARENT_B_PASSWORD"];
for (const key of required) if (!env[key]) throw new Error(`Missing staging acceptance secret ${key}`);
const projectUrl = new URL(env.E2E_STAGING_SUPABASE_URL);
if (projectUrl.protocol !== "https:" || !projectUrl.hostname.endsWith(".supabase.co") ||
    projectUrl.hostname === "kwaqscxveniaostnmonu.supabase.co")
  throw new Error("Only a separate staging Supabase project may be used for acceptance tests.");

function client() { return createClient(projectUrl.href,env.E2E_STAGING_SUPABASE_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}); }
async function signIn(email,password) {
  const c = client();
  const {data,error} = await c.auth.signInWithPassword({email,password});
  assert.ifError(error);
  assert.ok(data.user?.id);
  const r = await c.from("profiles").select("id,role,family_id").eq("id",data.user.id).single();
  assert.ifError(r.error);
  return {c,profile:r.data};
}
const a = await signIn(env.E2E_PARENT_A_EMAIL,env.E2E_PARENT_A_PASSWORD);
const child = await signIn(env.E2E_CHILD_A_EMAIL,env.E2E_CHILD_A_PASSWORD);
const b = await signIn(env.E2E_PARENT_B_EMAIL,env.E2E_PARENT_B_PASSWORD);
try {
  assert.ok(["admin","super_admin"].includes(a.profile.role),"Family A parent role");
  assert.equal(child.profile.role,"member","Family A child role");
  assert.ok(["admin","super_admin"].includes(b.profile.role),"Family B parent role");
  assert.equal(a.profile.family_id,child.profile.family_id,"Child must belong to family A");
  assert.notEqual(a.profile.family_id,b.profile.family_id,"Fixture households must differ");
  for (const actor of [a,child,b]) {
    const otherFamily = actor.profile.family_id === a.profile.family_id ? b.profile.family_id : a.profile.family_id;
    const query = await actor.c.from("planner_records").select("id").eq("family_id",otherFamily).limit(5);
    assert.ifError(query.error);
    assert.deepEqual(query.data,[],"Cross-family records leaked");
    const {data:status,error:statusError} = await actor.c.rpc("parent_portal_status");
    assert.ifError(statusError);
    assert.equal(Boolean(status?.is_parent),actor !== child,"Parent status mismatch");
    assert.equal(Boolean(status?.unlocked),false,"Fresh sessions must start locked");
  }
  // A signed-in parent is not elevated merely because their profile.role is admin.
  const lockedParent = await a.c.rpc("set_family_role",{
    target_user_id:child.profile.id,new_role:"admin"
  });
  assert.ok(lockedParent.error,"Locked parent must not modify child permissions");

  // A parent from household B can never administer another household A.
  const crossFamilyRole = await b.c.rpc("set_family_role",{
    target_user_id:child.profile.id,new_role:"admin"
  });
  assert.ok(crossFamilyRole.error,"Cross-family role change must be denied");
  const role = await child.c.rpc("set_family_role",{target_user_id:child.profile.id,new_role:"admin"});
  assert.ok(role.error,"Child must not change their own authorization");
  const recheck = await child.c.from("profiles").select("role").eq("id",child.profile.id).single();
  assert.ifError(recheck.error);
  assert.equal(recheck.data.role,"member","Child role changed without authorization");
  // Family Chat: signed-in family members can post their own messages,
  // cannot impersonate anyone else, and cannot read/post across households.
  // This runs only in disposable staging after family_chat_review.sql.
  const testText = `E2E family chat ${Date.now()}`;
  const postedA = await a.c.from("family_messages").insert({
    family_id:a.profile.family_id,sender_id:a.profile.id,body:testText+" A"
  }).select("id").single();
  assert.ifError(postedA.error);
  const postedB = await b.c.from("family_messages").insert({
    family_id:b.profile.family_id,sender_id:b.profile.id,body:testText+" B"
  }).select("id").single();
  assert.ifError(postedB.error);
  const childRead = await child.c.from("family_messages").select("id").eq("id",postedA.data.id);
  assert.ifError(childRead.error);
  assert.equal(childRead.data.length,1,"Child A should read family A messages");
  const deniedRead = await b.c.from("family_messages").select("id").eq("id",postedA.data.id);
  assert.ifError(deniedRead.error);
  assert.equal(deniedRead.data.length,0,"Family B accessed Family A chat");
  const deniedSpoof = await child.c.from("family_messages").insert({
    family_id:a.profile.family_id,sender_id:a.profile.id,body:testText+" spoof"
  });
  assert.ok(deniedSpoof.error,"Child must not impersonate family parent");
  const deniedCross = await a.c.from("family_messages").insert({
    family_id:b.profile.family_id,sender_id:a.profile.id,body:testText+" cross"
  });
  assert.ok(deniedCross.error,"Parent A must not post to Family B");
  const validChild = await child.c.from("family_messages").insert({
    family_id:a.profile.family_id,sender_id:child.profile.id,body:testText+" child"
  });
  assert.ifError(validChild.error);
  const deniedBRead = await a.c.from("family_messages").select("id").eq("id",postedB.data.id);
  assert.ifError(deniedBRead.error);
  assert.equal(deniedBRead.data.length,0,"Family A accessed Family B chat");

  // Family Groceries: actual DB tests require the reviewed groceries SQL
  // on a disposable staging project with Parent A / Child A / Parent B.
  const groceryName = `E2E bananas ${Date.now()}`;
  const groceryA = await a.c.from("groceries").insert({
    family_id:a.profile.family_id, added_by:a.profile.id, item:groceryName
  }).select("id,item,completed").single();
  assert.ifError(groceryA.error);
  assert.equal(groceryA.data.completed,false);
  const childGroceries = await child.c.from("groceries").select("id").eq("id",groceryA.data.id);
  assert.ifError(childGroceries.error);
  assert.equal(childGroceries.data.length,1,"Child A should see Family A groceries");
  const otherGroceries = await b.c.from("groceries").select("id").eq("id",groceryA.data.id);
  assert.ifError(otherGroceries.error);
  assert.deepEqual(otherGroceries.data,[],"Family B accessed Family A groceries");
  const spoofedGrocery = await child.c.from("groceries").insert({
    family_id:a.profile.family_id,added_by:a.profile.id,item:"spoofed"
  });
  assert.ok(spoofedGrocery.error,"Child cannot pretend parent added grocery");
  const crossFamilyGrocery = await a.c.from("groceries").insert({
    family_id:b.profile.family_id,added_by:a.profile.id,item:"cross"
  });
  assert.ok(crossFamilyGrocery.error,"Parent A cannot insert into Family B groceries");
  const forbiddenOwnerChange = await a.c.from("groceries").update({
    added_by:b.profile.id
  }).eq("id",groceryA.data.id);
  assert.ok(forbiddenOwnerChange.error,"Browser cannot transfer grocery ownership");
  const completedAt=new Date().toISOString();
  const bought=await child.c.from("groceries").update({
    completed:true,completed_at:completedAt
  }).eq("family_id",a.profile.family_id).eq("id",groceryA.data.id).select("id,completed").single();
  assert.ifError(bought.error);
  assert.equal(bought.data.completed,true,"Family A grocery was not checked off");
  const bAttemptDelete=await b.c.from("groceries").delete().eq("id",groceryA.data.id).select("id");
  assert.ifError(bAttemptDelete.error);
  assert.equal(bAttemptDelete.data.length,0,"Family B deleted Family A grocery");
  const originalStillThere=await a.c.from("groceries").select("id").eq("id",groceryA.data.id);
  assert.ifError(originalStillThere.error);
  assert.equal(originalStillThere.data.length,1,"Grocery vanished after denied foreign delete");
  const cleanup=await a.c.from("groceries").delete().eq("id",groceryA.data.id);
  assert.ifError(cleanup.error);

  for (const actor of [a,child,b]) {
    const result = await actor.c.auth.signOut();
    assert.ifError(result.error);
    const {data} = await actor.c.auth.getSession();
    assert.equal(data.session,null,"Session retained after logout");
  }
  console.log("Staging acceptance passed: A/B isolation, parent/child role, locked portal, unauthorized escalation and sign-out.");
} finally {
  await Promise.allSettled([a,child,b].map(x=>x.c.auth.signOut()));
}
