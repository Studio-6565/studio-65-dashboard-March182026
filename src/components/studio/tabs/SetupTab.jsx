import React, { useState } from 'react';
import EquipmentChecklist from './EquipmentChecklist';

const SS = { background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'Syne, sans-serif' };
const LL = { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"DM Mono", monospace', marginBottom: 5, display: 'block' };

const FRAME_RATES = ['23.976', '24', '25', '29.97', '30', '50', '59.94', '60', '120'];
const RESOLUTIONS = ['1080p', '2K', '4K', '6K', '8K'];
const ORIENTATIONS = ['Landscape', 'Portrait', '1:1 Square', 'Vertical (9:16)', 'Anamorphic'];
const CODECS = ['H.264', 'H.265 (HEVC)', 'ProRes 422', 'ProRes 4444', 'RAW', 'BRAW', 'R3D', 'XAVC'];
const COLOR_PROFILES = ['Standard', 'Log (S-Log2)', 'Log (S-Log3)', 'Log (V-Log)', 'Log (C-Log)', 'Log (D-Log)', 'HLG', 'Rec.709', 'Rec.2020'];
const PHOTO_FORMATS = ['RAW', 'RAW + JPEG', 'JPEG', 'HEIF', 'TIFF'];
const PHOTO_ASPECTS = ['3:2', '4:3', '1:1', '16:9', 'Full Frame'];

const MONO = '"DM Mono", monospace';

function SectionLabel({ icon, title, color = '#666' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{title}</span>
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <span style={{ fontSize: 13, color: '#ccc' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
          background: value ? '#7BC853' : '#333', transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

function detectCrewTypes(crew = []) {
  const roles = crew.map(c => (c.role || '').toLowerCase());
  const hasVideo = roles.some(r => r.includes('video') || r.includes('videograph') || r.includes('cinemat') || r.includes('camera') || r.includes('dp') || r.includes('director'));
  const hasPhoto = roles.some(r => r.includes('photo') || r.includes('photograph'));
  // If neither detected, default to showing video (fallback)
  return { hasVideo: hasVideo || (!hasVideo && !hasPhoto), hasPhoto };
}

export default function SetupTab({ project, onUpdate }) {
  const setup = project.setup || {};
  const shotList = project.shot_list || [];
  const [shotInput, setShotInput] = useState('');
  const [localSetup, setLocalSetup] = useState(setup);
  const [saving, setSaving] = useState(false);

  const { hasVideo, hasPhoto } = detectCrewTypes(project.crew);

  const set = (key, val) => setLocalSetup(s => ({ ...s, [key]: val }));

  const handleSaveSetup = async () => {
    setSaving(true);
    await onUpdate({ setup: localSetup });
    setSaving(false);
  };

  const handleAddShot = async () => {
    if (!shotInput.trim()) return;
    await onUpdate({ shot_list: [...shotList, { shot: shotInput.trim(), done: false }] });
    setShotInput('');
  };

  const handleToggleShot = async (i) => {
    await onUpdate({ shot_list: shotList.map((s, j) => j === i ? { ...s, done: !s.done } : s) });
  };

  const handleDelShot = async (i) => {
    await onUpdate({ shot_list: shotList.filter((_, j) => j !== i) });
  };

  const donePct = shotList.length ? Math.round(shotList.filter(s => s.done).length / shotList.length * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* General / Logistics */}
      <div>
        <SectionLabel icon="📋" title="General" color="#666" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={LL}>Arrival Time</label>
            <input style={SS} type="time" value={localSetup.arrival_time || ''} onChange={e => set('arrival_time', e.target.value)} />
          </div>
          <div>
            <label style={LL}>Orientation</label>
            <select style={SS} value={localSetup.camera_orientation || ''} onChange={e => set('camera_orientation', e.target.value)}>
              <option value="">— select —</option>
              {ORIENTATIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={LL}>Gear / Kit List</label>
          <textarea style={{ ...SS, resize: 'none', minHeight: 70 }} rows={3} value={localSetup.gear || ''} onChange={e => set('gear', e.target.value)} placeholder="e.g. Sony FX6, DJI RS3, Aputure 600d, Lavalier mics..." />
        </div>
        <div>
          <label style={LL}>Setup Notes</label>
          <textarea style={{ ...SS, resize: 'none', minHeight: 60 }} rows={2} value={localSetup.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Special instructions, access codes, parking, etc." />
        </div>
      </div>

      {/* Video Section */}
      {hasVideo && (
        <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
          <SectionLabel icon="🎥" title="Video Camera Settings" color="#4A9EFF" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={LL}>Frame Rate</label>
              <select style={SS} value={localSetup.frame_rate || ''} onChange={e => set('frame_rate', e.target.value)}>
                <option value="">— select —</option>
                {FRAME_RATES.map(f => <option key={f} value={f}>{f} fps</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Resolution</label>
              <select style={SS} value={localSetup.resolution || ''} onChange={e => set('resolution', e.target.value)}>
                <option value="">— select —</option>
                {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Codec</label>
              <select style={SS} value={localSetup.codec || ''} onChange={e => set('codec', e.target.value)}>
                <option value="">— select —</option>
                {CODECS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Color Profile</label>
              <select style={SS} value={localSetup.color_profile || ''} onChange={e => set('color_profile', e.target.value)}>
                <option value="">— select —</option>
                {COLOR_PROFILES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Photo Section */}
      {hasPhoto && (
        <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
          <SectionLabel icon="📷" title="Photo Settings" color="#A78BFA" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={LL}>File Format</label>
              <select style={SS} value={localSetup.photo_format || ''} onChange={e => set('photo_format', e.target.value)}>
                <option value="">— select —</option>
                {PHOTO_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Aspect Ratio</label>
              <select style={SS} value={localSetup.photo_aspect || ''} onChange={e => set('photo_aspect', e.target.value)}>
                <option value="">— select —</option>
                {PHOTO_ASPECTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Toggle
              label="Shoot in RAW"
              value={!!localSetup.photo_raw}
              onChange={v => set('photo_raw', v)}
            />
            <Toggle
              label="Dual Camera Setup"
              value={!!localSetup.photo_dual_camera}
              onChange={v => set('photo_dual_camera', v)}
            />
            <Toggle
              label="Flash / Strobe On"
              value={!!localSetup.photo_flash}
              onChange={v => set('photo_flash', v)}
            />
          </div>
        </div>
      )}

      {/* Save */}
      <button onClick={handleSaveSetup} disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 20px', background: '#E81A1A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : 'Save Setup'}
      </button>

      {/* Equipment Checklist */}
      <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
        <EquipmentChecklist project={project} onUpdate={onUpdate} />
      </div>

      {/* Shot List */}
      <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SectionLabel icon="🎬" title="Shot List" color="#666" />
          {shotList.length > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: donePct === 100 ? '#7BC853' : '#666' }}>
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