import React, { useState, useEffect } from 'react';
import EquipmentChecklist from './EquipmentChecklist';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import BottomSheet from '@/components/studio/BottomSheet';

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
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);

  useEffect(() => {
    base44.entities.GearPreset.list('name', 50).then(setPresets);
  }, []);

  const handleSavePreset = async () => {
    if (!presetName.trim()) { showToast('Enter a preset name', 'red'); return; }
    const data = {
      name: presetName.trim(),
      gear: localSetup.gear || '',
      camera_orientation: localSetup.camera_orientation || '',
      frame_rate: localSetup.frame_rate || '',
      resolution: localSetup.resolution || '',
      codec: localSetup.codec || '',
      color_profile: localSetup.color_profile || '',
      photo_format: localSetup.photo_format || '',
      photo_aspect: localSetup.photo_aspect || '',
      photo_raw: !!localSetup.photo_raw,
      photo_dual_camera: !!localSetup.photo_dual_camera,
      photo_flash: !!localSetup.photo_flash,
      notes: localSetup.notes || '',
    };
    const created = await base44.entities.GearPreset.create(data);
    setPresets(p => [...p, created]);
    setPresetName('');
    setShowPresetSave(false);
    showToast(`"${data.name}" preset saved`, 'green');
  };

  const handleLoadPreset = (preset) => {
    const { id, created_date, updated_date, created_by, name, ...setupFields } = preset;
    setLocalSetup(s => ({ ...s, ...setupFields }));
    showToast(`"${preset.name}" loaded`, 'blue');
  };

  const handleDeletePreset = async (preset) => {
    if (!confirm(`Delete preset "${preset.name}"?`)) return;
    await base44.entities.GearPreset.delete(preset.id);
    setPresets(p => p.filter(x => x.id !== preset.id));
    showToast(`"${preset.name}" deleted`, 'red');
  };

  const [openSheet, setOpenSheet] = useState(null); // key of which sheet is open

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
            <button type="button" onClick={() => setOpenSheet('orientation')} style={{ ...SS, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: localSetup.camera_orientation ? '#fff' : '#555' }}>{localSetup.camera_orientation || '— select —'}</span>
              <span style={{ color: '#555', fontSize: 10 }}>▼</span>
            </button>
            <BottomSheet open={openSheet === 'orientation'} onClose={() => setOpenSheet(null)} title="Orientation"
              options={[{ value: '', label: '— none —' }, ...ORIENTATIONS.map(o => ({ value: o, label: o }))]}
              value={localSetup.camera_orientation || ''} onChange={v => { set('camera_orientation', v); setOpenSheet(null); }} />
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
            {[
              { key: 'frame_rate', label: 'Frame Rate', sheet: 'frame_rate', opts: FRAME_RATES.map(f => ({ value: f, label: f + ' fps' })) },
              { key: 'resolution', label: 'Resolution', sheet: 'resolution', opts: RESOLUTIONS.map(r => ({ value: r, label: r })) },
              { key: 'codec', label: 'Codec', sheet: 'codec', opts: CODECS.map(c => ({ value: c, label: c })) },
              { key: 'color_profile', label: 'Color Profile', sheet: 'color_profile', opts: COLOR_PROFILES.map(c => ({ value: c, label: c })) },
            ].map(({ key, label, sheet, opts }) => (
              <div key={key}>
                <label style={LL}>{label}</label>
                <button type="button" onClick={() => setOpenSheet(sheet)} style={{ ...SS, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: localSetup[key] ? '#fff' : '#555' }}>{localSetup[key] || '— select —'}</span>
                  <span style={{ color: '#555', fontSize: 10 }}>▼</span>
                </button>
                <BottomSheet open={openSheet === sheet} onClose={() => setOpenSheet(null)} title={label}
                  options={[{ value: '', label: '— none —' }, ...opts]}
                  value={localSetup[key] || ''} onChange={v => { set(key, v); setOpenSheet(null); }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Section */}
      {hasPhoto && (
        <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
          <SectionLabel icon="📷" title="Photo Settings" color="#A78BFA" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'photo_format', label: 'File Format', sheet: 'photo_format', opts: PHOTO_FORMATS.map(f => ({ value: f, label: f })) },
              { key: 'photo_aspect', label: 'Aspect Ratio', sheet: 'photo_aspect', opts: PHOTO_ASPECTS.map(a => ({ value: a, label: a })) },
            ].map(({ key, label, sheet, opts }) => (
              <div key={key}>
                <label style={LL}>{label}</label>
                <button type="button" onClick={() => setOpenSheet(sheet)} style={{ ...SS, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: localSetup[key] ? '#fff' : '#555' }}>{localSetup[key] || '— select —'}</span>
                  <span style={{ color: '#555', fontSize: 10 }}>▼</span>
                </button>
                <BottomSheet open={openSheet === sheet} onClose={() => setOpenSheet(null)} title={label}
                  options={[{ value: '', label: '— none —' }, ...opts]}
                  value={localSetup[key] || ''} onChange={v => { set(key, v); setOpenSheet(null); }} />
              </div>
            ))}
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

      {/* Presets */}
      <div style={{ borderTop: '1px solid #222', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel icon="⚡" title="Gear Presets" color="#F59E0B" />
          <button
            onClick={() => setShowPresetSave(s => !s)}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontFamily: MONO }}
          >
            {showPresetSave ? 'Cancel' : '+ Save Current as Preset'}
          </button>
        </div>

        {showPresetSave && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <input
              style={{ ...SS, flex: 1 }}
              placeholder="e.g. Wedding Video, Corporate Event, Social Media..."
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
              autoFocus
            />
            <button onClick={handleSavePreset} style={{ padding: '9px 16px', background: '#F59E0B', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Save Preset</button>
          </div>
        )}

        {presets.length === 0 ? (
          <div style={{ color: '#555', fontSize: 12, fontFamily: MONO, padding: '6px 0' }}>No presets saved yet. Fill out the setup above and save it as a preset.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(preset => (
              <div key={preset.id} style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => handleLoadPreset(preset)}
                  style={{ padding: '7px 14px', background: 'none', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
                >
                  ⚡ {preset.name}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset)}
                  style={{ padding: '7px 10px', background: 'none', border: 'none', borderLeft: '1px solid #333', color: '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

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