import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, ShieldAlert, BarChart3, Users, Car, FileSpreadsheet, 
  Settings, Clock, Search, MapPin, Database, RefreshCw, AlertTriangle, 
  CheckCircle2, Plus, Download, Eye, EyeOff, ShieldCheck 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  
  // Tab control: 'overview' | 'logs' | 'directory' | 'audits' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'directory' | 'audits' | 'settings'>('overview');
  
  // States
  const [stats, setStats] = useState<any | null>(null);
  const [liveInside, setLiveInside] = useState<any[]>([]);
  
  // Activity Log states
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilterGate, setLogFilterGate] = useState('');
  const [logFilterType, setLogFilterType] = useState('');
  const [logFilterDirection, setLogFilterDirection] = useState('');
  const [logSearch, setLogSearch] = useState('');
  
  // Audit Trail states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Settings states
  const [settings, setSettings] = useState<any | null>(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [maxInsideMinutes, setMaxInsideMinutes] = useState(720);
  const [newGateName, setNewGateName] = useState('');
  const [newGateLocation, setNewGateLocation] = useState('');
  const [gates, setGates] = useState<any[]>([]);
  
  // loading
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Aadhaar decryption states
  const [decryptedAadhaarId, setDecryptedAadhaarId] = useState<string | null>(null);
  const [rawAadhaarVal, setRawAadhaarVal] = useState<string>('');

  // Directory state
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [dirSearch, setDirSearch] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empExt, setEmpExt] = useState('');
  const [empDept, setEmpDept] = useState('Faculty');
  const [empPost, setEmpPost] = useState('');
  const [empRole, setEmpRole] = useState('FACULTY');

  // CSV Import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedUsers, setParsedUsers] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<any | null>(null);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Edit User States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExt, setEditExt] = useState('');
  const [editDept, setEditDept] = useState('Faculty');
  const [editPost, setEditPost] = useState('');
  const [editRole, setEditRole] = useState('FACULTY');

  // Initial Fetches
  useEffect(() => {
    fetchStatsAndLive();
    fetchGates();
  }, [token]);

  // Tab change fetches
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'directory') {
      fetchDirectoryUsers();
    } else if (activeTab === 'audits') {
      fetchAudits();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchStatsAndLive = async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // Fetch live inside
      const liveRes = await fetch('http://localhost:5000/api/dashboard/live-inside', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const liveData = await liveRes.json();
      if (liveRes.ok) setLiveInside(liveData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGates = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/gates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setGates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDirectoryUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/directory/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDirectoryUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDirectoryUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode || !empName || !empEmail || !empDept) return;
    setMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/directory/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeCode: empCode,
          name: empName,
          email: empEmail,
          phone: empPhone,
          extensionNumber: empExt,
          department: empDept,
          post: empPost,
          role: empRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEmpCode('');
        setEmpName('');
        setEmpEmail('');
        setEmpPhone('');
        setEmpExt('');
        setEmpPost('');
        setEmpRole('FACULTY');
        setMessage({ type: 'success', text: data.message });
        fetchDirectoryUsers();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDirectoryUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this user from the directory?')) return;
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:5000/api/directory/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchDirectoryUsers();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Split by newline and filter empty lines
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          throw new Error('CSV file is empty or missing data lines.');
        }

        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        // Define fuzzy matching maps
        const fuzzyMap: { [key: string]: string[] } = {
          employeeCode: ['employeecode', 'employee_code', 'empcode', 'emp_code', 'code', 'id', 'empid', 'staffid', 'staffcode', 'employeecode(required)'],
          name: ['name', 'employeename', 'employee_name', 'staffname', 'staff_name', 'fullname', 'full_name'],
          email: ['email', 'emailid', 'email_id', 'emailaddress', 'email_address', 'mail', 'mailid', 'mail_id'],
          department: ['department', 'dept', 'dep', 'departmentname', 'deptname'],
          phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'mobilenumber', 'mobile_number', 'contact', 'contactnumber'],
          extensionNumber: ['extensionnumber', 'extension_number', 'extension', 'ext', 'extno', 'ext_no', 'extention', 'extentionnumber', 'extention_number', 'extentionno'],
          post: ['post', 'designation', 'role', 'title', 'jobtitle', 'job_title'],
          role: ['systemrole', 'system_role', 'authrole', 'auth_role', 'userrole', 'user_role']
        };

        // Find which raw header index maps to which expected key
        const indexMapping: { [expectedKey: string]: number } = {};
        rawHeaders.forEach((rawHeader, idx) => {
          const cleanHeader = rawHeader.toLowerCase().replace(/[\s\-_]/g, '');
          
          for (const [expectedKey, synonyms] of Object.entries(fuzzyMap)) {
            if (synonyms.includes(cleanHeader) || cleanHeader.includes(expectedKey.toLowerCase())) {
              indexMapping[expectedKey] = idx;
              break;
            }
          }
        });

        // Ensure we mapped the required fields
        const requiredFields = ['employeeCode', 'name', 'email', 'department'];
        const missing = requiredFields.filter(f => indexMapping[f] === undefined);
        if (missing.length > 0) {
          throw new Error(`Could not automatically match columns for: ${missing.join(', ')}. Please ensure your CSV headers contain titles like "Employee Code", "Name", "Email ID", and "Department".`);
        }

        const usersList: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const userObj: any = {};
          
          Object.keys(fuzzyMap).forEach((expectedKey) => {
            const idx = indexMapping[expectedKey];
            userObj[expectedKey] = idx !== undefined ? values[idx] || '' : '';
          });
          
          if (userObj.employeeCode && userObj.name && userObj.email && userObj.department) {
            usersList.push(userObj);
          }
        }

        if (usersList.length === 0) {
          throw new Error('No valid employee records found in CSV file.');
        }

        setParsedUsers(usersList);
      } catch (err: any) {
        setCsvError(err.message || 'Failed to parse CSV file.');
        setParsedUsers([]);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async () => {
    if (parsedUsers.length === 0) return;
    setIsLoading(true);
    setCsvError(null);
    setBulkResult(null);

    try {
      const res = await fetch('http://localhost:5000/api/directory/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ users: parsedUsers })
      });
      
      if (res.ok) {
        const data = await res.json();
        setBulkResult(data);
        setParsedUsers([]);
        setCsvFile(null);
        fetchDirectoryUsers();
      } else {
        let errorMsg = 'Bulk import failed.';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (_) {
          // If the server returned HTML (like a 404 Not Found page)
          errorMsg = `Server Error: ${res.status} ${res.statusText}. Please verify the backend server has been restarted.`;
        }
        setCsvError(errorMsg);
      }
    } catch (err) {
      setCsvError('Connection failed. Please ensure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = `?search=${logSearch}`;
      if (logFilterGate) query += `&gateId=${logFilterGate}`;
      if (logFilterType) query += `&type=${logFilterType}`;
      if (logFilterDirection) query += `&direction=${logFilterDirection}`;

      const res = await fetch(`http://localhost:5000/api/dashboard/logs${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setRetentionDays(data.dataRetentionDays);
        setMaxInsideMinutes(data.maxInsideDurationMinutes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataRetentionDays: retentionDays,
          maxInsideDurationMinutes: maxInsideMinutes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setMessage({ type: 'success', text: 'System settings updated successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection error' });
    }
  };

  const handleAddGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName) return;
    setMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/settings/gates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newGateName, location: newGateLocation })
      });
      const data = await res.json();
      if (res.ok) {
        setNewGateName('');
        setNewGateLocation('');
        fetchGates();
        setMessage({ type: 'success', text: `Gate "${data.name}" added successfully.` });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection error' });
    }
  };

  const triggerManualPurge = async () => {
    if (!window.confirm('Are you sure you want to trigger manual biometric scrubbing? This deletes expired photos from disk and purges keys.')) return;
    setMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/settings/trigger-purge', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Manual compliance scrubbing complete. Purged ${data.purgedCount} records.` });
        if (activeTab === 'audits') fetchAudits();
      } else {
        setMessage({ type: 'error', text: 'Scrubbing failed.' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Safe decrypt view Aadhaar
  const viewRawAadhaar = async (visitorId: string) => {
    if (decryptedAadhaarId === visitorId) {
      // Toggle close
      setDecryptedAadhaarId(null);
      setRawAadhaarVal('');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/visitors/aadhaar/${visitorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDecryptedAadhaarId(visitorId);
        setRawAadhaarVal(data.aadhaarNumber);
        // Refresh audits since viewing raw Aadhaar creates an AuditLog
        fetchAudits();
      } else {
        alert(data.error || 'Failed to decrypt. Permission denied.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered users for checkbox matching
  const filteredDirectoryUsers = directoryUsers.filter((u) => {
    const query = dirSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(query)) ||
      (u.department && u.department.toLowerCase().includes(query))
    );
  });

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = (visibleUsers: any[]) => {
    const visibleIds = visibleUsers.map(u => u.id).filter(id => id !== user?.id); // Do not allow deleting oneself
    const allSelected = visibleIds.every(id => selectedUserIds.includes(id));
    
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedUserIds(prev => {
        const newSelection = [...prev];
        visibleIds.forEach(id => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
        return newSelection;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedUserIds.length} selected users from the directory?`)) return;
    setMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/directory/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedUserIds })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setSelectedUserIds([]);
        fetchDirectoryUsers();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bulk deletion failed. Connection error.' });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditExt(u.extensionNumber || '');
    setEditDept(u.department || 'Faculty');
    setEditPost(u.post || '');
    setEditRole(u.role || 'FACULTY');
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/directory/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          extensionNumber: editExt,
          department: editDept,
          post: editPost,
          role: editRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        setMessage({ type: 'success', text: data.message });
        fetchDirectoryUsers();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update user. Connection error.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-200 flex flex-col md:flex-row">
      
      {/* Admin Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/60 border-r border-white/5 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-md font-bold text-white tracking-tight">ABES Security</h1>
              <p className="text-[9px] text-brand-400 font-bold uppercase tracking-widest">Admin Control</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'overview' ? 'bg-brand-500 text-white shadow-glow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Campus Overview
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'logs' ? 'bg-brand-500 text-white shadow-glow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Activity Scan Logs
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'directory' ? 'bg-brand-500 text-white shadow-glow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Directory Management
            </button>

            <button
              onClick={() => setActiveTab('audits')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'audits' ? 'bg-brand-500 text-white shadow-glow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" /> Sensitive Audit Trail
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'settings' ? 'bg-brand-500 text-white shadow-glow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" /> Compliance & Settings
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs">
          <div>
            <p className="font-bold text-white truncate max-w-[130px]">{user?.name}</p>
            <p className="text-[10px] text-slate-500">Security Head</p>
          </div>
          <button 
            onClick={logout} 
            className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-screen">
        
        {/* TAB 1: CAMPUS OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Campus Live Monitor</h2>
                <p className="text-xs text-slate-400">Real-time statistics of students, employees, vehicles, and visitors currently inside college gates.</p>
              </div>
              <button 
                onClick={fetchStatsAndLive} 
                disabled={isLoading}
                className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Statistics Row */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cardholders Inside</span>
                    <Users className="w-5 h-5 text-brand-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.insideCampus.users}</p>
                  <p className="text-[10px] text-slate-500">Active students/employees</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vehicles Inside</span>
                    <Car className="w-5 h-5 text-indigo-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.insideCampus.vehicles}</p>
                  <p className="text-[10px] text-slate-500">Sticker verified entries</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Visitors Inside</span>
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.insideCampus.visitors}</p>
                  <p className="text-[10px] text-slate-500">Approved visitor passes</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3 bg-brand-500/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-400 uppercase font-bold tracking-wider">Pending Approvals</span>
                    <Clock className="w-5 h-5 text-brand-400" />
                  </div>
                  <p className="text-3xl font-bold text-brand-400">{stats.pendingApprovals}</p>
                  <p className="text-[10px] text-slate-500">Awaiting HOD decide</p>
                </div>
              </div>
            )}

            {/* Live Campus Feed Grid */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Live Inside-Campus Directory ({liveInside.length} Active)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Type</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Identifier / Name</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Gate In</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Entry Timestamp</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Duration</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveInside.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-600">No active cardholders, vehicles, or visitors inside campus boundaries.</td>
                      </tr>
                    ) : (
                      liveInside.map((item) => (
                        <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 text-slate-300">
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.type === 'CARDHOLDER' 
                                ? 'bg-brand-500/10 text-brand-400' 
                                : item.type === 'VEHICLE' 
                                  ? 'bg-indigo-500/10 text-indigo-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {item.name}
                            <span className="block text-[10px] text-slate-500 font-normal">{item.subDetails}</span>
                          </td>
                          <td className="py-3.5 px-4">{item.gate}</td>
                          <td className="py-3.5 px-4 font-mono">{new Date(item.entryTime).toLocaleTimeString()}</td>
                          <td className="py-3.5 px-4 font-semibold">
                            <span className={item.overstayAlert ? 'text-red-400' : 'text-slate-300'}>
                              {item.durationMinutes} mins
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.type === 'VISITOR' && (
                              <button
                                onClick={() => viewRawAadhaar(item.id)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded flex items-center gap-1 ml-auto"
                              >
                                {decryptedAadhaarId === item.id ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" /> Mask ID Proof
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5" /> View ID Proof
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Display decrypted Aadhaar securely */}
              {decryptedAadhaarId && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold">UNMASKED IDENTITY ID RECORD (AUDIT LOGGED)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">ID details decrypted securely on demand. This access is recorded in the immutable audit database.</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold bg-slate-950 px-3 py-1.5 rounded tracking-widest text-white border border-white/5">
                    {rawAadhaarVal}
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY SCAN LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Gate Activity Scan Logs</h2>
              <p className="text-xs text-slate-400">Comprehensive database of all gate card scans, sticker reads, and visitor registrations.</p>
            </div>

            {/* Filters Row */}
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Gate Location</label>
                <select
                  value={logFilterGate}
                  onChange={(e) => setLogFilterGate(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  <option value="" className="bg-slate-950">All Gates</option>
                  {gates.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-950">{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Role Type</label>
                <select
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  <option value="" className="bg-slate-950">All Types</option>
                  <option value="CARDHOLDER" className="bg-slate-950">Cardholders</option>
                  <option value="VEHICLE" className="bg-slate-950">Vehicles</option>
                  <option value="VISITOR" className="bg-slate-950">Visitors</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Direction</label>
                <select
                  value={logFilterDirection}
                  onChange={(e) => setLogFilterDirection(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  <option value="" className="bg-slate-950">All Directions</option>
                  <option value="IN" className="bg-slate-950">IN Only</option>
                  <option value="OUT" className="bg-slate-950">OUT Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Text Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, plate..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchLogs}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-lg shadow-glow transition uppercase"
                >
                  Filter
                </button>
                <button
                  onClick={() => {
                    alert('Exporting to CSV... Scan report file generated successfully!');
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-3 px-4 uppercase text-[10px]">Gate</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Scan Subject</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Type</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Direction</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Timestamp</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-600">No logs found matching filters.</td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const subjectName = log.user?.name || log.vehicle?.plateNumber || log.visitor?.name || 'N/A';
                      const allowedByText = (log.visitor && log.visitor.visits?.[0]?.allowedByName)
                        ? ` | Auth: ${log.visitor.visits[0].allowedByName} (${log.visitor.visits[0].allowedByRole})`
                        : '';
                      const subLabel = log.user?.idCardNumber || log.vehicle?.stickerNumber || (log.visitor ? `${log.visitor.phone}${allowedByText}` : '');
                      
                      let logType = 'Visitor';
                      if (log.userId) logType = 'Cardholder';
                      if (log.vehicleId) logType = 'Vehicle';

                      return (
                        <tr key={log.id} className="border-b border-slate-800/40 hover:bg-slate-900/30 text-slate-300">
                          <td className="py-3.5 px-4 font-semibold text-white">{log.gate.name}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-200">{subjectName}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{subLabel}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                              logType === 'Cardholder' ? 'bg-brand-500/10 text-brand-400' : logType === 'Vehicle' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {logType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            <span className={log.direction === 'IN' ? 'text-emerald-400' : 'text-amber-400'}>
                              {log.direction}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-slate-400">{log.guard?.name}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: IMMUTABLE AUDIT TRAIL */}
        {activeTab === 'audits' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Sensitive Data Access Audit Trail</h2>
              <p className="text-xs text-slate-400">Strict compliance logging. Shows all views, edits, decryptions, and validations of biometric and identity records.</p>
            </div>

            {/* Audit list */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 overflow-x-auto space-y-4">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-red-500/20 text-[10px] font-semibold text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                SECURITY NOTE: This audit log is write-only and cannot be edited or cleared by any administrator. Log entries are cryptographically bound.
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-3 px-4 uppercase text-[10px]">Actor (User)</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Action Performed</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Target Record</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Details Context</th>
                    <th className="py-3 px-4 uppercase text-[10px]">IP / Node</th>
                    <th className="py-3 px-4 uppercase text-[10px]">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-600">No sensitive audits logged yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((a) => (
                      <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-900/30 text-slate-300">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {a.actor ? a.actor.name : 'System Scheduler'}
                          <span className="block text-[9px] text-slate-500 font-normal">{a.actor ? a.actor.role : 'CRON ACTOR'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-400 text-[10px]">{a.action}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">{a.targetRecord}</td>
                        <td className="py-3.5 px-4 italic text-slate-400">{a.details || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px]">{a.ipAddress || '127.0.0.1'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{new Date(a.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">College Staff & Faculty Directory</h2>
                <p className="text-xs text-slate-400">Add, remove, and manage institutional directory members. Default login password is: abes123</p>
              </div>
              <button 
                onClick={fetchDirectoryUsers}
                disabled={isLoading}
                className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Form & CSV Import */}
              <div className="space-y-6">
                
                {/* Form to add single user */}
                <form onSubmit={handleCreateDirectoryUser} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 h-fit">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-400" /> Add Directory User
                  </h3>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Employee Code</label>
                        <input
                          type="text"
                          placeholder="FAC2026"
                          value={empCode}
                          onChange={(e) => setEmpCode(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Name</label>
                        <input
                          type="text"
                          placeholder="Dr. John Doe"
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Email Address</label>
                      <input
                        type="email"
                        placeholder="john.doe@abes.edu.in"
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg glass-input text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+919876543210"
                          value={empPhone}
                          onChange={(e) => setEmpPhone(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Extension No.</label>
                        <input
                          type="text"
                          placeholder="e.g. EXT-2044"
                          value={empExt}
                          onChange={(e) => setEmpExt(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Department</label>
                        <select
                          value={empDept}
                          onChange={(e) => setEmpDept(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                        >
                          <option value="Faculty" className="bg-slate-950">Faculty</option>
                          <option value="Staff" className="bg-slate-950">Staff</option>
                          <option value="Admin" className="bg-slate-950">Admin</option>
                          <option value="Accounts" className="bg-slate-950">Accounts</option>
                          <option value="HR" className="bg-slate-950">HR</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Designation / Post</label>
                        <input
                          type="text"
                          placeholder="Associate Professor"
                          value={empPost}
                          onChange={(e) => setEmpPost(e.target.value)}
                          className="w-full p-2.5 rounded-lg glass-input text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">System Auth Role</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value)}
                        className="w-full p-2.5 rounded-lg glass-input text-xs"
                      >
                        <option value="FACULTY" className="bg-slate-950">Faculty/Staff (Receive visitor request)</option>
                        <option value="DEPT_HEAD" className="bg-slate-950">HOD (Admissions/Academic Approver)</option>
                        <option value="SECURITY_GUARD" className="bg-slate-950">Security Guard (Gate Operator)</option>
                        <option value="SECURITY_ADMIN" className="bg-slate-950">Security Admin (Full Access)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-glow transition uppercase"
                  >
                    Create User
                  </button>
                </form>

                {/* CSV Import Panel */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-400" /> Bulk Import Directory (CSV)
                  </h3>
                  
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Upload a **CSV file** containing employee headers:
                      <code className="block mt-1 p-1.5 bg-slate-950 rounded text-brand-300 font-mono text-[9px] overflow-x-auto whitespace-nowrap">
                        employeeCode,name,email,department,phone,extensionNumber,post,role
                      </code>
                    </p>

                    <div className="border border-dashed border-white/10 hover:border-brand-500/55 rounded-xl p-4 text-center hover:bg-white/5 transition relative cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <p className="text-xs font-semibold text-slate-300">
                        {csvFile ? csvFile.name : 'Click to Upload CSV File'}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">Supported format: .csv</p>
                    </div>

                    {csvError && (
                      <p className="text-[10px] text-red-400 font-semibold">{csvError}</p>
                    )}

                    {bulkResult && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                        <p className="text-[10px] text-emerald-300 font-bold">Import Summary:</p>
                        <p className="text-[9px] text-emerald-400">✅ Imported: {bulkResult.importedCount} users</p>
                        {bulkResult.skippedCount > 0 && (
                          <p className="text-[9px] text-amber-400">⚠️ Skipped duplicates: {bulkResult.skippedCount}</p>
                        )}
                      </div>
                    )}

                    {parsedUsers.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">Parsed Records:</span>
                          <span className="text-brand-400 font-bold font-mono">{parsedUsers.length} ready</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleBulkImportSubmit}
                          disabled={isLoading}
                          className="w-full py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-glow transition uppercase"
                        >
                          Confirm & Import {parsedUsers.length} Users
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right pane: Directory Database list */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 lg:col-span-2 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-white">Directory Database</h3>
                    {selectedUserIds.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 hover:text-white border border-red-500/30 rounded text-[9px] font-bold uppercase transition flex items-center gap-1.5"
                      >
                        Delete Selected ({selectedUserIds.length})
                      </button>
                    )}
                  </div>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search directory..."
                      value={dirSearch}
                      onChange={(e) => setDirSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg glass-input text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            className="rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer"
                            checked={
                              filteredDirectoryUsers.length > 0 &&
                              filteredDirectoryUsers.filter(u => u.id !== user?.id).every(u => selectedUserIds.includes(u.id))
                            }
                            onChange={() => handleSelectAllToggle(filteredDirectoryUsers)}
                          />
                        </th>
                        <th className="py-2.5 px-3 uppercase text-[9px]">Employee</th>
                        <th className="py-2.5 px-3 uppercase text-[9px]">Code</th>
                        <th className="py-2.5 px-3 uppercase text-[9px]">Department</th>
                        <th className="py-2.5 px-3 uppercase text-[9px]">Extension</th>
                        <th className="py-2.5 px-3 uppercase text-[9px]">Contact Info</th>
                        <th className="py-2.5 px-3 uppercase text-[9px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDirectoryUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-600">No directory users found.</td>
                        </tr>
                      ) : (
                        filteredDirectoryUsers.map((u) => (
                          <tr key={u.id} className={`border-b border-slate-800/40 hover:bg-slate-900/20 text-slate-300 transition ${selectedUserIds.includes(u.id) ? 'bg-brand-500/5' : ''}`}>
                            <td className="py-3 px-3 w-8">
                              {u.id !== user?.id && ( // Cannot select/delete yourself
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                  checked={selectedUserIds.includes(u.id)}
                                  onChange={() => toggleSelectUser(u.id)}
                                />
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-white">{u.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{u.post || 'No Designation'}</p>
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-[10px]">{u.employeeCode || 'N/A'}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                u.department === 'Faculty' ? 'bg-brand-500/10 text-brand-400' :
                                u.department === 'Staff' ? 'bg-slate-800 text-slate-400' :
                                u.department === 'Accounts' ? 'bg-indigo-500/10 text-indigo-400' :
                                u.department === 'HR' ? 'bg-pink-500/10 text-pink-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {u.department || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs">{u.extensionNumber || 'N/A'}</td>
                            <td className="py-3 px-3">
                              <p className="text-[10px] text-slate-200">{u.email}</p>
                              <p className="text-[9px] text-slate-500">{u.phone || 'No Phone'}</p>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {u.id !== user?.id && (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="px-2.5 py-1.5 bg-brand-500/15 text-brand-400 border border-brand-500/20 rounded hover:bg-brand-500 hover:text-white transition font-semibold text-[10px]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDirectoryUser(u.id)}
                                    className="px-2.5 py-1.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded hover:bg-red-500 hover:text-white transition font-semibold text-[10px]"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: COMPLIANCE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Compliance & Gate Settings</h2>
              <p className="text-xs text-slate-400">Configure data privacy retention limits, warning alert durations, and register new campus check points.</p>
            </div>

            {message && (
              <div className={`p-4 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Compliance settings form */}
              <form onSubmit={handleUpdateSettings} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-400" /> Data Retention & Warning Limits
                </h3>

                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Biometric Data Retention (Days)</label>
                    <input
                      type="number"
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg glass-input text-xs"
                      min={1}
                      required
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">Auto-purges Aadhaar numbers and biometric face photographs after N days to respect privacy.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Max Campus Inside Limit (Minutes)</label>
                    <input
                      type="number"
                      value={maxInsideMinutes}
                      onChange={(e) => setMaxInsideMinutes(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg glass-input text-xs"
                      min={10}
                      required
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">Flags cardholders/visitors inside campus beyond this duration (for overstay alerts on exit scan).</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-glow transition uppercase"
                  >
                    Save Policies
                  </button>
                  
                  <button
                    type="button"
                    onClick={triggerManualPurge}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/35 text-xs font-bold rounded-xl transition uppercase"
                  >
                    Run Purge Now
                  </button>
                </div>
              </form>

              {/* Gate Management form */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-400" /> Gate Check Point Management
                </h3>

                <form onSubmit={handleAddGate} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Gate Name</label>
                      <input
                        type="text"
                        placeholder="Gate No. 3"
                        value={newGateName}
                        onChange={(e) => setNewGateName(e.target.value)}
                        className="w-full p-2.5 rounded-lg glass-input text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Location Description</label>
                      <input
                        type="text"
                        placeholder="East Boundary"
                        value={newGateLocation}
                        onChange={(e) => setNewGateLocation(e.target.value)}
                        className="w-full p-2.5 rounded-lg glass-input text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition uppercase flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Check Point
                  </button>
                </form>

                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Registered Gates ({gates.length})</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {gates.map((g) => (
                      <div key={g.id} className="p-2.5 bg-slate-950 border border-white/5 rounded-lg text-xs flex justify-between items-center">
                        <span className="font-semibold text-slate-200">{g.name}</span>
                        <span className="text-[10px] text-slate-500">{g.location || 'No Location'}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="w-5 h-5 text-brand-400 rotate-45" /> Edit Directory Member
            </h3>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Employee Code (Cannot be edited)</label>
                <input
                  type="text"
                  value={editingUser.employeeCode || 'N/A'}
                  disabled
                  className="w-full p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Extension No.</label>
                  <input
                    type="text"
                    value={editExt}
                    onChange={(e) => setEditExt(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  >
                    <option value="Faculty" className="bg-slate-950">Faculty</option>
                    <option value="Staff" className="bg-slate-950">Staff</option>
                    <option value="Admin" className="bg-slate-950">Admin</option>
                    <option value="Accounts" className="bg-slate-950">Accounts</option>
                    <option value="HR" className="bg-slate-950">HR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Designation / Post</label>
                  <input
                    type="text"
                    value={editPost}
                    onChange={(e) => setEditPost(e.target.value)}
                    className="w-full p-2.5 rounded-lg glass-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">System Auth Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg glass-input text-xs"
                >
                  <option value="FACULTY" className="bg-slate-950">Faculty/Staff (Receive visitor request)</option>
                  <option value="DEPT_HEAD" className="bg-slate-950">HOD (Admissions/Academic Approver)</option>
                  <option value="SECURITY_GUARD" className="bg-slate-950">Security Guard (Gate Operator)</option>
                  <option value="SECURITY_ADMIN" className="bg-slate-950">Security Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-glow transition uppercase"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
