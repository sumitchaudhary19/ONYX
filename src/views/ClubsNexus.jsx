import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { 
  ArrowLeft, Lock, Send, Crown, Shield, Calendar, MapPin, Megaphone, 
  Users, MessageCircle, Star, Zap, Check, X, Loader2, Plus, Palette, Key 
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Megashows', color: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.25)', twText: 'text-amber-500' },
  { name: 'Tech & Innovation', color: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.25)', twText: 'text-cyan-500' },
  { name: 'Media & Arts', color: '#ec4899', shadow: 'rgba(236, 72, 153, 0.25)', twText: 'text-pink-500' },
  { name: 'Music & Sound', color: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.25)', twText: 'text-violet-500' },
  { name: 'Literary & Oratory', color: '#10b981', shadow: 'rgba(16, 185, 129, 0.25)', twText: 'text-emerald-500' },
  { name: 'Culture & Outreach', color: '#f97316', shadow: 'rgba(249, 115, 22, 0.25)', twText: 'text-orange-500' }
];

export default function ClubsNexus({ profile, session, onTabChange }) {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clubs')
      .select('*');
    
    if (error) {
      console.error('Error fetching clubs:', error);
    } else {
      setClubs(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#060b18] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <p className="text-white/70 font-medium">Loading The Nexus...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#060b18] text-white overflow-hidden flex flex-col relative font-sans">
      <AnimatePresence mode="wait">
        {selectedClub ? (
          <motion.div
            key="club-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full flex flex-col"
          >
            <ClubView 
              club={selectedClub} 
              profile={profile} 
              onBack={() => setSelectedClub(null)} 
              onAdminClaimed={(admin_id) => {
                const updated = { ...selectedClub, admin_id };
                setSelectedClub(updated);
                setClubs(prev => prev.map(c => c.id === updated.id ? updated : c));
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden pb-20 scrollbar-hide"
          >
            <NexusDashboard clubs={clubs} onSelect={setSelectedClub} />
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function NexusDashboard({ clubs, onSelect }) {
  return (
    <div className="p-6 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col mb-8">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-cyan-400 fill-cyan-400" />
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
            The Nexus
          </h1>
        </div>
        <p className="text-white/50 text-lg mt-1 font-medium">MNIT Clubs & Societies</p>
      </div>

      <div className="space-y-10">
        {CATEGORIES.map(category => {
          const categoryClubs = clubs.filter(c => c.category === category.name);
          if (categoryClubs.length === 0) return null;

          return (
            <CategorySwimLane 
              key={category.name} 
              category={category} 
              clubs={categoryClubs} 
              onSelect={onSelect} 
            />
          );
        })}
      </div>
    </div>
  );
}

function CategorySwimLane({ category, clubs, onSelect }) {
  return (
    <div className="flex flex-col space-y-4">
      <h2 className={`text-xl font-bold ${category.twText} flex items-center gap-2`}>
        <Zap className="w-5 h-5" />
        {category.name}
      </h2>
      <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-hide px-1">
        {clubs.map(club => (
          <ClubCapsule 
            key={club.id} 
            club={club} 
            category={category} 
            onSelect={onSelect} 
          />
        ))}
      </div>
    </div>
  );
}

function ClubCapsule({ club, category, onSelect }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(club)}
      className="flex-shrink-0 w-36 cursor-pointer bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-white/[0.08]"
      style={{ boxShadow: `0 0 20px ${category.shadow}` }}
    >
      <div className="text-5xl mb-3 drop-shadow-lg">{club.avatar_emoji || '🎭'}</div>
      <h3 className="font-semibold text-sm line-clamp-2 leading-tight w-full mb-2">{club.name}</h3>
      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-black/40 text-white/80 border border-white/10 mt-auto">
        Explore
      </span>
    </motion.div>
  );
}

function ClubView({ club, profile, onBack, onAdminClaimed }) {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMembership();
  }, [club.id, profile.id]);

  const checkMembership = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', club.id)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!error && data) {
      setMembership(data);
    } else {
      setMembership(null);
    }
    setLoading(false);
  };

  const handleRequestJoin = async () => {
    const { data, error } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: profile.id, status: 'pending' })
      .select()
      .single();

    if (!error && data) {
      setMembership(data);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center p-4 border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors mr-3"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-2xl mr-3">{club.avatar_emoji}</div>
        <h1 className="text-xl font-bold">{club.name}</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        {membership?.status === 'approved' || profile.id === club.admin_id ? (
          <ClubTabs club={club} profile={profile} membership={membership} />
        ) : (
          <LockedScreen 
            club={club} 
            membership={membership} 
            onRequestJoin={handleRequestJoin}
            profile={profile}
            onAdminClaimed={onAdminClaimed}
          />
        )}
      </div>
    </div>
  );
}

