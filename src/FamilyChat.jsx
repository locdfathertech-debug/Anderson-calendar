import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { cleanedChatMessage, familyChatSuggestion } from "./lib/familyChat.js";
import { requestedGroceryItem } from "./lib/groceryItems.js";
import { useFamilyGroceries } from "./lib/useFamilyGroceries.js";
import { canSendFamilyChat } from "./lib/chatReadiness.js";
import "./familyChat.css";

export default function FamilyChat({ familyId, userId, records = [], demo = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(demo);
  const [status, setStatus] = useState(demo ? "Sample chat · not sent" : "Connecting…");
  const [suggestions, setSuggestions] = useState([]);
  const groceries = useFamilyGroceries(familyId,userId,demo);
  const scroller = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMessages([]);
    setSuggestions([]);
    setDraft("");
    setAvailable(demo);
    setStatus(demo ? "Sample chat · not sent" : "Connecting…");
  }, [familyId, userId, demo]);

  useEffect(() => {
    if (demo || !familyId || !userId) return;
    let active = true;
    let syncing = false;
    async function refresh() {
      if (!active || syncing) return;
      syncing = true;
      try {
        const { data, error } = await supabase.from("family_messages")
          .select("id,sender_id,body,created_at").eq("family_id", familyId)
          .order("created_at", { ascending:false }).limit(100);
        if (error) throw error;
        if (!active) return;
        setMessages((data || []).reverse());
        setAvailable(true);
        setStatus("Family chat · connected");
      } catch {
        if (active) {
          setAvailable(false);
          setMessages([]);
          setStatus("Chat unavailable · private messaging has not been activated");
        }
      } finally { syncing = false; }
    }
    void refresh();
    const channel = supabase.channel(`family-chat-${familyId}`)
      .on("postgres_changes", {
        event:"INSERT",schema:"public",table:"family_messages",
        filter:`family_id=eq.${familyId}`
      }, () => void refresh())
      .subscribe();
    const interval = setInterval(refresh,15000);
    return () => { active = false; clearInterval(interval); void supabase.removeChannel(channel); };
  }, [familyId,userId,demo]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) scroller.current?.scrollTo({top:scroller.current.scrollHeight,behavior:"smooth"});
  }, [open,messages,suggestions]);

  async function send(event) {
    event.preventDefault();
    const body = cleanedChatMessage(draft);
    if (!canSendFamilyChat({demo,available,busy,draft:body})) return;
    setBusy(true);
    try {
      if (demo) {
        setMessages(prev => [...prev,{
          id:`sample-${Date.now()}-${Math.random()}`,sender_id:userId,body,
          created_at:new Date().toISOString()
        }].slice(-100));
      } else {
        const { error } = await supabase.from("family_messages")
          .insert({ family_id:familyId, sender_id:userId, body });
        if (error) throw error;
        const { data, error: readError } = await supabase.from("family_messages")
          .select("id,sender_id,body,created_at").eq("family_id",familyId)
          .order("created_at",{ascending:false}).limit(100);
        if (!readError) setMessages((data||[]).reverse());
      }
      setDraft("");
      if (/(?:^|\s)@ai\b/i.test(body)) {
        // Only read records permitted to the signed-in family; AI suggestions
        // are local and never impersonate a sender in persisted chat history.
        let allowedRecords=records;
        if (!demo) {
          const result=await supabase.from("planner_records")
            .select("id,kind,data").eq("family_id",familyId)
            .in("kind",["meal","chore","member"]).limit(150);
          if (!result.error) allowedRecords=result.data || [];
        }
        const names=allowedRecords.filter(r=>r.kind==="member").map(r=>r.data?.title).filter(Boolean);
        const requestedItem=requestedGroceryItem(body);
        if (requestedItem) {
          setSuggestions(prev=>[...prev,{id:`ai-grocery-${Date.now()}`,
            body:`Add "${requestedItem}" to your family grocery list? This requires your confirmation.`,
            groceryItem:requestedItem}].slice(-10));
        }
        const reply=requestedItem?null:familyChatSuggestion(body,allowedRecords,names);
        if (reply) setSuggestions(prev=>[...prev,{id:`ai-${Date.now()}`,body:reply}].slice(-10));
      }
      setStatus(demo ? "Sample chat · not sent" : "Family chat · connected");
    } catch {
      setStatus("Message not sent · your draft is preserved");
    } finally { setBusy(false); }
  }

  async function confirmGrocery(suggestion) {
    if (!groceries.ready) {
      setSuggestions(prev=>prev.map(s=>s.id===suggestion.id?
        {...s,groceryItem:null,body:"Private groceries are not active yet. Ask a parent to finish the secure setup."}:s));
      return;
    }
    setBusy(true);
    try {
      await groceries.add(suggestion.groceryItem);
      setSuggestions(prev=>prev.map(s=>s.id===suggestion.id?
        {...s,groceryItem:null,body:`Added "${suggestion.groceryItem}" to the ${demo?"sample":"family"} grocery list.`}:s));
    } catch {
      setSuggestions(prev=>prev.map(s=>s.id===suggestion.id?
        {...s,body:"Unable to add this grocery item. Confirm that private syncing is available."}:s));
    } finally {setBusy(false);}
  }

  return <div className="family-chat-root">
    <button type="button" className="family-chat-fab" aria-label={open ? "Close family chat" : "Open family chat and AI assistant"}
      aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      {open ? <X size={21}/> : <MessageSquare size={23}/>} <span>{open ? "Close" : "Family Chat"}</span>
    </button>
    {open && <section className="family-chat-panel" role="dialog" aria-modal="false" aria-label="Family chat and AI assistant"
      onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setOpen(false);}}}>
      <header className="family-chat-head">
        <div><strong><MessageSquare size={19}/> Family Chat</strong><small>{status}</small></div>
        <button type="button" aria-label="Close family chat" onClick={()=>setOpen(false)}><X size={19}/></button>
      </header>
      <div className="family-chat-history" ref={scroller} role="log" aria-live="polite" aria-label="Family messages">
        {!demo && !available ? <p className="family-chat-empty" role="status">Secure family messaging is not active yet. Messages cannot be sent until the private database and permissions are verified.</p> : !messages.length && <p className="family-chat-empty">No messages yet. Say hello to your family!</p>}
        {messages.map(m=><div className={`family-chat-bubble ${m.sender_id===userId?"mine":"theirs"}`} key={m.id}>
          <small>{m.sender_id===userId?"You":"Family member"}</small>
          <p>{m.body}</p>
          <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</time>
        </div>)}
        {suggestions.map(m=><div className="family-chat-bubble assistant" key={m.id}>
          <small><Bot size={14}/> AI suggestion · only visible on this device</small><p>{m.body}</p>
          {m.groceryItem && <button type="button" className="family-chat-confirm-grocery"
            disabled={busy||!groceries.ready} onClick={()=>void confirmGrocery(m)}>
              Confirm add to groceries
            </button>}
        </div>)}
      </div>
      <form className="family-chat-compose" onSubmit={send}>
        <label className="family-chat-sr" htmlFor="family-chat-input">Send family message</label>
        <input id="family-chat-input" ref={input} maxLength={2000} value={draft}
          onChange={e=>setDraft(e.target.value)} disabled={!demo && !available} placeholder={available || demo ? "Message family or @AI…" : "Secure chat not enabled"} />
        <button type="submit" aria-label="Send message" disabled={!canSendFamilyChat({demo,available,busy,draft})}><Send size={18}/></button>
      </form>
      <p className="family-chat-footnote">Use @AI for dinner or chore ideas. AI cannot approve payments, change plans or send device alerts.</p>
    </section>}
  </div>;
}
