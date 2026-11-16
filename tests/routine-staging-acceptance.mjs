// Manually run in approved, disposable Supabase staging only.
// This writes disposable templates and chores and never handles real family data.
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";

const env=process.env;
const keys=["E2E_STAGING_SUPABASE_URL","E2E_STAGING_PROJECT_REF","E2E_STAGING_SUPABASE_KEY",
"E2E_PARENT_A_EMAIL","E2E_PARENT_A_PASSWORD","E2E_PARENT_A_PIN",
"E2E_CHILD_A_EMAIL","E2E_CHILD_A_PASSWORD","E2E_PARENT_B_EMAIL","E2E_PARENT_B_PASSWORD"];
for(const key of keys) if(!env[key])throw Error("Missing protected staging secret "+key);
const url=new URL(env.E2E_STAGING_SUPABASE_URL);
assert.equal(url.protocol,"https:");
assert.equal(url.hostname,env.E2E_STAGING_PROJECT_REF+".supabase.co");
assert.notEqual(env.E2E_STAGING_PROJECT_REF,"kwaqscxveniaostnmonu","Never test production");
assert.ok(!env.E2E_STAGING_SUPABASE_KEY.startsWith("sb_secret_"),"Never use privileged API keys");
const tokenParts=env.E2E_STAGING_SUPABASE_KEY.split(".");
if(tokenParts.length===3)assert.equal(
  JSON.parse(Buffer.from(tokenParts[1],"base64url").toString("utf8")).role,"anon");