function LockedScreen({ club, membership, onRequestJoin, profile, onAdminClaimed }) {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimAttempts, setClaimAttempts] = useState(0);
  const [claimError, setClaimError] = useState('');

  const handleClaimAdmin = async () => {
    if (!passcode.trim() || claimAttempts >= 3) return;
    setClaimLoading(true);
    setClaimError('');
    
    const { data, error } = await supabase.rpc('verify_genesis_admin', {
      p_club_id: club.id,
      p_passcode: passcode,
      p_user_id: profile.id
    });

    if (error) {
      setClaimError(error.message);
      setClaimAttempts(prev => prev + 1);
    } else if (data === true) {
      setShowClaimModal(false);
      onAdminClaimed(profile.id);
    } else {
      setClaimError('Invalid Genesis Passcode.');
      setClaimAttempts(prev => prev + 1);
    }
    setClaimLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl z-10"
      >
        <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center border border-white/10 mb-6 relative">
          <div className="text-4xl">{club.avatar_emoji}</div>
          <div className="absolute -bottom-2 -right-2 bg-rose-500 rounded-full p-1.5 border-2 border-[#060b18]">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{club.name}</h2>
        <p className="text-white/60 mb-8 text-sm">{club.description || 'A community for like-minded students.'}</p>
        
        {membership?.status === 'pending' ? (
          <button disabled className="w-full py-3 px-6 rounded-xl font-semibold bg-white/5 text-white/50 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Requested ⏳
          </button>
        ) : membership?.status === 'rejected' ? (
          <div className="w-full space-y-3">
            <p className="text-rose-400 text-sm font-medium">Your request was not approved.</p>
            <button 
              onClick={onRequestJoin}
              className="w-full py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              Request Again
            </button>
          </div>
        ) : (
          <button 
            onClick={onRequestJoin}
            className="w-full py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:scale-105 active:scale-95"
          >
            Request to Join
          </button>
        )}

        {!club.admin_id && (
          <button 
            onClick={() => setShowClaimModal(true)}
            className="mt-6 w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-white/20"
          >
            Claim Admin Rights 👑
          </button>
        )}
      </motion.div>

      {/* Claim Modal */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowClaimModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
              
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                <Key className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-bold mb-2">Genesis Admin</h3>
              <p className="text-sm text-white/60 mb-6">Enter the Pre-Shared Key (PSK) to claim permanent ownership of this club.</p>
              
              <input
                type="text"
                placeholder="XXX-ONX-XXXX"
                value={passcode}
                onChange={e => { setPasscode(e.target.value.toUpperCase()); setClaimError(''); }}
                disabled={claimAttempts >= 3 || claimLoading}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-widest text-center uppercase"
              />
              
              {claimError && (
                <p className="text-rose-400 text-xs mt-2 text-center font-medium animate-pulse">{claimError}</p>
              )}
              {claimAttempts >= 3 && (
                <p className="text-rose-500 text-xs mt-2 text-center font-bold">Too many failed attempts. Device locked.</p>
              )}
              
              <button
                onClick={handleClaimAdmin}
                disabled={!passcode.trim() || claimAttempts >= 3 || claimLoading}
                className="w-full mt-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                {claimLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Key'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClubTabs({ club, profile, membership }) {
  const isAdmin = profile.id === club.admin_id;
  const tabs = [
    { id: 'lounge', name: 'Lounge', icon: MessageCircle },
    { id: 'noticeboard', name: 'Notice Board', icon: Megaphone },
    { id: 'roadmap', name: 'Roadmap', icon: Calendar },
    { id: 'roster', name: 'Roster', icon: Users },
  ];

  if (isAdmin) {
    tabs.push({ id: 'dashboard', name: 'Dashboard ⚙️', icon: Shield });
  }

  const [activeTab, setActiveTab] = useState('lounge');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex overflow-x-auto scrollbar-hide border-b border-white/10 bg-black/20 shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 relative transition-colors ${isActive ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold text-sm whitespace-nowrap">{tab.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full absolute inset-0 overflow-y-auto"
          >
            {activeTab === 'lounge' && <Lounge club={club} profile={profile} />}
            {activeTab === 'noticeboard' && <NoticeBoard club={club} />}
            {activeTab === 'roadmap' && <Roadmap club={club} />}
            {activeTab === 'roster' && <Roster club={club} profile={profile} />}
            {activeTab === 'dashboard' && isAdmin && <AdminDashboard club={club} profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Lounge({ club, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`club-chat-${club.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'club_messages', 
        filter: `club_id=eq.${club.id}` 
      }, handleNewMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [club.id]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('club_messages')
      .select('*, sender:sender_id(id,first_name,avatar_url)')
      .eq('club_id', club.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const handleNewMessage = async (payload) => {
    const newMsg = payload.new;
    // Fetch sender profile for new message
    const { data: senderData } = await supabase
      .from('profiles')
      .select('id,first_name,avatar_url')
      .eq('id', newMsg.sender_id)
      .single();
    
    if (senderData) {
      newMsg.sender = senderData;
    }
    
    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input;
    setInput('');

    const { error } = await supabase
      .from('club_messages')
      .insert({
        club_id: club.id,
        sender_id: profile.id,
        content: content
      });
      
    if (error) console.error("Error sending message:", error);
  };

  return (
    <div className="flex flex-col h-full bg-[#030610]">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile.id;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {msg.sender?.avatar_url ? (
                  <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">{msg.sender?.first_name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-white/40 mb-1 px-1">
                  {isMe ? 'You' : msg.sender?.first_name || 'Unknown'}
                </span>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-black/40 border-t border-white/5 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-white/30 text-white"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function NoticeBoard({ club }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [club.id]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('club_announcements')
      .select('*, author:author_id(id,first_name,avatar_url)')
      .eq('club_id', club.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 p-8">
        <Megaphone className="w-12 h-12 mb-4 opacity-20" />
        <p>No announcements yet</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      {announcements.map(ann => (
        <div key={ann.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
              {ann.author?.avatar_url ? (
                <img src={ann.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-indigo-400">{ann.author?.first_name?.charAt(0) || '?'}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-white/90">{ann.author?.first_name || 'Admin'}</p>
              <p className="text-xs text-white/40">{new Date(ann.created_at).toLocaleString()}</p>
            </div>
            <div className="ml-auto bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-rose-500/20">
              <Star className="w-3 h-3 fill-rose-400" /> Notice
            </div>
          </div>
          <p className="text-white/80 whitespace-pre-wrap text-sm leading-relaxed">{ann.content}</p>
        </div>
      ))}
    </div>
  );
}

function Roadmap({ club }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [club.id]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('club_events')
      .select('*')
      .eq('club_id', club.id)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 p-8">
        <Calendar className="w-12 h-12 mb-4 opacity-20" />
        <p>No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto relative">
      <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-purple-500/20 to-transparent"></div>
      
      <div className="space-y-8">
        {events.map((ev, idx) => {
          const date = new Date(ev.event_date);
          return (
            <div key={ev.id} className="relative pl-10">
              <div className="absolute left-[-21px] top-1 w-10 h-10 bg-[#060b18] rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10">
                <span className="text-xs font-bold text-cyan-400">{date.getDate()}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-cyan-500/20">
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-purple-500/20">
                    {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{ev.title}</h3>
                <p className="text-white/60 text-sm mb-4">{ev.description}</p>
                {ev.location && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40 bg-black/30 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                    <MapPin className="w-3.5 h-3.5" />
                    {ev.location}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Roster({ club, profile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoster();
  }, [club.id]);

  const fetchRoster = async () => {
    const { data, error } = await supabase
      .from('club_members')
      .select('*, user:user_id(id,first_name,last_name,avatar_url,username), role:role_id(role_name,badge_color)')
      .eq('club_id', club.id)
      .eq('status', 'approved');

    if (!error && data) {
      setMembers(data);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;

  const admin = members.find(m => m.user_id === club.admin_id);
  const roleHolders = members.filter(m => m.user_id !== club.admin_id && m.role_id);
  const general = members.filter(m => m.user_id !== club.admin_id && !m.role_id);

  const renderMember = (m, badgeInfo) => (
    <div key={m.id} className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:bg-white/[0.06] transition-colors">
      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0 overflow-hidden">
        {m.user?.avatar_url ? (
          <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold">
            {m.user?.first_name?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate">
          {m.user?.first_name} {m.user?.last_name}
        </p>
        <p className="text-xs text-white/40 truncate">@{m.user?.username}</p>
      </div>
      {badgeInfo && (
        <div 
          className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border flex items-center gap-1 shrink-0"
          style={{ 
            backgroundColor: `${badgeInfo.color}15`, 
            color: badgeInfo.color,
            borderColor: `${badgeInfo.color}30`
          }}
        >
          {badgeInfo.icon && <badgeInfo.icon className="w-3 h-3" />}
          {badgeInfo.text}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {admin && (
        <section>
          <h3 className="text-xs uppercase font-bold text-white/40 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" /> Leadership
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderMember(admin, { text: 'Founder / Admin', color: '#f59e0b', icon: Crown })}
          </div>
        </section>
      )}

      {roleHolders.length > 0 && (
        <section>
          <h3 className="text-xs uppercase font-bold text-white/40 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" /> Core Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleHolders.map(m => renderMember(m, { text: m.role?.role_name, color: m.role?.badge_color || '#a855f7' }))}
          </div>
        </section>
      )}

      {general.length > 0 && (
        <section>
          <h3 className="text-xs uppercase font-bold text-white/40 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" /> Members
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {general.map(m => renderMember(m, null))}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminDashboard({ club, profile }) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ApprovalMatrix club={club} />
          <RoleForge club={club} />
        </div>
        <div>
          <EventEngine club={club} profile={profile} />
        </div>
      </div>
    </div>
  );
}

function ApprovalMatrix({ club }) {
  const [pending, setPending] = useState([]);
  
  useEffect(() => {
    fetchPending();
  }, [club.id]);

  const fetchPending = async () => {
    const { data, error } = await supabase
      .from('club_members')
      .select('*, user:user_id(id,first_name,last_name,avatar_url)')
      .eq('club_id', club.id)
      .eq('status', 'pending');
    if (!error && data) setPending(data);
  };

  const handleDecision = async (memberId, decision) => {
    const status = decision === 'accept' ? 'approved' : 'rejected';
    
    // Optimistic update
    setPending(prev => prev.filter(m => m.id !== memberId));

    await supabase
      .from('club_members')
      .update({ status })
      .eq('id', memberId);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-400" /> Pending Approvals
      </h3>
      
      {pending.length === 0 ? (
        <p className="text-white/40 text-sm">No pending requests.</p>
      ) : (
        <div className="space-y-3">
          {pending.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                  {m.user?.avatar_url ? (
                    <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                      {m.user?.first_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{m.user?.first_name} {m.user?.last_name}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDecision(m.id, 'accept')}
                  className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 flex items-center justify-center transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDecision(m.id, 'reject')}
                  className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleForge({ club }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#8b5cf6');

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchData();
  }, [club.id]);

  const fetchData = async () => {
    const { data: rData } = await supabase.from('club_roles').select('*').eq('club_id', club.id);
    if (rData) setRoles(rData);

    const { data: mData } = await supabase
      .from('club_members')
      .select('*, user:user_id(first_name,last_name)')
      .eq('club_id', club.id)
      .eq('status', 'approved');
    if (mData) setMembers(mData);
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const { data, error } = await supabase
      .from('club_roles')
      .insert({ club_id: club.id, role_name: newRoleName, badge_color: newRoleColor })
      .select()
      .single();

    if (!error && data) {
      setRoles(prev => [...prev, data]);
      setNewRoleName('');
    }
  };

  const handleAssignRole = async (memberId, roleId) => {
    await supabase
      .from('club_members')
      .update({ role_id: roleId || null })
      .eq('id', memberId);
      
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role_id: roleId || null } : m));
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Palette className="w-5 h-5 text-purple-400" /> Role Forge
      </h3>

      <form onSubmit={handleCreateRole} className="mb-6 space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
        <input 
          type="text" 
          placeholder="Role Name (e.g., Co-Lead)"
          value={newRoleName}
          onChange={e => setNewRoleName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setNewRoleColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${newRoleColor === c ? 'scale-125 border-2 border-white' : 'opacity-50'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button 
          type="submit"
          className="w-full py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500/40 transition-colors"
        >
          Create Role
        </button>
      </form>

      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-black/20 p-2 rounded-lg text-sm">
            <span className="truncate pr-2">{m.user?.first_name} {m.user?.last_name}</span>
            <select
              value={m.role_id || ''}
              onChange={(e) => handleAssignRole(m.id, e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs outline-none max-w-[120px]"
            >
              <option value="">No Role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.role_name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventEngine({ club, profile }) {
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');

  const [annContent, setAnnContent] = useState('');

  const handlePublishEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) return;

    await supabase
      .from('club_events')
      .insert({
        club_id: club.id,
        title: eventTitle,
        description: eventDesc,
        event_date: new Date(eventDate).toISOString(),
        location: eventLoc
      });
    
    setEventTitle(''); setEventDesc(''); setEventDate(''); setEventLoc('');
    alert('Event published!');
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annContent.trim()) return;

    await supabase
      .from('club_announcements')
      .insert({
        club_id: club.id,
        author_id: profile.id,
        content: annContent
      });
      
    setAnnContent('');
    alert('Announcement posted!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" /> Publish Event
        </h3>
        <form onSubmit={handlePublishEvent} className="space-y-3">
          <input 
            type="text" placeholder="Event Title" required
            value={eventTitle} onChange={e => setEventTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <textarea 
            placeholder="Description" rows={2}
            value={eventDesc} onChange={e => setEventDesc(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <input 
            type="datetime-local" required
            value={eventDate} onChange={e => setEventDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm color-scheme-dark"
          />
          <input 
            type="text" placeholder="Location"
            value={eventLoc} onChange={e => setEventLoc(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-semibold transition-colors">
            Publish Event
          </button>
        </form>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-rose-400" /> Post Announcement
        </h3>
        <form onSubmit={handlePostAnnouncement} className="space-y-3">
          <textarea 
            placeholder="Announcement content..." rows={3} required
            value={annContent} onChange={e => setAnnContent(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <button type="submit" className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-sm font-semibold transition-colors">
            Post Announcement
          </button>
        </form>
      </div>
    </div>
  );
}
