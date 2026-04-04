import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { bulkAssignStudents } from '../api';

const AssignRooms = () => {
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    faculty: '',
    department: '',
    dormitory: '',
    block: '',
    roomNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await bulkAssignStudents([formData]); // Currently single student assignment
      if (response.status === 201) {
        setMessage('Student assigned successfully!');
        // Reset form
        setFormData({
          name: '',
          idNumber: '',
          faculty: '',
          department: '',
          dormitory: '',
          block: '',
          roomNumber: '',
        });
      }
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
      <header>
        <h1>Assign Rooms</h1>
        <p>Register new students and allocate dormitory spaces</p>
      </header>
      <div className="glass-card">
        <h2 style={{ marginBottom: '20px' }}>Student Registration Form</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" type="text" placeholder="e.g. John Doe" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Student ID</label>
              <input name="idNumber" type="text" placeholder="e.g. STU12345" value={formData.idNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Faculty</label>
              <select name="faculty" value={formData.faculty} onChange={handleChange} required>
                <option value="">Select Faculty</option>
                <option value="Engineering">Engineering</option>
                <option value="Medicine">Medicine</option>
                <option value="Social Sciences">Social Sciences</option>
              </select>
            </div>
            <div className="form-group">
              <label>Department</label>
              <input name="department" type="text" placeholder="e.g. Computer Science" value={formData.department} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Dormitory</label>
              <select name="dormitory" value={formData.dormitory} onChange={handleChange} required>
                <option value="">Select Hostal</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Central Dorm">Central Dorm</option>
              </select>
            </div>
            <div className="form-group">
              <label>Block</label>
              <input name="block" type="text" placeholder="e.g. A2" value={formData.block} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Room Number</label>
              <input name="roomNumber" type="text" placeholder="e.g. 302" value={formData.roomNumber} onChange={handleChange} required />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Register & Assign'}
            </button>
            {message && <span style={{ color: message.startsWith('Error') ? '#f87171' : 'var(--accent)', fontWeight: '500' }}>{message}</span>}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AssignRooms;
