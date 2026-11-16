/**
 * One-time, isolated staging fixtures via supported Supabase Auth Admin API.
 * Run locally after setting protected environment variables; never commit keys.
 * node scripts/provision-routine-staging.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const expectedRef = "npoqzqtwlhvvqzryjvkm";
const env = process.env;
const required = ["E2E_STAGING_PROJECT_REF","E2E_STAGING_SUPABASE_URL",
"E2E_STAGING_SUPABASE_KEY","E2E_STAGING_SERVICE_ROLE_KEY",
"E2E_PARENT_A_EMAIL","E2E_PARENT_A_PASSWORD","E2E_PARENT_A_PIN",
"E2E_CHILD_A_EMAIL","E2E_CHILD_A_PASSWORD","E2E_PARENT_B_EMAIL","E2E_PARENT_B_PASSWORD"];
for(const key of required) if(!env[key]) throw Error("Missing protected staging variable "+key);
assert.equal(env.E2E_STAGING_PROJECT_REF,expectedRef,"Not designated staging");
const url=new URL(env.E2E_STAGING_SUPABASE_URL);
assert.equal(url.protocol,"https:");
assert.equal(url.hostname,expectedRef+".supabase.co");
assert.notEqual(env.E2E_STAGING_SUPABASE_KEY,env.E2E_STAGING_SERVICE_ROLE_KEY);
assert.match(env.E2E_PARENT_A_PIN,/^\d{6,12}$/);
const identities=[
  {email:env.E2E_PARENT_A_EMAIL,password:env.E2E_PARENT_A_PASSWORD,role:"super_admin",family:"Anderson E2E Family A"},
  {email:env.E2E_CHILD_A_EMAIL,password:env.E2E_CHILD_A_PASSWORD,role:"member",family:"Anderson E2E Family A"},
  {email:env.E2E_PARENT_B_EMAIL,password:env.E2E_PARENT_B_PASSWORD,role:"super_admin",family:"Anderson E2E Family B"}
];
assert.equal(new Set(identities.map(x=>x.email.toLowerCase())).size,3);
for(const x of identities){
  if(!/^[^@\s]+@example\.invalid$/i.test(x.email))throw Error("Use only disposable @example.invalid addresses");
  if(x.password.length<16)throw Error("Every disposable password must have 16+ characters");
}
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url.href,env.E2E_STAGING_SERVICE_ROLE_KEY,opts);
const regular=()=>createClient(url.href,env.E2E_STAGING_SUPABASE_KEY,opts);
const {data:families,error:familyError}=await admin.from("families").select("id,name")
  .in("name",["Anderson E2E Family A","Anderson E2E Family B"]);
if(familyError)throw familyError;
assert.equal(families.length,2,"Staging family fixtures must exist first");
const ids=new Map(families.map(x=>[x.name,x.id]));
let created=0;
for(const x of identities){
  let user=null;
  for(let page=1;page<=5&&!user;page++){
    const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
    if(error)throw error;
    user=data.users.find(z=>z.email?.toLowerCase()===x.email.toLowerCase())||null;
    if(data.users.length<100)break;
  }
  if(!user){
    const {data,error}=await admin.auth.admin.createUser({
      email:x.email.toLowerCase(),password:x.password,email_confirm:true
    });
    if(error)throw error;
    user=data.user;created++;
  }
  assert.ok(user?.id);
  const {data:profile,error:updateError}=await admin.from("profiles")
    .update({family_id:ids.get(x.family),role:x.role}).eq("id",user.id)
    .select("id,role,family_id").single();
  if(updateError)throw updateError;
  assert.equal(profile.role,x.role);
  assert.equal(profile.family_id,ids.get(x.family));
  const actor=regular();
  const {data:signIn,error:signInError}=await actor.auth.signInWithPassword({
    email:x.email,password:x.password
  });
  if(signInError)throw Error("Staging sign-in failed: "+signInError.message);
  assert.equal(signIn.user.id,user.id);
  if(x===identities[0]){
    const {data:status,error:statusError}=await actor.rpc("parent_portal_status");
    if(statusError)throw statusError;
    if(!status.configured){
      const {data:result,error:pinError}=await actor.rpc("set_parent_pin",{new_pin:env.E2E_PARENT_A_PIN});
      if(pinError||!result?.ok)throw pinError||Error("Parent PIN setup failed");
    }else{
      const {data:result,error:pinError}=await actor.rpc("unlock_parent_portal",{pin:env.E2E_PARENT_A_PIN});
      if(pinError||!result?.ok)throw pinError||Error("Configured staging PIN does not match");
    }
    const {error:lockError}=await actor.rpc("lock_parent_portal");
    if(lockError)throw lockError;
  }
  await actor.auth.signOut();
}
console.log("Staging Auth verified for 3 disposable accounts; newly created: "+created);
console.log("No credentials or PIN values printed.");
