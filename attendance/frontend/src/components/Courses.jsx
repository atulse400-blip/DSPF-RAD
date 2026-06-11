import React, { useEffect, useState, useCallback } from 'react';
import { coursesApi } from '../services/api';

const EMPTY = { id:'', name:'', description:'', instructor:'', schedule:'', room:'' };

export default function Courses() {
  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [confirm,  setConfirm]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    coursesApi.list().then(r => setCourses(r.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = courses.filter(c =>
    `${c.name} ${c.id} ${c.instructor} ${c.room}`.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(c)  { setForm({ ...c }); setError(''); setModal(c); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.id || !form.name) { setError('ID and Name are required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await coursesApi.create(form);
      } else {
        await coursesApi.update(modal.id, form);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await coursesApi.delete(id);
      setConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Courses</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Course</button>
      </div>

      <input className="search-input" placeholder="Search courses..."
             value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Instructor</th>
                <th>Schedule</th><th>Room</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} className="empty">No courses found</td></tr>
                : filtered.map(c => (
                  <tr key={c.id}>
                    <td><code>{c.id}</code></td>
                    <td>
                      <div className="cell-primary">{c.name}</div>
                      <div className="cell-sub">{c.description}</div>
                    </td>
                    <td>{c.instructor}</td>
                    <td>{c.schedule}</td>
                    <td>{c.room}</td>
                    <td><span className={`badge ${c.status==='A'?'badge-green':'badge-gray'}`}>
                      {c.status === 'A' ? 'Active' : 'Inactive'}
                    </span></td>
                    <td className="actions">
                      <button className="btn-sm btn-edit" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn-sm btn-del"  onClick={() => setConfirm(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Add Course' : 'Edit Course'}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <label>Course ID* (max 10 chars)
                  <input value={form.id}
                         onChange={e => setForm({...form, id: e.target.value.toUpperCase().slice(0,10)})}
                         disabled={modal !== 'create'} placeholder="e.g. MATH101" required />
                </label>
                <label>Course Name*
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </label>
                <label className="full-width">Description
                  <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </label>
                <label>Instructor
                  <input value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})} />
                </label>
                <label>Schedule
                  <input value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}
                         placeholder="e.g. MWF 09:00" />
                </label>
                <label>Room
                  <input value={form.room} onChange={e => setForm({...form, room: e.target.value.slice(0,10)})}
                         placeholder="e.g. Room101" />
                </label>
                {modal !== 'create' && (
                  <label>Status
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="A">Active</option>
                      <option value="I">Inactive</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Delete course <strong>{confirm.name}</strong> ({confirm.id})?</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
