import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CheckCircle, MapPin, Utensils, Play, X, Briefcase, Baby, Trophy, Users, LayoutDashboard, Calendar as CalendarIcon, Clock, BookOpen, Stethoscope, Home, Popcorn, Plane, ClipboardList, UploadCloud, Search, Plus, Shield, Eye } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';

const CATEGORY_CONFIG = {
  school: { label: 'School & Academics', icon: BookOpen, color: 'blue' },
  sports: { label: 'Sports & Activities', icon: Trophy, color: 'orange' },
  medical: { label: 'Medical & Appts', icon: Stethoscope, color: 'red' },
  work: { label: 'Work Schedule', icon: Briefcase, color: 'slate' },
  daycare: { label: 'Daycare & Sitter', icon: Baby, color: 'pink' },
  household: { label: 'Household & Chores', icon: Home, color: 'green' },
  family: { label: 'Family Time', icon: Popcorn, color: 'purple' },
  travel: { label: 'Travel & Vacation', icon: Plane, color: 'teal' },
  general: { label: 'General Event', icon: CalendarIcon, color: 'slate' }
};

export default function CalendarApp() {
  const [isIdle, setIsIdle] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [portalTab, setPortalTab] = useState('dashboard');
  
  const [calendarView, setCalendarView] = useState('week'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [chores, setChores] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [meals, setMeals] = useState([]);
  
  // UPGRADE: Added access_level to initial state
  const [newMember, setNewMember] = useState({ name: '', role: 'child', color: 'blue', avatar_url: '', access_level: 'view_only' });
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '12:00', category: 'general', member_id: '' });
  const [newChore, setNewChore] = useState({ title: '', assigned_to: '', points: 10, template: 'once', start_date: new Date().toISOString().split('T')[0] });
  
  const [activeVideo, setActiveVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [mRes, eRes, cRes, vRes, mealRes] = await Promise.all([
        supabase.from('family_members').select('*'),
        supabase.from('events').select('*'),
        supabase.from('chores').select('*'),
        supabase.from('vacations').select('*'),
        supabase.from('meals').select('*')
      ]);
      if (mRes.data) setMembers(mRes.data);
      if (eRes.data) setEvents(eRes.data);
      if (cRes.data) setChores(cRes.data);
      if (vRes.data) setVacations(vRes.data);
      if (mealRes.data) setMeals(mealRes.data);
    };
    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, (p) => {
        if (p.eventType === 'INSERT') setMembers(prev => [...prev, p.new]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (p) => {
        if (p.eventType === 'INSERT') setEvents(prev => [...prev, p.new]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, (p) => {
        if (p.eventType === 'INSERT') setChores(prev => [...prev, p.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    let timeout;
    const resetIdle = () => {
      if(showPortal) return;
      setIsIdle(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsIdle(true), 15000);
    };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(timeout);
    };
  }, [showPortal]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === '1234') { setIsAuthenticated(true); setPin(''); } 
    else { alert("Incorrect PIN"); setPin(''); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name) return; 
    
    setIsUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

    if (uploadError) {
      alert("Error uploading image. Check Supabase Storage permissions.");
      console.error(uploadError);
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setNewMember(prev => ({ ...prev, avatar_url: data.publicUrl }));
    }
    
    setIsUploading(false);
    e.target.value = ''; 
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if(file) handleFileUpload({ target: { files: [file] } }); 
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'red'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const memberToSave = { ...newMember, color: randomColor };
    
    const { error } = await supabase.from('family_members').insert([memberToSave]);
    if (!error) setNewMember({ name: '', role: 'child', color: 'blue', avatar_url: '', access_level: 'view_only' });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    const payload = { ...newEvent, member_id: newEvent.member_id || null };
    const { error } = await supabase.from('events').insert([payload]);
    if (!error) {
      setNewEvent({ title: '', date: '', time: '12:00', category: 'general', member_id: '' });
      alert("Event added!");
    }
  };

  const handleAddChore = async (e) => {
    e.preventDefault();
    let datesToGenerate = [];
    const start = new Date(newChore.start_date);
    
    for(let i = 0; i < 28; i++) {
      let d = new Date(start);
      d.setDate(start.getDate() + i);
      let dayOfWeek = d.getDay(); 
      
      if (newChore.template === 'once' && i === 0) datesToGenerate.push(d);
      else if (newChore.template === 'daily') datesToGenerate.push(d);
      else if (newChore.template === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) datesToGenerate.push(d);
      else if (newChore.template === '3days' && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5)) datesToGenerate.push(d);
      else if (newChore.template === '7on7off') {
        let weekIndex = Math.floor(i / 7);
        if (weekIndex % 2 === 0) datesToGenerate.push(d);
      }
    }

    const chorePayloads = datesToGenerate.map(dateObj => ({
      title: newChore.title,
      assigned_to: newChore.assigned_to || null, 
      date: dateObj.toISOString().split('T')[0],
      points: parseInt(newChore.points),
      completed: false
    }));

    const { error } = await supabase.from('chores').insert(chorePayloads);
    if (!error) {
      setNewChore({ ...newChore, title: '' });
      alert(`Successfully generated ${chorePayloads.length} chore(s)!`);
    }
  };

  const getWeekDays = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const todaysChores = chores.filter(c => c.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="w-screen h-screen bg-slate-900 text-slate-100 overflow-hidden relative font-sans select-none">
      
      <AnimatePresence>
        {activeVideo && (
          <motion.div drag dragMomentum={false} initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute bottom-8 right-8 w-96 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-700 z-[70] flex flex-col">
            <div className="bg-slate-800 p-3 flex justify-between items-center cursor-move active:cursor-grabbing">
              <span className="text-sm font-bold text-slate-300">Tutorial Player</span>
              <button onClick={() => setActiveVideo(null)} className="p-1 bg-red-500/20 text-red-400 rounded-full"><X size={16} /></button>
            </div>
            <div className="w-full aspect-video bg-black pointer-events-auto"><ReactPlayer url={activeVideo} width="100%" height="100%" playing controls /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isIdle && !activeVideo && !showPortal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506744626753-14013054c5dc)' }}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl"></div>
            <div className="relative z-10 flex flex-col items-center p-12 rounded-3xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-lg">
              <h1 className="text-8xl font-bold tracking-tighter" style={{ fontFamily: 'Space Grotesk, monospace' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h1>
              <p className="text-2xl mt-4 text-slate-200">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => setIsIdle(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 h-full w-full">
        {/* LEFT COLUMN */}
        <div className="col-span-3 lg:col-span-2 bg-slate-800/80 p-6 flex flex-col border-r border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Anderson Hub</h1>
            <button onClick={() => { setShowPortal(true); setIsIdle(false); }} className="p-3 bg-slate-700 rounded-full hover:bg-slate-600 transition"><Settings size={20} /></button>
          </div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Family Profiles</h3>
          <div className="space-y-3 mb-8">
            {members.map(member => (
              <div key={member.id} className="flex items-center p-3 rounded-lg bg-slate-700/40 border border-slate-600/30 relative">
                {member.avatar_url ? <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full mr-4 border border-white/10 object-cover" /> : <div className={`w-10 h-10 rounded-full bg-${member.color}-500 mr-4 border border-white/10 flex items-center justify-center text-sm font-bold`}>{member.name.charAt(0)}</div>}
                
                {/* UPGRADE: Visual Security Badges */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold block">{member.name}</span>
                    {member.access_level === 'full_access' ? (
                      <Shield size={12} className="text-blue-400" title="Full Access (Admin)" />
                    ) : (
                      <Eye size={12} className="text-slate-500" title="View Only" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{member.role.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Legend</h3>
          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return <div key={key} className="flex items-center gap-2 text-xs text-slate-300"><Icon size={14} className={`text-${config.color}-400`} /><span>{config.label}</span></div>
            })}
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="col-span-6 lg:col-span-8 p-6 flex flex-col bg-[#141b2d]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold flex items-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={() => { setPortalTab('dashboard'); setShowPortal(true); setIsIdle(false); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-lg flex items-center gap-2">
                <Plus size={16} /> New Event
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                <Search size={16} className="text-slate-500 mr-2" />
                <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-40 text-slate-200" />
              </div>

              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button onClick={() => setCalendarView('week')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${calendarView === 'week' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Week</button>
                <button onClick={() => setCalendarView('month')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${calendarView === 'month' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Month</button>
                <button onClick={() => setCalendarView('year')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${calendarView === 'year' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Year</button>
              </div>
            </div>
          </div>
          
          {/* WEEK VIEW */}
          {calendarView === 'week' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="grid grid-cols-8 border-b border-slate-700/50 bg-slate-800/50">
                <div className="p-3 text-center text-xs text-slate-500 font-bold flex items-center justify-center"><Clock size={16}/></div>
                {weekDays.map((day, idx) => (
                  <div key={idx} className={`p-3 text-center border-l border-slate-700/50 flex flex-col items-center justify-center ${day.toDateString() === new Date().toDateString() ? 'bg-blue-500/10' : ''}`}>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className={`text-xl font-bold ${day.toDateString() === new Date().toDateString() ? 'text-blue-400' : ''}`}>{day.getDate()}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto hide-scrollbar">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b border-slate-700/30 min-h-[80px]">
                    <div className="p-2 text-xs text-slate-500 text-right pr-4 pt-3 border-r border-slate-700/50">{hour.toString().padStart(2, '0')}:00</div>
                    {weekDays.map((day, dIdx) => {
                      const cellEvents = events.filter(e => new Date(e.date).toDateString() === day.toDateString() && e.time && parseInt(e.time.split(':')[0]) === hour);
                      return (
                        <div key={dIdx} className="p-1 border-l border-slate-700/30 relative hover:bg-slate-700/10 transition">
                          {cellEvents.map(ev => {
                            const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.general;
                            const Icon = cat.icon;
                            const assignedMember = members.find(m => m.id === ev.member_id);
                            return (
                              <div key={ev.id} className={`bg-${cat.color}-500/20 border-l-4 border-${cat.color}-500 p-2 rounded mb-1 flex flex-col justify-between min-h-[56px] cursor-pointer hover:bg-${cat.color}-500/30 transition`} onClick={() => ev.video_url && setActiveVideo(ev.video_url)}>
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Icon size={10} className={`text-${cat.color}-400 shrink-0`} />
                                    <p className={`text-[11px] font-bold text-${cat.color}-300 truncate`}>{ev.title}</p>
                                  </div>
                                  <p className="text-[9px] text-slate-400">{ev.time}</p>
                                </div>
                                {assignedMember && (
                                  <div className="flex justify-end mt-1">
                                    {assignedMember.avatar_url ? (
                                      <img src={assignedMember.avatar_url} alt={assignedMember.name} className="w-4 h-4 rounded-full object-cover border border-slate-700 shadow-sm" />
                                    ) : (
                                      <div className={`w-4 h-4 rounded-full bg-${assignedMember.color}-500 border border-slate-700 shadow-sm flex items-center justify-center text-[8px] font-bold`}>
                                        {assignedMember.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MONTH VIEW */}
          {calendarView === 'month' && (
            <div className="grid grid-cols-7 gap-2 flex-grow">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-slate-400 text-sm font-medium py-2">{day}</div>)}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-2 border border-slate-700/30 flex flex-col overflow-hidden">
                  <span className="text-sm text-slate-400 mb-1">{i + 1}</span>
                  <div className="flex flex-col gap-1 overflow-y-auto hide-scrollbar">
                    {events.filter(e => new Date(e.date).getDate() === i + 1).map(ev => {
                       const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.general;
                       const Icon = cat.icon;
                       const assignedMember = members.find(m => m.id === ev.member_id);
                       return (
                         <div key={ev.id} className={`text-[10px] bg-${cat.color}-500/20 text-${cat.color}-300 p-1 rounded flex items-center justify-between`}>
                           <div className="flex items-center gap-1 truncate"><Icon size={10} className="shrink-0" /><span className="truncate">{ev.title}</span></div>
                           {assignedMember && (
                             assignedMember.avatar_url ? <img src={assignedMember.avatar_url} className="w-3 h-3 rounded-full object-cover shrink-0 ml-1" />
                             : <div className={`w-3 h-3 rounded-full bg-${assignedMember.color}-500 shrink-0 ml-1 flex items-center justify-center text-[6px] font-bold text-white`}>{assignedMember.name.charAt(0)}</div>
                           )}
                         </div>
                       )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* YEARLY VIEW */}
          {calendarView === 'year' && (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 flex-grow overflow-y-auto hide-scrollbar pb-4">
              {Array.from({ length: 12 }).map((_, monthIdx) => {
                const monthDate = new Date(currentDate.getFullYear(), monthIdx, 1);
                const monthName = monthDate.toLocaleString('default', { month: 'long' });
                const daysInMonth = new Date(currentDate.getFullYear(), monthIdx + 1, 0).getDate();
                const startingDay = monthDate.getDay();
                
                return (
                  <div key={monthIdx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 flex flex-col hover:bg-slate-800 transition cursor-pointer" onClick={() => setCalendarView('month')}>
                    <h3 className="font-bold text-lg mb-2 text-blue-400">{monthName}</h3>
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-slate-500 font-bold">
                      {['S','M','T','W','T','F','S'].map((d, i) => <span key={i}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const hasEvents = events.some(e => {
                          const eDate = new Date(e.date);
                          return eDate.getFullYear() === currentDate.getFullYear() && eDate.getMonth() === monthIdx && eDate.getDate() === dayNum;
                        });
                        return (
                          <div key={dayNum} className="flex justify-center items-center aspect-square rounded-full relative">
                            <span className={hasEvents ? 'text-white font-bold' : 'text-slate-400'}>{dayNum}</span>
                            {hasEvents && <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-3 lg:col-span-2 bg-slate-800/80 p-6 flex flex-col border-l border-slate-700/50">
          <h3 className="text-lg font-bold mb-4 flex items-center text-orange-400"><Utensils size={18} className="mr-2"/> Dinner</h3>
          <div className="space-y-2 mb-6">
            {meals.length === 0 && <span className="text-xs text-slate-500">No meal planned</span>}
            {meals.map(meal => (
              <div key={meal.id} className="p-3 bg-slate-700/50 rounded-lg flex flex-col gap-2 border border-slate-600/30 shadow-sm">
                <span className="text-sm font-bold">{meal.title}</span>
                {meal.video_url && <button onClick={() => setActiveVideo(meal.video_url)} className="flex items-center justify-center gap-1 bg-orange-500/20 text-orange-400 py-1 rounded text-xs font-bold"><Play size={12} /> Play</button>}
              </div>
            ))}
          </div>

          <h3 className="text-lg font-bold mb-4 flex items-center text-green-400"><CheckCircle size={18} className="mr-2"/> Today's Chores</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-6 hide-scrollbar">
            {todaysChores.length === 0 && <span className="text-xs text-slate-500">No chores today</span>}
            {todaysChores.map(chore => {
               const member = members.find(m => m.id === chore.assigned_to);
               const isBounty = !chore.assigned_to;
               return (
                <div key={chore.id} className={`p-3 rounded-lg flex flex-col border ${isBounty ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-slate-700/50 border-slate-600/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isBounty ? 'text-yellow-400' : 'text-slate-200'}`}>{chore.title}</span>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-500 cursor-pointer hover:bg-green-400 hover:border-green-400 transition" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {isBounty ? '💰 BOUNTY BOARD' : (member?.name || 'Unknown')} • {chore.points} pts
                  </span>
                </div>
               );
            })}
          </div>
        </div>
      </div>

      {/* PARENT PORTAL */}
      <AnimatePresence>
        {showPortal && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-12">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full h-[80vh] flex overflow-hidden">
              {!isAuthenticated ? (
                <form onSubmit={handlePinSubmit} className="flex flex-col items-center justify-center w-full p-12">
                  <h2 className="text-3xl font-bold mb-8">Enter Parent PIN</h2>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-slate-700 text-center text-4xl tracking-[1em] p-6 rounded-xl w-72 mb-8 outline-none focus:ring-2 focus:ring-blue-500" placeholder="****" maxLength="4" autoFocus />
                  <div className="flex space-x-4 w-72">
                    <button type="button" onClick={() => setShowPortal(false)} className="flex-1 p-4 bg-slate-700 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="flex-1 p-4 bg-blue-600 rounded-lg font-bold">Unlock</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="w-64 bg-slate-900 p-6 flex flex-col border-r border-slate-700">
                    <h2 className="text-xl font-bold mb-8 text-blue-400">Settings</h2>
                    <nav className="flex-1 space-y-2">
                      <button onClick={() => setPortalTab('dashboard')} className={`w-full flex items-center p-3 rounded-lg transition ${portalTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={18} className="mr-3" /> Events</button>
                      <button onClick={() => setPortalTab('chores')} className={`w-full flex items-center p-3 rounded-lg transition ${portalTab === 'chores' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><ClipboardList size={18} className="mr-3" /> Chores & Bounty</button>
                      <button onClick={() => setPortalTab('family')} className={`w-full flex items-center p-3 rounded-lg transition ${portalTab === 'family' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={18} className="mr-3" /> Family Profiles</button>
                    </nav>
                    <button onClick={() => { setShowPortal(false); setIsAuthenticated(false); }} className="p-4 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500 hover:text-white transition">Lock & Exit</button>
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto">
                    
                    {/* EVENTS TAB */}
                    {portalTab === 'dashboard' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Quick Add Event</h2>
                        <form onSubmit={handleAddEvent} className="bg-slate-700/50 p-6 rounded-xl border border-slate-600 mb-8">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm text-slate-400 mb-1">Title</label><input required type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600" /></div>
                            <div>
                              <label className="block text-sm text-slate-400 mb-1">Category</label>
                              <select value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                              </select>
                            </div>
                            <div><label className="block text-sm text-slate-400 mb-1">Date</label><input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600 [color-scheme:dark]" /></div>
                            <div><label className="block text-sm text-slate-400 mb-1">Time</label><input required type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600 [color-scheme:dark]" /></div>
                            <div className="col-span-2">
                              <label className="block text-sm text-slate-400 mb-1">Assign To</label>
                              <select value={newEvent.member_id} onChange={e => setNewEvent({...newEvent, member_id: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                <option value="">Entire Family</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 transition">Add to Calendar</button>
                        </form>
                      </div>
                    )}

                    {/* CHORES TAB */}
                    {portalTab === 'chores' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">Assign Chores & Templates</h2>
                        <form onSubmit={handleAddChore} className="bg-slate-700/50 p-6 rounded-xl border border-slate-600 mb-8">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm text-slate-400 mb-1">Chore Title</label><input required type="text" value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600" /></div>
                            <div>
                              <label className="block text-sm text-slate-400 mb-1">Assignee</label>
                              <select value={newChore.assigned_to} onChange={e => setNewChore({...newChore, assigned_to: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                <option value="" className="text-yellow-400 font-bold">💰 OPEN (Bounty Board)</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <div><label className="block text-sm text-slate-400 mb-1">Start Date</label><input required type="date" value={newChore.start_date} onChange={e => setNewChore({...newChore, start_date: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600 [color-scheme:dark]" /></div>
                            <div><label className="block text-sm text-slate-400 mb-1">Points / Reward</label><input required type="number" min="0" value={newChore.points} onChange={e => setNewChore({...newChore, points: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600" /></div>
                            <div className="col-span-2">
                              <label className="block text-sm text-slate-400 mb-1">Recurrence Template (Generates next 4 weeks)</label>
                              <select value={newChore.template} onChange={e => setNewChore({...newChore, template: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                <option value="once">Just Once</option>
                                <option value="daily">Every Day (7 Days/Week)</option>
                                <option value="weekdays">Weekdays (5 Days: Mon-Fri)</option>
                                <option value="3days">3 Days (Mon, Wed, Fri)</option>
                                <option value="7on7off">7 Days On / 7 Days Off</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-500 transition">Generate & Save Chores</button>
                        </form>
                      </div>
                    )}

                    {/* FAMILY PROFILES TAB */}
                    {portalTab === 'family' && (
                       <div>
                         <h2 className="text-2xl font-bold mb-6">Manage Profiles</h2>
                         <form onSubmit={handleAddMember} className="bg-slate-700/50 p-6 rounded-xl border border-slate-600 mb-8">
                           
                           <div className="mb-6">
                             <label className="block text-sm text-slate-400 mb-2">Profile Photo</label>
                             <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="relative border-2 border-dashed border-slate-500 hover:border-blue-400 bg-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-blue-300 transition cursor-pointer">
                               {isUploading ? (
                                 <span className="font-medium animate-pulse">Uploading...</span>
                               ) : newMember.avatar_url ? (
                                 <div className="flex flex-col items-center">
                                   <img src={newMember.avatar_url} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-blue-500 mb-2" />
                                   <span className="text-xs">Tap or drag to replace</span>
                                 </div>
                               ) : (
                                 <>
                                   <UploadCloud size={28} className="mb-2" />
                                   <span className="font-medium">Drag & Drop photo here</span>
                                   <span className="text-xs mt-1 text-slate-500">or tap to open photo library</span>
                                 </>
                               )}
                               <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4 mb-6">
                             <div>
                               <label className="block text-sm text-slate-400 mb-1">Name</label>
                               <input required type="text" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600" />
                             </div>
                             <div>
                               <label className="block text-sm text-slate-400 mb-1">Role / Type</label>
                               <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                 <option value="parent">Parent</option>
                                 <option value="child">Child</option>
                                 <option value="grandparent">Grandparent</option>
                                 <option value="relative">Relative</option>
                                 <option value="best_friend">Best Friend</option>
                                 <option value="pet">Pet</option>
                               </select>
                             </div>
                             
                             {/* UPGRADE: ACCESS LEVEL DROPDOWN */}
                             <div className="col-span-2">
                               <label className="block text-sm text-slate-400 mb-1">App Access Level</label>
                               <select value={newMember.access_level} onChange={e => setNewMember({...newMember, access_level: e.target.value})} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600">
                                 <option value="view_only">View Only (Child/Guest Mode)</option>
                                 <option value="full_access">Full Access (Admin/Parent Portal)</option>
                               </select>
                             </div>
                             
                           </div>
                           <button type="submit" disabled={isUploading} className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                             {isUploading ? 'Uploading Image...' : 'Save Profile'}
                           </button>
                         </form>
                       </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}