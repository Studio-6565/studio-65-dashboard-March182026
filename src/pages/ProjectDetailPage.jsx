import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ProjectDetailModal from '@/components/studio/ProjectDetailModal';
import ProjectModal from '@/components/studio/ProjectModal';
import { showToast } from '@/components/studio/StudioToast';
import { addLog, nextProjectId } from '@/lib/studio';

export default function ProjectDetailPage({ projects, contacts, templates, onUpdate, onDelete, onContactsChange, onProjectsChange }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const project = projects.find(p => p.id === id);

  if (projects.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
        <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>🎬</div>
        <div style={{ marginBottom: 12 }}>Project not found.</div>
        <button onClick={() => navigate('/projects')} style={{ padding: '10px 20px', background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 }}>← Back to Projects</button>
      </div>
    );
  }

  const handleUpdate = (updated) => onUpdate(updated);

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    onDelete(project.id);
    navigate('/projects');
    showToast('Project deleted', 'red');
    await base44.entities.Project.delete(project.id);
  };

  const handleEditSave = async (form) => {
    const updated = { ...project, ...form, activity: addLog(project, 'Project details updated') };
    onUpdate(updated);
    setEditModalOpen(false);
    showToast('Project updated', 'blue');
    await base44.entities.Project.update(project.id, updated);
  };

  const handleDuplicate = async () => {
    const newId = nextProjectId(projects);
    const copy = {
      ...project, id: undefined, project_id: newId,
      name: project.name + ' (Copy)', paid: false,
      crew: (project.crew || []).map(c => ({ ...c, paid: false })),
      rentals: (project.rentals || []).map(r => ({ ...r, paid: false })),
      deliverables: (project.deliverables || []).map(d => ({ ...d, done: false })),
      hours: [],
      activity: [{ msg: 'Duplicated from ' + project.name, ts: new Date().toISOString() }],
    };
    navigate('/projects');
    showToast(copy.name + ' created!');
    const created = await base44.entities.Project.create(copy);
    onProjectsChange(prev => [created, ...prev]);
  };

  const handleSaveAsTemplate = async () => {
    const name = prompt('Template name:', project.name);
    if (!name) return;
    await base44.entities.Template.create({
      name,
      crew: (project.crew || []).map(c => ({ name: c.name, role: c.role, cost: c.cost, phone: c.phone })),
      deliverables: (project.deliverables || []).map(d => ({ name: d.name, due: '' })),
    });
    showToast('Template saved!', 'blue');
  };

  return (
    <div style={{ animation: 'fadeTab 0.18s ease' }}>
      <ProjectDetailModal
        open={true}
        onClose={() => navigate('/projects')}
        project={project}
        contacts={contacts}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onEdit={() => setEditModalOpen(true)}
        onDuplicate={handleDuplicate}
        onSaveAsTemplate={handleSaveAsTemplate}
        onContactsChange={onContactsChange}
        inline={true}
      />
      <ProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingProject={project}
        templates={templates}
        projects={projects}
        onSave={handleEditSave}
      />
      <style>{`@keyframes fadeTab { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}