import React, { useState, useEffect, useMemo } from 'react';
import { Users, Zap, Plus, Trash2, Search, CheckCircle, ShieldAlert, LogOut, Copy } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSquadStore } from '../../stores/useSquadStore';

const MOCK_PRESETS = [
  { name: 'Arnold (Iron Legend)', streak: 12, volume: 8500, checkIn: true },
  { name: 'Sly (Cardio King)', streak: 8, volume: 6200, checkIn: true },
  { name: 'Jay (Volume Monster)', streak: 15, volume: 9100, checkIn: true },
  { name: 'Kabir (Streak Keeper)', streak: 22, volume: 5100, checkIn: true },
  { name: 'Vikram (Plank Master)', streak: 0, volume: 0, checkIn: false }
];

export const SquadMatchmaker = () => {
  const { uid, profile } = useAuthStore();
  const { setSquadData } = useSquadStore();

  // Local state
  const [mySquadCode, setMySquadCode] = useState('');
  const [joinedSquads, setJoinedSquads] = useState([]);
  const [activeSquad, setActiveSquad] = useState(null);
  const [activeSquadMembers, setActiveSquadMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [newSquadName, setNewSquadName] = useState('');
  const [memberLimit, setMemberLimit] = useState(5);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Initialise & Sync Squad Code for current user
  useEffect(() => {
    if (!uid || !profile) return;
    
    const syncMySquadCode = async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        let code = '';
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          code = userData.squadCode;
        }
        
        if (!code) {
          // Generate new squad code: FIT- + clean first 4 chars of name + 3 random digits
          const cleanName = (profile.name || 'FitDesi').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
          const padName = cleanName.padEnd(4, 'X');
          const randomDigits = Math.floor(100 + Math.random() * 900); // 3 digits
          code = `FIT-${padName}${randomDigits}`;
          
          // Save code to user profile
          await setDoc(userRef, { squadCode: code }, { merge: true });
        }
        
        setMySquadCode(code);
        
        // Calculate actual weekly volume (since Monday of current week) from sessions subcollection
        const today = new Date();
        const currentDay = today.getDay();
        const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const sessionsRef = collection(db, 'users', uid, 'sessions');
        const q = query(sessionsRef, where('date', '>=', startOfWeek));
        const sessionsSnap = await getDocs(q);
        let calculatedWeeklyVolume = 0;
        sessionsSnap.forEach((docSnap) => {
          calculatedWeeklyVolume += docSnap.data().totalVolume || 0;
        });
        
        // Sync public squad_codes document with latest stats
        const codeRef = doc(db, 'squad_codes', code);
        await setDoc(codeRef, {
          uid,
          name: profile.name || 'Anonymous Bro',
          xp: profile.xp || 0,
          level: profile.level || 1,
          streak: profile.streak || 0,
          volume: calculatedWeeklyVolume,
          squadCode: code,
          updatedAt: new Date()
        }, { merge: true });
        
      } catch (err) {
        console.error('[SquadMatchmaker] Error syncing squad code:', err);
      }
    };
    
    syncMySquadCode();
  }, [uid, profile]);

  // Sync member stats in real-time
  const syncRosterStats = async (squadObj) => {
    if (!squadObj || !squadObj.members || !uid) return;

    // Calculate current user's weekly volume in real-time
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const qSess = query(sessionsRef, where('date', '>=', startOfWeek));
    const sessionsSnap = await getDocs(qSess);
    let myCalculatedWeeklyVolume = 0;
    sessionsSnap.forEach((docSnap) => {
      myCalculatedWeeklyVolume += docSnap.data().totalVolume || 0;
    });

    const synced = await Promise.all(
      squadObj.members.map(async (m) => {
        if (m.isMock || !m.squadCode) {
          if (m.uid === uid) {
            let memberName = m.name || profile?.name || 'Priyanshu';
            if (!memberName.endsWith(' (You)')) {
              memberName = `${memberName} (You)`;
            }
            return {
              ...m,
              name: memberName,
              volume: myCalculatedWeeklyVolume
            };
          }
          return m;
        }
        
        try {
          const codeSnap = await getDoc(doc(db, 'squad_codes', m.squadCode));
          if (codeSnap.exists()) {
            const fresh = codeSnap.data();
            let memberName = fresh.name || m.name;
            if (fresh.uid === uid || m.uid === uid) {
              if (!memberName.endsWith(' (You)')) {
                memberName = `${memberName} (You)`;
              }
            }
            return {
              ...m,
              name: memberName,
              streak: fresh.streak || 0,
              volume: fresh.uid === uid ? myCalculatedWeeklyVolume : (fresh.volume || 0),
              checkIn: (fresh.streak || 0) > 0
            };
          }
        } catch (err) {
          console.warn('[SquadMatchmaker] Member sync failed:', m.name, err);
        }
        
        if (m.uid === uid) {
          let memberName = m.name || profile?.name || 'Priyanshu';
          if (!memberName.endsWith(' (You)')) {
            memberName = `${memberName} (You)`;
          }
          return {
            ...m,
            name: memberName,
            volume: myCalculatedWeeklyVolume
          };
        }
        return m;
      })
    );

    setActiveSquadMembers(synced);

    // Calculate XP multiplier: 1.0 + (active members * 0.06), max 1.5
    const activeCount = synced.filter(m => m.checkIn).length;
    const multiplier = parseFloat(Math.min(1.5, 1.0 + activeCount * 0.06).toFixed(2));

    setSquadData({
      id: squadObj.squadCode,
      squadName: squadObj.squadName,
      members: synced,
      weeklyXPMultiplier: multiplier
    });
  };

  // Fetch all squads containing user's UID
  const fetchJoinedSquads = async (selectedCode = null) => {
    if (!uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'shared_squads'),
        where('memberUids', 'array-contains', uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data());
      setJoinedSquads(list);

      if (list.length > 0) {
        let active = list[0];
        if (selectedCode) {
          const matched = list.find(s => s.squadCode === selectedCode);
          if (matched) active = matched;
        } else if (activeSquad) {
          const matched = list.find(s => s.squadCode === activeSquad.squadCode);
          if (matched) active = matched;
        }
        setActiveSquad(active);
        await syncRosterStats(active);
      } else {
        setActiveSquad(null);
        setActiveSquadMembers([]);
      }
    } catch (err) {
      console.error('[SquadMatchmaker] Error fetching joined squads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch squads on mount & squadCode ready
  useEffect(() => {
    if (uid && mySquadCode) {
      fetchJoinedSquads();
    }
  }, [uid, mySquadCode]);

  // Create Squad Action
  const handleCreateSquad = async (e) => {
    e.preventDefault();
    if (!newSquadName.trim() || !uid || !mySquadCode) return;
    
    setLoading(true);
    try {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      let randomPart = '';
      for (let i = 0; i < 3; i++) {
        randomPart += letters.charAt(Math.floor(Math.random() * letters.length));
        randomPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
      }
      const squadCode = `SQ-${randomPart}`;

      const initialMember = {
        uid,
        name: `${profile?.name || 'Priyanshu'} (You)`,
        squadCode: mySquadCode,
        joinedAt: new Date()
      };

      const newSquadDoc = {
        squadCode,
        squadName: newSquadName.trim(),
        creatorUid: uid,
        memberLimit: parseInt(memberLimit, 10) || 5,
        memberUids: [uid],
        members: [initialMember],
        weeklyXPMultiplier: 1.0,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'shared_squads', squadCode), newSquadDoc);
      setNewSquadName('');
      setSuccessMsg(`Squad "${newSquadDoc.squadName}" created!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      
      await fetchJoinedSquads(squadCode);
    } catch (err) {
      console.error('[SquadMatchmaker] Error creating squad:', err);
      alert('Failed to create squad.');
    } finally {
      setLoading(false);
    }
  };

  // Join Squad Action
  const handleJoinSquad = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !uid || !mySquadCode) return;
    
    setLoading(true);
    try {
      const codeStr = joinCodeInput.trim().toUpperCase();
      const docRef = doc(db, 'shared_squads', codeStr);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        alert('Squad Code not found!');
        return;
      }

      const squadData = snap.data();

      if (squadData.memberUids.includes(uid)) {
        alert('You are already a member!');
        setActiveSquad(squadData);
        await syncRosterStats(squadData);
        setJoinCodeInput('');
        return;
      }

      const activeMembersCount = squadData.members.length;
      if (activeMembersCount >= squadData.memberLimit) {
        alert(`Squad is full! (Limit: ${squadData.memberLimit} members)`);
        return;
      }

      const newMember = {
        uid,
        name: `${profile?.name || 'Priyanshu'} (You)`,
        squadCode: mySquadCode,
        joinedAt: new Date()
      };

      const updatedSquad = {
        ...squadData,
        memberUids: [...squadData.memberUids, uid],
        members: [...squadData.members, newMember]
      };

      await setDoc(docRef, updatedSquad, { merge: true });
      setJoinCodeInput('');
      setSuccessMsg(`Joined squad "${squadData.squadName}"!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      await fetchJoinedSquads(codeStr);
    } catch (err) {
      console.error('[SquadMatchmaker] Error joining squad:', err);
      alert('Failed to join squad.');
    } finally {
      setLoading(false);
    }
  };

  // Leave Squad Action
  const handleLeaveSquad = async () => {
    if (!activeSquad || !uid) return;
    if (activeSquad.creatorUid === uid) {
      const confirmLeave = window.confirm(
        'You are the creator. If you leave, another member will become creator (or squad will be deleted if you are the only member). Proceed?'
      );
      if (!confirmLeave) return;
    } else {
      const confirmLeave = window.confirm(`Leave squad "${activeSquad.squadName}"?`);
      if (!confirmLeave) return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'shared_squads', activeSquad.squadCode);
      const remainingUids = activeSquad.memberUids.filter(id => id !== uid);
      const remainingMembers = activeSquad.members.filter(m => m.uid !== uid);

      if (remainingMembers.length === 0) {
        await deleteDoc(docRef);
      } else {
        let newCreator = activeSquad.creatorUid;
        if (activeSquad.creatorUid === uid) {
          const firstRealMember = remainingMembers.find(m => !m.isMock);
          newCreator = firstRealMember ? firstRealMember.uid : remainingMembers[0].uid;
        }

        await setDoc(docRef, {
          creatorUid: newCreator,
          memberUids: remainingUids,
          members: remainingMembers
        }, { merge: true });
      }

      setSuccessMsg(`Left squad "${activeSquad.squadName}"`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setActiveSquad(null);
      await fetchJoinedSquads();
    } catch (err) {
      console.error('[SquadMatchmaker] Error leaving squad:', err);
      alert('Failed to leave squad.');
    } finally {
      setLoading(false);
    }
  };

  // Kick Member Action
  const handleKickMember = async (targetUid) => {
    if (!activeSquad) return;
    const confirmKick = window.confirm('Remove this member?');
    if (!confirmKick) return;

    try {
      const docRef = doc(db, 'shared_squads', activeSquad.squadCode);
      const updatedMembers = activeSquad.members.filter(m => m.uid !== targetUid);
      const updatedUids = activeSquad.memberUids.filter(id => id !== targetUid);

      const payload = {
        members: updatedMembers,
        memberUids: updatedUids
      };

      await setDoc(docRef, payload, { merge: true });
      await fetchJoinedSquads(activeSquad.squadCode);
    } catch (err) {
      console.error('[SquadMatchmaker] Failed to kick member:', err);
    }
  };

  // Draft Mock Preset Action
  const handleDraftMember = async (presetObj) => {
    if (!activeSquad) return;
    
    if (activeSquad.members.length >= activeSquad.memberLimit) {
      alert(`Squad limit reached! (Max: ${activeSquad.memberLimit})`);
      return;
    }

    const exists = activeSquad.members.some(m => m.name === presetObj.name);
    if (exists) {
      alert('This preset is already drafted!');
      return;
    }

    try {
      const docRef = doc(db, 'shared_squads', activeSquad.squadCode);
      const newPreset = {
        uid: crypto.randomUUID(),
        name: presetObj.name,
        isMock: true,
        streak: presetObj.streak,
        volume: presetObj.volume,
        checkIn: presetObj.checkIn
      };

      const payload = {
        members: [...activeSquad.members, newPreset]
      };

      await setDoc(docRef, payload, { merge: true });
      await fetchJoinedSquads(activeSquad.squadCode);
    } catch (err) {
      console.error('[SquadMatchmaker] Failed to draft preset:', err);
    }
  };

  // Calculations
  const isCreator = activeSquad?.creatorUid === uid;
  const activeMembersCount = activeSquadMembers.filter(m => m.checkIn).length;
  const multiplier = Math.min(1.5, 1.0 + activeMembersCount * 0.06);
  const totalVolume = activeSquadMembers.reduce((sum, m) => sum + (m.volume || 0), 0);

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
          <Users className="text-[var(--primary)]" size={22} />
          <span>Fantasy League Matchmaker</span>
        </h3>
        
        {activeSquad && (
          <div className="flex items-center gap-1.5 border-2 border-black bg-black px-3.5 py-1.5 rounded-xl text-xs font-mono text-[var(--accent-xp)] font-black uppercase shadow-[3px_3px_0px_black] animate-pulse">
            <Zap size={12} />
            <span>{multiplier.toFixed(2)}x Team Multiplier</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center font-mono text-xs text-neutral-500 uppercase animate-pulse">
          Connecting to Accountability Feed...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Roster Switcher Dropdown */}
          {joinedSquads.length > 0 && (
            <div className="flex flex-col gap-1.5 border-b border-[#111] pb-4">
              <label className="text-[9px] font-mono text-[var(--text-secondary)] uppercase font-bold">Switch Accountability Squad</label>
              <div className="flex gap-2">
                <select
                  value={activeSquad?.squadCode || ''}
                  onChange={(e) => {
                    const selected = joinedSquads.find(s => s.squadCode === e.target.value);
                    if (selected) {
                      setActiveSquad(selected);
                      syncRosterStats(selected);
                    }
                  }}
                  className="bg-black border border-[#222] px-3.5 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)] w-full cursor-pointer"
                >
                  {joinedSquads.map(s => (
                    <option key={s.squadCode} value={s.squadCode}>
                      {s.squadName} ({s.squadCode})
                    </option>
                  ))}
                </select>

                {activeSquad && (
                  <button
                    onClick={() => setActiveSquad(null)}
                    className="bg-neutral-900 border border-[#222] hover:border-[var(--primary)] text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer uppercase shrink-0 transition-all"
                  >
                    Create/Join New
                  </button>
                )}
              </div>
            </div>
          )}

          {activeSquad === null ? (
            /* ONBOARDING STATE: CREATE OR JOIN A SQUAD */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Create Squad Panel */}
              <form onSubmit={handleCreateSquad} className="border border-[#222] bg-black/40 p-5 rounded-xl flex flex-col gap-4">
                <span className="text-xs font-mono text-white uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                  <Plus size={14} className="text-[var(--primary)]" />
                  <span>Create a New Squad</span>
                </span>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">Squad Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Temple Bros"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    className="bg-black border border-[#222] px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)] w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">Member Limit</label>
                  <select
                    value={memberLimit}
                    onChange={(e) => setMemberLimit(parseInt(e.target.value, 10))}
                    className="bg-black border border-[#222] px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)] w-full cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Members Max</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-[var(--primary)] text-white font-mono text-xs font-bold py-2 border border-black rounded-lg shadow-[2px_2px_0px_black] uppercase cursor-pointer active:scale-95 transition-all mt-2"
                >
                  Create Squad
                </button>
              </form>

              {/* Join Squad Panel */}
              <form onSubmit={handleJoinSquad} className="border border-[#222] bg-black/40 p-5 rounded-xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-mono text-white uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                    <Search size={14} className="text-[var(--secondary)]" />
                    <span>Join an Existing Squad</span>
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">Squad Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SQ-ABC123"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="bg-black border border-[#222] px-3 py-1.5 rounded-lg text-xs font-mono text-white placeholder-neutral-700 focus:outline-none focus:border-[var(--primary)] w-full uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[var(--secondary)] text-black font-mono text-xs font-black py-2 border border-black rounded-lg shadow-[2px_2px_0px_black] uppercase cursor-pointer active:scale-95 transition-all"
                >
                  Join Squad
                </button>
              </form>

            </div>
          ) : (
            /* ACTIVE SQUAD VIEW */
            <div className="flex flex-col gap-5">
              
              {/* Active Squad Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/30 border border-[#222] p-4 rounded-xl">
                <div>
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase font-bold">Active Squad</span>
                  <h4 className="font-display font-black text-xl text-white uppercase tracking-wide">
                    {activeSquad.squadName}
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Limit: {activeSquadMembers.length} / {activeSquad.memberLimit} members
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleLeaveSquad}
                    className="flex items-center gap-1 bg-red-950/20 border border-red-500/30 hover:border-red-500 text-red-500 font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg cursor-pointer uppercase transition-all"
                  >
                    <LogOut size={12} />
                    <span>Leave Squad</span>
                  </button>
                </div>
              </div>

              {/* Roster Display */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold border-b border-neutral-900 pb-1.5">
                  <span>Squad Roster ({activeSquadMembers.length} members)</span>
                  <span>Weekly Volume: {totalVolume}kg</span>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  {activeSquadMembers.map((mbr, idx) => (
                    <div key={idx} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-3 rounded-xl flex items-center justify-between shadow-[2px_2px_0px_black] text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${mbr.checkIn ? 'bg-[#33FF66]' : 'bg-[#FF3366]'}`} />
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{mbr.name}</span>
                          {mbr.isMock && <span className="text-[8px] text-[var(--secondary)] uppercase font-bold">Simulator Buddy</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)]">
                        <span>Streak: <strong className="text-white">{mbr.streak || 0}d</strong></span>
                        <span>Volume: <strong className="text-white">{mbr.volume || 0}kg</strong></span>
                        {isCreator && mbr.uid !== uid && (
                          <button
                            onClick={() => handleKickMember(mbr.uid)}
                            className="text-red-500 hover:text-red-400 cursor-pointer p-1"
                            title="Kick member"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Code Widget */}
              <div className="flex items-center justify-between border border-[#222] bg-black/40 p-4 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-white uppercase font-bold">Invite Gym Bros</span>
                  <span className="text-[9px] text-neutral-500">Share this code to let friends join:</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeSquad.squadCode);
                    alert('Squad Code copied to clipboard!');
                  }}
                  className="bg-[var(--primary)] text-black font-mono text-[9px] font-black px-3 py-2 border border-black rounded shadow-[2px_2px_0px_black] uppercase cursor-pointer flex items-center gap-1.5 hover:brightness-110"
                >
                  <Copy size={12} />
                  <span>Code: {activeSquad.squadCode}</span>
                </button>
              </div>

              {/* Simulator Presets */}
              {isCreator && activeSquadMembers.length < activeSquad.memberLimit && (
                <div className="border border-[#222] bg-black/40 p-4 rounded-xl flex flex-col gap-3">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">Simulator Presets (Draft to fill spots for testing)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {MOCK_PRESETS.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDraftMember(m)}
                        className="bg-neutral-900 border border-[#222] hover:border-[var(--secondary)] text-[9px] font-mono text-neutral-300 px-2 py-1 rounded-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <span>{m.name}</span>
                        <span className="text-[8px] text-[var(--accent-xp)] font-black">+{m.volume}kg</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Feedback messages */}
          {successMsg && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#33FF66] justify-center mt-2">
              <CheckCircle size={12} />
              <span>{successMsg}</span>
            </div>
          )}

          <p className="text-[9px] text-[var(--text-muted)] leading-relaxed font-sans mt-2">
            Weekly Accountability: The Team Multiplier multiplies all XP earned by squad members from logging workouts. If any member has a streak of 0 days (fails to log within 48h), their check-in resets, and the team multiplier decreases!
          </p>

        </div>
      )}

    </div>
  );
};
