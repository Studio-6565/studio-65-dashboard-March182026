import React, { useState } from 'react';

const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

const FRAME_RATES = ['23.976', '24', '25', '29.97', '30', '50', '59.94', '60', '120'];
const RESOLUTIONS = ['1080p', '2K', '4K', '6K', '8K'];
const ORIENTATIONS = ['Landscape', 'Portrait', '1:1 Square', 'Vertical (9:16)', 'Anamorphic'];
const CODECS = ['H.264', 'H.265 (HEVC)', 'ProRes 422', 'ProRes 4444', 'RAW', 'BRAW', 'R3D', 'XAVC'];
const COLOR_PROFILES = ['Standard', 'Log (S-Log2)', 'Log (S-Log3)', 'Log (V-Log)', 'Log (C-Log)', 'Log (D-Log)', 'HLG', 'Rec.709', 'Rec.2020'];

export default function SetupTab({ project, onUpdate }) {
  const setup = project.setup || {};
  const shotList = project.shot_list || [];
  const [shotInput, setShotInput] = useState('');
  const [localSetup, setLocalSetup] = useState(setup);
  const [saving, setSaving] = useState(false);

  const handleSetupChange = (key, val) => {
    setLocalSetup(s => ({ ...s, [key]: val }));
  };

  const handleSaveSetup = async () => {
    setSaving(true);
    await onUpdate({ setup: localSetup });
    setSaving(false);
  };

  const handleAddShot = async () => {
    if (!shotInput.trim()) return;
    const shots = [...shotList, { shot: shotInput.trim(), done: false }];
    await onUpdate({ shot_list: shots });
    setShotInput('');
  };

  const handleToggleShot = async (i) => {
    const shots = shotList.map((s, j) => j === i ? { ...s, done: !s.done } : s);
    await onUpdate({ shot_list: shots });
  };

  const handleDelShot = async (i) => {
    const shots = shotList.filter((_, j) => j !== i);
    await onUpdate({ shot_list: shots });
  };

  const donePct = shotList.length ? Math.round(shotList.filter(s => s.done).length / shotList.length * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Camera / Tech Setup */}
      <div>
        <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Camera & Tech Setup</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={LL}>Arrival Time</label>
            <input style={SS} type="time" value={localSetup.arrival_time || ''} onChange={e => handleSetupChange('arrival_time', e.target.value)} />
          </div>
          <div>
            <label style={LL}>Camera Orientation</label>
            <select style={SS} value={localSetup.camera_orientation || ''} onChange={e => handleSetupChange('camera_orientation', e.target.value)}>
              <option value="">— select —</option>
              {ORIENTATIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LL}>Frame Rate</label>
            <select style={SS} value={localSetup.frame_rate || ''} onChange={e => handleSetupChange('frame_rate', e.target.value)}>
              <option value="">— select —</option>
              {FRAME_RATES.map(f => <option key={f} value={f}>{f} fps</option>)}
            </select>
          </div>
          <div>
            <label style={LL}>Resolution</label>
            <select style={SS} value={localSetup.resolution || ''} onChange={e => handleSetupChange('resolution', e.target.value)}>
              <option value="">— select —</option>
              {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={LL}>Codec</label>
            <select style={SS} value={localSetup.codec || ''} onChange={e => handleSetupChange('codec', e.target.value)}>
              <option value="">— select —</option>
              {CODECS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LL}>Color Profile</label>
            <select style={SS} value={localSetup.color_profile || ''} onChange={e => handleSetupChange('color_profile', e.target.value)}>
              <option value="">— select —</option>
              {COLOR_PROFILES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={LL}>Gear / Kit List</label>
          <textarea style={{ ...SS, resize: 'none', minHeight: 70 }} rows={3} value={localSetup.gear || ''} onChange={e => handleSetupChange('gear', e.target.value)} placeholder="e.g. Sony FX6, DJI RS3, Aputure 600d, Lavalier mics..." />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LL}>Setup Notes</label>
          <textarea style={{ ...SS, resize: 'none', minHeight: 60 }} rows={2} value={localSetup.notes || ''} onChange={e => handleSetupChange('notes', e.target.value)} placeholder="Special instructions, access codes, parking, etc." />
        </div>
        <button onClick={handleSaveSetup} disabled={saving} style={{ padding: '8px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Setup'}
        </button>
      </div>

      {/* Shot List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shot List</div>
          {shotList.length > 0 && (
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: donePct === 100 ? '#7BC853' : '#666' }}>
              {shotList.filter(s => s.done).length}/{shotList.length} done · {donePct}%
            </span>
          )}
        </div>
        {shotList.length > 0 && (
          <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${donePct}%`, background: '#7BC853', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        )}
        <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
          {!shotList.length ? (
            <div style={{ color: '#555', fontSize: 13, padding: '8px 0' }}>No shots added yet.</div>
          ) : shotList.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: s.done ? 'rgba(123,200,83,0.05)' : '#2A2A2A', borderRadius: 8, marginBottom: 6, border: `1px solid ${s.done ? 'rgba(123,200,83,0.2)' : 'transparent'}` }}>
              <input type="checkbox" checked={s.done} onChange={() => handleToggleShot(i)} style={{ width: 15, height: 15, accentColor: '#7BC853', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? '#555' : '#fff' }}>{s.shot}</span>
              <button onClick={() => handleDelShot(i)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 15, padding: '0 4px' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...SS, flex: 1 }}
            value={shotInput}
            onChange={e => setShotInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddShot(); } }}
            placeholder="e.g. Wide establishing shot of venue entrance"
          />
          <button onClick={handleAddShot} style={{ padding: '0 16px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
      </div>
    </div>
  );
}