const client=()=>createClient(url.href,env.E2E_STAGING_SUPABASE_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
async function actor(email,password){
  const c=client();
  const {data,error}=await c.auth.signInWithPassword({email,password});
  assert.ifError(error);
  const {data:profile,error:readError}=await c.from("profiles")
    .select("id,role,family_id").eq("id",data.user.id).single();
  assert.ifError(readError);
  return {c,profile};
}
const a=await actor(env.E2E_PARENT_A_EMAIL,env.E2E_PARENT_A_PASSWORD);
const child=await actor(env.E2E_CHILD_A_EMAIL,env.E2E_CHILD_A_PASSWORD);
const b=await actor(env.E2E_PARENT_B_EMAIL,env.E2E_PARENT_B_PASSWORD);
async function request(path,method,body,grant){
  const {data:{session},error}=await a.c.auth.getSession();
  assert.ifError(error);
  assert.ok(session?.access_token);
  const response=await fetch(new URL("/rest/v1/"+path,url),{
    method,headers:{
      apikey:env.E2E_STAGING_SUPABASE_KEY,
      Authorization:"Bearer "+session.access_token,
      "Content-Type":"application/json",
      Prefer:"return=representation",
      ...(grant?{"x-parent-unlock":grant}: {})
    },...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const text=await response.text();
  let result;try{result=JSON.parse(text)}catch{result=text}
  return {status:response.status,ok:response.ok,data:result};
}
try{
  assert.equal(child.profile.family_id,a.profile.family_id);
  assert.notEqual(b.profile.family_id,a.profile.family_id);
  assert.equal(child.profile.role,"member");
  assert.ok(["admin","super_admin"].includes(a.profile.role));
  const day=new Date().toISOString().slice(0,10);
  const payload={family_id:a.profile.family_id,title:"E2E morning routine "+Date.now(),
    time_of_day:"morning",weekdays:[0,1,2,3,4,5,6],
    assigned_user_id:child.profile.id,member_name:"Staging Child A",
    begins_on:day,amount:2,points:5,enabled:true};
  const deniedChild=await child.c.from("routine_templates").insert(payload);
  assert.ok(deniedChild.error,"Child cannot create a routine template");
  const deniedLocked=await a.c.from("routine_templates").insert(payload);
  assert.ok(deniedLocked.error,"Locked parent must not create routines");
  const deniedGenerate=await a.c.rpc("materialize_family_routines",{target_day:day});
  assert.ok(deniedGenerate.error,"Locked parent cannot generate chores");
  const unlocked=await a.c.rpc("unlock_parent_portal",{pin:env.E2E_PARENT_A_PIN});
  assert.ifError(unlocked.error);
  assert.ok(unlocked.data?.ok && typeof unlocked.data.token==="string",
    "Parent PIN grant must be issued by server");
  const grant=unlocked.data.token;
  const created=await request("routine_templates","POST",payload,grant);
  assert.ok(created.ok,"Parent template create rejected: "+JSON.stringify(created.data));
  const id=created.data?.[0]?.id;
  assert.ok(id,"Missing created routine template ID");
  const childRead=await child.c.from("routine_templates").select("id").eq("id",id);
  assert.ifError(childRead.error);
  assert.equal(childRead.data.length,1,"Assigned child must see family routine");
  const bRead=await b.c.from("routine_templates").select("id").eq("id",id);
  assert.ifError(bRead.error);
  assert.equal(bRead.data.length,0,"Family B read family A routine");
  const childEdit=await child.c.from("routine_templates").update({enabled:false}).eq("id",id);
  assert.ok(childEdit.error,"Child cannot disable routine");
  const bEdit=await b.c.from("routine_templates").update({enabled:false})
    .eq("id",id).select("id");
  assert.ifError(bEdit.error);
  assert.deepEqual(bEdit.data,[],"Family B changed family A routine");
  const first=await request("rpc/materialize_family_routines","POST",{target_day:day},grant);
  assert.ok(first.ok,"Parent generation failed "+JSON.stringify(first.data));
  assert.equal(first.data,1,"Expected one newly due routine chore");
  const second=await request("rpc/materialize_family_routines","POST",{target_day:day},grant);
  assert.ok(second.ok,"Duplicate generation call failed");
  assert.equal(second.data,0,"Duplicate due chore created");
  const childChores=await child.c.from("planner_records").select("id,data,kind")
    .eq("kind","chore").eq("family_id",a.profile.family_id)
    .contains("data",{routine_template_id:id});
  assert.ifError(childChores.error);
  assert.equal(childChores.data.length,1,"Child must see exactly one generated chore");
  const chore=childChores.data[0];
  assert.equal(chore.data.assigned_user_id,child.profile.id);
  assert.equal(chore.data.status,"open");
  assert.equal(chore.data.points,5);
  const bChores=await b.c.from("planner_records").select("id").eq("id",chore.id);
  assert.ifError(bChores.error);
  assert.deepEqual(bChores.data,[],"Family B viewed generated chore");
  const submission=await child.c.rpc("submit_planner_chore",{record_id:chore.id});
  assert.ifError(submission.error);
  const parentReview=await request(
    "planner_records?id=eq."+encodeURIComponent(chore.id)+"&family_id=eq."+
      encodeURIComponent(a.profile.family_id),
    "PATCH",{data:{...chore.data,status:"approved"}},grant);
  assert.ok(parentReview.ok,"Parent approval rejected "+JSON.stringify(parentReview.data));
  assert.equal(parentReview.data?.[0]?.data?.status,"approved");
  assert.notEqual(parentReview.data[0].data.status,"paid","Approval must not record a payout");
  const stop=await request("routine_templates?id=eq."+encodeURIComponent(id),
    "PATCH",{enabled:false},grant);
  assert.ok(stop.ok,"Cannot pause staging routine");
  const locked=await a.c.rpc("lock_parent_portal");
  assert.ifError(locked.error);
  const afterLock=await request("rpc/materialize_family_routines","POST",{target_day:day},grant);
  assert.ok(!afterLock.ok,"Expired/revoked parent grant allowed chore generation");
  console.log("Staging recurring routines passed: household isolation, parent grant, idempotence, child submission and separate approval.");
} finally{
  await Promise.allSettled([a,child,b].map(x=>x.c.auth.signOut()));
}
