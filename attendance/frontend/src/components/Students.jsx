import React, { useEffect, useState, useCallback } from 'react';
import { studentsApi } from '../services/api';

const EMPTY = { id:'', firstName:'', lastName:'', group:'', email:'', phone:'' };

export default function Students() {
  const [students, setStudents]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [modal,    setModal]      = useState(null); // null | 'create' | student obj
  const [form,     setForm]       = useState(EMPTY);
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState('');
  const [confirm,  setConfirm]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    studentsApi.list().then(r => setStudents(r.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s =>
    `${s.firstName} ${s.lastName} ${s.id} ${s.group}`.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(s)  { setForm({ ...s }); setError(''); setModal(s); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.id || !form.firstName || !form.lastName) {
      setError('ID, First Name, and Last Name are required'); return;
    }
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await studentsApi.create(form);
      } else {
        await studentsApi.update(modal.id, form);
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
      await studentsApi.delete(id);
      setConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Student</button>
      </div>

      <input className="search-input" placeholder="Search students..."
             value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Group</th>
                <th>Email</th><th>Phone</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} className="empty">No students found</td></tr>
                : filtered.map(s => (
                  <tr key={s.id}>
                    <td><code>{s.id}</code></td>
                    <td>{s.firstName} {s.lastName}</td>
                    <td><span className="badge badge-blue">{s.group}</span></td>
                    <td>{s.email}</td>
                    <td>{s.phone}</td>
                    <td><span className={`badge ${s.status==='A'?'badge-green':'badge-gray'}`}>
                      {s.status === 'A' ? 'Active' : 'Inactive'}
                    </span></td>
                    <td className="actions">
                      <button className="btn-sm btn-edit" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn-sm btn-del"  onClick={() => setConfirm(s)}>Delete</button>
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
            <h2>{modal === 'create' ? 'Add Student' : 'Edit Student'}</h2>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <label>Student ID*
                  <input value={form.id} onChange={e => setForm({...form, id: e.target.value.toUpperCase().slice(0,10)})}
                         disabled={modal !== 'create'} placeholder="e.g. STU011" required />
                </label>
                <label>First Name*
                  <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required />
                </label>
                <label>Last Name*
                  <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required />
                </label>
                <label>Group / Grade
                  <input value={form.group} onChange={e => setForm({...form, group: e.target.value.slice(0,10)})}
                         placeholder="e.g. Grade10A" />
                </label>
                <label>Email
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </label>
                <label>Phone
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
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
            <p>Delete <strong>{confirm.firstName} {confirm.lastName}</strong> ({confirm.id})?
               This will also remove all attendance records.</p>
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
