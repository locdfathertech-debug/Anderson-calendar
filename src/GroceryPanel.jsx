import { useState } from "react";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { useFamilyGroceries } from "./lib/useFamilyGroceries.js";
import { mealShoppingItems } from "./lib/groceryItems.js";

export default function GroceryPanel({familyId,userId,demo=false,dinners=[]}) {
  const {rows,status,ready,add,toggle}=useFamilyGroceries(familyId,userId,demo);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event){
    event.preventDefault();setError("");
    if(!draft.trim()||!ready||busy)return;
    setBusy(true);
    try{await add(draft);setDraft("");}catch(e){setError(e?.message||"Unable to add this item.");}
    finally{setBusy(false);}
  }
  async function sendMealIngredients(meal){
    const ingredients=mealShoppingItems(meal.data?.ingredients);
    if(!ready||busy||!ingredients.length)return;
    setBusy(true);setError("");
    try{
      const existing=new Set(rows.map(row=>row.item.toLowerCase()));
      for(const item of ingredients){
        if(!existing.has(item.toLowerCase())) {
          await add(item);
          existing.add(item.toLowerCase());
        }
      }
    }catch(e){setError(e?.message||"Some dinner ingredients could not be added.");}
    finally{setBusy(false);}
  }
  async function change(item){
    setError("");setBusy(true);
    try{await toggle(item);}catch(e){setError(e?.message||"Unable to update item.");}
    finally{setBusy(false);}
  }
  return <section className="kiosk-groceries" aria-label="Family grocery list">
    <h2><ShoppingCart size={19}/> Shared groceries</h2>
    <p className="kiosk-hint" role="status">{status}</p>
    {dinners.some(meal=>mealShoppingItems(meal.data?.ingredients).length>0) &&
      <div className="grocery-meal-transfer">
        <strong>Tonight's dinner ingredients</strong>
        {dinners.filter(meal=>mealShoppingItems(meal.data?.ingredients).length).map(meal=>
          <button type="button" key={meal.id} className="kiosk-control" disabled={!ready||busy}
            onClick={()=>void sendMealIngredients(meal)}>
              <Plus size={16}/> Add {mealShoppingItems(meal.data.ingredients).length} ingredients for {meal.data.title}
          </button>
        )}
      </div>}
    <form onSubmit={submit} className="grocery-add-form">
      <label htmlFor="kiosk-grocery-input" className="grocery-sr">Grocery item</label>
      <input id="kiosk-grocery-input" value={draft} onChange={e=>setDraft(e.target.value)}
        disabled={!ready||busy} maxLength={120} placeholder={ready?"Add groceries…":"Not yet activated"}/>
      <button type="submit" className="kiosk-control" disabled={!ready||busy||!draft.trim()}
        aria-label="Add grocery item"><Plus size={17}/> Add</button>
    </form>
    {error&&<p role="alert" className="kiosk-notice">{error}</p>}
    {!ready?<p className="kiosk-empty">Private grocery syncing is waiting for database verification.</p>:
      rows.length?<ul className="grocery-items">{rows.map(row=><li key={row.id}>
        <label className={row.completed?"grocery-completed":""}>
          <input type="checkbox" checked={row.completed} disabled={busy}
            onChange={()=>void change(row)} aria-label={`Bought ${row.item}`}/>
          <span>{row.item}</span>{row.completed&&<Check size={15}/>}
        </label>
      </li>)}</ul>:<p className="kiosk-empty">The grocery list is empty.</p>}
    <p className="kiosk-hint">Checked items clear after two seconds. Family members see the same list once private syncing is enabled.</p>
  </section>;
}
