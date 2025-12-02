import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, Users, CheckCircle, XCircle, FileText,
    Download, Lock, UserCheck, LogIn, LogOut, UserPlus, Key, Trash2, Home, Settings, AlertCircle, RefreshCw
} from 'lucide-react';

const createMapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// GANTI DENGAN URL GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtC84GLHrnxq3Q3geyNBxQkIBHtZjA9WYh0N5-gJWDGFZF1qKic_skSmvhGs4Fycfy/exec';

const AttendanceSystem = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [attendances, setAttendances] = useState([]);
    const [employeeList, setEmployeeList] = useState([]);
    const [passwords, setPasswords] = useState({ admin: 'admin123', pkd: 'pkd123' });
    const [loading, setLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');

    const [view, setView] = useState('employee');
    const [serverPassword, setServerPassword] = useState('');
    const [isServerAuth, setIsServerAuth] = useState(false);
    const [serverType, setServerType] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [formData, setFormData] = useState({ 
        name: '', 
        izinPengawas: '',
        izinSubbagTurt: '',
        purpose: '', 
        customTime: '' 
    });
    const [location, setLocation] = useState(null);
    const [filterDate, setFilterDate] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [attendanceMode, setAttendanceMode] = useState('keluar');
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordUserToChange, setPasswordUserToChange] = useState('admin');
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [currentPhoto, setCurrentPhoto] = useState(null);

    // Load data dari Google Sheets
    const loadDataFromSheets = async () => {
        setLoading(true);
        setSyncStatus('Memuat data...');
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getData`);
            const data = await response.json();
            
            if (data.success) {
                setAttendances(data.attendances || []);
                setEmployeeList(data.employees || []);
                setPasswords(data.passwords || { admin: 'admin123', pkd: 'pkd123' });
                setSyncStatus('✅ Data berhasil dimuat');
            } else {
                setSyncStatus('⚠️ Gagal memuat data');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setSyncStatus('❌ Error koneksi ke Google Sheets');
        }
        setLoading(false);
        setTimeout(() => setSyncStatus(''), 3000);
    };

    // Save attendance ke Google Sheets
    const saveAttendanceToSheets = async (attendanceData) => {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addAttendance',
                    data: attendanceData
                })
            });
            return true;
        } catch (error) {
            console.error('Error saving attendance:', error);
            return false;
        }
    };

    // Save employees ke Google Sheets
    const saveEmployeesToSheets = async (employees) => {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateEmployees',
                    data: employees
                })
            });
            return true;
        } catch (error) {
            console.error('Error saving employees:', error);
            return false;
        }
    };

    // Save passwords ke Google Sheets
    const savePasswordsToSheets = async (passwords) => {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updatePasswords',
                    data: passwords
                })
            });
            return true;
        } catch (error) {
            console.error('Error saving passwords:', error);
            return false;
        }
    };

    // Clear all attendances
    const clearAllAttendances = async () => {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'clearAttendances'
                })
            });
            return true;
        } catch (error) {
            console.error('Error clearing attendances:', error);
            return false;
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        loadDataFromSheets();
        // Auto refresh setiap 15 detik
        const interval = setInterval(loadDataFromSheets, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, failed: false });
                },
                (error) => {
                    setLocation({ lat: -6.1030, lng: 106.8837, failed: true });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocation({ lat: -6.1030, lng: 106.8837, failed: true });
        }
    }, []);

    const handleServerLogin = () => {
        if (serverPassword === passwords.admin) {
            setIsServerAuth(true);
            setServerType('admin');
            setView('server');
            setActiveTab('dashboard');
        } else if (serverPassword === passwords.pkd) {
            setIsServerAuth(true);
            setServerType('pkd');
            setView('server');
            setActiveTab('riwayat'); // PKD langsung ke riwayat
        } else {
            alert('PASSWORD SALAH!');
        }
    };

    const handleServerLogout = () => {
        setIsServerAuth(false);
        setServerType('');
        setView('employee');
        setServerPassword('');
        setActiveTab('dashboard');
    };

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            alert('PASSWORD BARU HARUS MINIMAL 6 KARAKTER!');
            return;
        }
        
        // Tentukan user mana yang akan diubah passwordnya
        const userToChange = serverType === 'pkd' ? 'pkd' : 'admin';
        
        const updatedPasswords = { ...passwords, [userToChange]: newPassword };
        setPasswords(updatedPasswords);
        await savePasswordsToSheets(updatedPasswords);
        setNewPassword('');
        setShowPasswordChange(false);
        alert(`PASSWORD ${userToChange.toUpperCase()} BERHASIL DIUBAH!`);
        loadDataFromSheets();
    };

    const handleAddEmployee = async () => {
        if (!newEmployeeName.trim()) {
            alert('NAMA KARYAWAN HARUS DIISI!');
            return;
        }
        const upperName = newEmployeeName.toUpperCase().trim();
        if (employeeList.includes(upperName)) {
            alert('NAMA SUDAH ADA DALAM DAFTAR!');
            return;
        }
        const updatedList = [...employeeList, upperName].sort();
        setEmployeeList(updatedList);
        await saveEmployeesToSheets(updatedList);
        setNewEmployeeName('');
        setShowAddEmployee(false);
        alert('KARYAWAN BERHASIL DITAMBAHKAN!');
        loadDataFromSheets();
    };

    const handleRemoveEmployee = async (nameToRemove) => {
        if (window.confirm(`YAKIN INGIN MENGHAPUS KARYAWAN ${nameToRemove} DARI DAFTAR?`)) {
            const updatedList = employeeList.filter(name => name !== nameToRemove);
            setEmployeeList(updatedList);
            await saveEmployeesToSheets(updatedList);
            alert(`${nameToRemove} BERHASIL DIHAPUS.`);
            loadDataFromSheets();
        }
    };

    const handleClearAllAttendances = async () => {
        if (window.confirm("ANDA YAKIN INGIN MENGHAPUS SEMUA DATA ABSENSI? TINDAKAN INI TIDAK BISA DIBATALKAN!")) {
            await clearAllAttendances();
            setAttendances([]);
            alert("SEMUA DATA ABSENSI BERHASIL DIHAPUS.");
            loadDataFromSheets();
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const createAttendanceRecord = async (employeeName, type, customTime, purpose = '-') => {
        if (!photo) {
            alert('FOTO WAJIB DIAMBIL TERLEBIH DAHULU!');
            return false;
        }
        if (!location) {
            alert('LOKASI GPS BELUM TERDETEKSI. COBA LAGI.');
            return false;
        }

        const newAttendance = {
            id: Date.now(),
            name: employeeName,
            position: 'ANGGOTA',
            type: type,
            customTime: customTime,
            purpose: purpose,
            date: currentTime.toLocaleDateString('id-ID'),
            timestamp: currentTime.toLocaleTimeString('id-ID'),
            location: location.failed ? 'LOKASI TIDAK TERSEDIA' : `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
            photo: photoPreview,
            fullTimestamp: currentTime.toISOString()
        };

        // Save to Google Sheets
        const saved = await saveAttendanceToSheets(newAttendance);
        if (saved) {
            setAttendances([newAttendance, ...attendances]);
            setFormData({ name: '', purpose: '', customTime: '' });
            setPhoto(null);
            setPhotoPreview(null);
            loadDataFromSheets(); // Refresh data
            return true;
        } else {
            alert('Gagal menyimpan ke Google Sheets. Data tersimpan lokal.');
            return false;
        }
    };

    const handleQuickAttendance = async (employeeName) => {
        const currentTimeStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        if (await createAttendanceRecord(employeeName, 'masuk', currentTimeStr)) {
            alert(`✅ ${employeeName} BERHASIL ABSEN MASUK!`);
        }
    };

    const handleSubmitKeluar = async () => {
        if (!formData.name || !formData.customTime || !formData.izinPengawas || !formData.izinSubbagTurt || !formData.purpose) {
            alert('SEMUA KOLOM WAJIB DIISI!');
            return;
        }
        
        // Validasi harus jawab YA/SUDAH
        if (formData.izinPengawas !== 'Ya') {
            alert('❌ ANDA HARUS IZIN KEPADA PENGAWAS TERLEBIH DAHULU!');
            return;
        }
        
        if (formData.izinSubbagTurt !== 'Sudah') {
            alert('❌ ANDA HARUS KE SUBBAG TURT DAN MENGISI FORM TERLEBIH DAHULU!');
            return;
        }
        
        if (await createAttendanceRecord(formData.name, 'keluar', formData.customTime, formData.purpose)) {
            alert('✅ ABSENSI KELUAR BERHASIL DICATAT!');
        }
    };

    const filteredAttendances = filterDate ?
        attendances.filter(a => a.date === new Date(filterDate).toLocaleDateString('id-ID')) :
        attendances;

    const sortedFilteredAttendances = filteredAttendances.sort((a, b) => new Date(b.fullTimestamp) - new Date(a.fullTimestamp));

    const stats = {
        total: attendances.length,
        keluar: attendances.filter(a => a.type === 'keluar').length,
        masuk: attendances.filter(a => a.type === 'masuk').length,
        unique: new Set(attendances.map(a => a.name)).size
    };

    const exportToCSV = () => {
        const headers = ['TANGGAL', 'WAKTU INPUT', 'NAMA', 'TIPE', 'WAKTU', 'IZIN PENGAWAS', 'IZIN SUBBAG TURT', 'KEPERLUAN', 'LOKASI'];
        const rows = sortedFilteredAttendances.map(a => [
            a.date, 
            a.timestamp, 
            a.name, 
            a.type.toUpperCase(), 
            a.customTime, 
            a.izinPengawas || '-',
            a.izinSubbagTurt || '-',
            a.purpose || '-', 
            a.location
        ]);
        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ABSENSI-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const LocationDisplay = ({ locationData }) => {
        if (locationData && locationData.includes(',')) {
            const [lat, lng] = locationData.split(',').map(c => c.trim());
            return (
                <a href={createMapLink(lat, lng)} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium">
                    <MapPin className="w-4 h-4 mr-1" />
                    Lihat di Peta
                </a>
            );
        }
        return <span className="text-gray-500 text-xs">{locationData}</span>;
    };

    const PhotoModal = ({ photoUrl, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-gray-700 hover:text-red-500">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>
                <h3 className="text-xl font-bold mb-4 text-center">FOTO ABSENSI</h3>
                {photoUrl ? (
                    <img src={photoUrl} alt="Foto Absensi" className="w-full h-auto object-contain rounded-lg shadow-lg max-h-[70vh]" />
                ) : (
                    <p className="text-center text-gray-500">Tidak ada foto untuk ditampilkan.</p>
                )}
            </div>
        </div>
    );

    if (view === 'employee' || !isServerAuth) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 border-t-8 border-indigo-600/70">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-800 mb-1 leading-tight">IZIN KELUAR KANTOR</h1>
                                <p className="text-sm text-gray-500 font-semibold">MITRA KPU BEA DAN CUKAI TANJUNG PRIOK TIPE A</p>
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-600 text-sm mt-3">
                                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 font-medium">
                                        <Calendar className="w-4 h-4" />
                                        <span>{currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full text-indigo-800">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-mono text-xl font-extrabold">{currentTime.toLocaleTimeString('id-ID')}</span>
                                    </div>
                                </div>
                                {syncStatus && (
                                    <div className="mt-2 text-xs font-semibold text-blue-600">{syncStatus}</div>
                                )}
                            </div>
                            <button onClick={() => { setView('server'); setIsServerAuth(false); }} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg text-sm">
                                <Lock className="w-4 h-4" /> SERVER
                            </button>
                        </div>
                    </div>

                    {view === 'server' && !isServerAuth ? (
                        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Lock className="w-6 h-6 text-indigo-600" /> LOGIN SERVER</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">PASSWORD</label>
                                    <input
                                        type="password"
                                        value={serverPassword}
                                        onChange={(e) => setServerPassword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleServerLogin()}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase shadow-inner"
                                        placeholder="MASUKKAN PASSWORD SERVER"
                                    />
                                </div>
                                <button onClick={handleServerLogin} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-xl">
                                    <LogIn className="w-5 h-5 inline mr-2" /> LOGIN
                                </button>
                                <button onClick={() => setView('employee')} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                                    <Home className="w-4 h-4 inline mr-2" /> KEMBALI KE ABSENSI
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-200">
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setAttendanceMode('keluar')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-md ${
                                            attendanceMode === 'keluar' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-red-300/50' : 'bg-gray-100 text-gray-700 hover:bg-orange-50'
                                        }`}
                                    >
                                        <LogOut className="w-5 h-5" /> ABSEN KELUAR
                                    </button>
                                    <button
                                        onClick={() => setAttendanceMode('masuk')}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-md ${
                                            attendanceMode === 'masuk' ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-teal-300/50' : 'bg-gray-100 text-gray-700 hover:bg-green-50'
                                        }`}
                                    >
                                        <LogIn className="w-5 h-5" /> ABSEN MASUK
                                    </button>
                                </div>
                                <div className="text-center md:text-right w-full md:w-auto p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">POSISI ANDA:</p>
                                    <div className="flex items-center justify-center md:justify-end">
                                        {location ? (
                                            <a
                                                href={createMapLink(location.lat, location.lng)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-1 text-sm font-bold ${location.failed ? 'text-red-500' : 'text-blue-600 hover:text-blue-700'}`}
                                            >
                                                <MapPin className="w-4 h-4" />
                                                {location.failed ? 'GPS ERROR' : 'LOKASI TERDETEKSI'}
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-4 h-4 animate-pulse" />Memuat GPS...</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {attendanceMode === 'keluar' ? (
                                <div className="bg-white rounded-xl shadow-2xl p-6 border-t-8 border-orange-500">
                                    <h2 className="text-2xl font-extrabold text-gray-800 mb-2 flex items-center"><LogOut className='w-6 h-6 mr-2 text-orange-500' /> ABSENSI KELUAR</h2>
                                    <p className="text-orange-600 text-sm font-bold mb-6 border-b pb-2 border-dashed">Pastikan semua data terisi dan foto selfie Anda jelas.</p>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">NAMA KARYAWAN <span className='text-red-500'>*</span></label>
                                            <select
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase shadow-inner"
                                            >
                                                <option value="">-- PILIH NAMA ANDA --</option>
                                                {employeeList.map((name) => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">WAKTU KELUAR <span className='text-red-500'>*</span></label>
                                            <input
                                                type="time"
                                                value={formData.customTime}
                                                onChange={(e) => setFormData({ ...formData, customTime: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-inner"
                                            />
                                        </div>
                                        
                                        {/* PERTANYAAN 1: IZIN PENGAWAS */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                APAKAH ANDA SUDAH IZIN KEPADA PENGAWAS ANDA? <span className='text-red-500'>*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, izinPengawas: 'Ya' })}
                                                    className={`py-3 px-6 rounded-lg font-bold transition-all border-2 ${
                                                        formData.izinPengawas === 'Ya' 
                                                        ? 'bg-green-600 text-white border-green-600 shadow-lg' 
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                                                    }`}
                                                >
                                                    ✅ YA
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, izinPengawas: 'Tidak' })}
                                                    className={`py-3 px-6 rounded-lg font-bold transition-all border-2 ${
                                                        formData.izinPengawas === 'Tidak' 
                                                        ? 'bg-red-600 text-white border-red-600 shadow-lg' 
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
                                                    }`}
                                                >
                                                    ❌ TIDAK
                                                </button>
                                            </div>
                                            {formData.izinPengawas === 'Tidak' && (
                                                <div className="mt-2 bg-red-50 border border-red-300 rounded-lg p-3">
                                                    <p className="text-red-700 text-sm font-semibold">⚠️ ANDA HARUS IZIN KEPADA PENGAWAS LANTAI TERLEBI DAHULU!</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* PERTANYAAN 2: IZIN SUBBAG TURT */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                APAKAH ANDA SUDAH IZIN DAN MENULIS FORM DI SUBBAG TURT? <span className='text-red-500'>*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, izinSubbagTurt: 'Sudah' })}
                                                    className={`py-3 px-6 rounded-lg font-bold transition-all border-2 ${
                                                        formData.izinSubbagTurt === 'Sudah' 
                                                        ? 'bg-green-600 text-white border-green-600 shadow-lg' 
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                                                    }`}
                                                >
                                                    ✅ SUDAH
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, izinSubbagTurt: 'Belum' })}
                                                    className={`py-3 px-6 rounded-lg font-bold transition-all border-2 ${
                                                        formData.izinSubbagTurt === 'Belum' 
                                                        ? 'bg-red-600 text-white border-red-600 shadow-lg' 
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
                                                    }`}
                                                >
                                                    ❌ BELUM
                                                </button>
                                            </div>
                                            {formData.izinSubbagTurt === 'Belum' && (
                                                <div className="mt-2 bg-red-50 border border-red-300 rounded-lg p-3">
                                                    <p className="text-red-700 text-sm font-semibold">⚠️ KALAU BELUM, ANDA HARUS KE SUBBAG TURT!</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">KEPERLUAN <span className='text-red-500'>*</span></label>
                                            <textarea
                                                value={formData.purpose}
                                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase shadow-inner"
                                                placeholder="Contoh: MEMBELI MAKAN ATAU SEBAGAINYA" rows="3"
                                            />
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center"><UserCheck className="w-4 h-4 mr-1 text-orange-600" /> AMBIL FOTO SELFIE (WAJIB) <span className='text-red-500'>*</span></label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="user"
                                                onChange={handlePhotoChange}
                                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-200 file:text-orange-800 hover:file:bg-orange-300 transition-colors cursor-pointer"
                                            />
                                            {photoPreview && (
                                                <div className="mt-4 relative">
                                                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border-4 border-orange-500 shadow-lg" />
                                                    <span className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded-full font-bold">PREVIEW</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={handleSubmitKeluar} disabled={loading} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-extrabold hover:from-orange-700 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-300/80 disabled:opacity-50">
                                            <LogOut className="w-5 h-5" /> SUBMIT ABSENSI KELUAR
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-2xl p-6 border-t-8 border-green-500">
                                    <h2 className="text-2xl font-extrabold text-gray-800 mb-2 flex items-center"><LogIn className='w-6 h-6 mr-2 text-green-500' /> ABSENSI MASUK</h2>
                                    <p className="text-gray-600 text-sm mb-6 border-b pb-2 border-dashed">Ambil foto, lalu tekan nama Anda untuk absen.</p>
                                    <div className="mb-6 bg-green-50 p-4 rounded-xl border border-green-200">
                                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center"><UserCheck className="w-4 h-4 mr-1 text-green-600" /> AMBIL FOTO BARANG ATAU SEJENISNYA (WAJIB) <span className='text-red-500'>*</span></label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="user"
                                            onChange={handlePhotoChange}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-200 file:text-green-800 hover:file:bg-green-300 transition-colors cursor-pointer"
                                        />
                                        {photoPreview && (
                                            <div className="mt-4 relative">
                                                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border-4 border-green-500 shadow-lg" />
                                                <span className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded-full font-bold">PREVIEW</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-base font-extrabold text-gray-800 mb-4">PILIH NAMA ANDA <span className='text-red-500'>*</span></label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            {employeeList.map((name) => (
                                                <button
                                                    key={name}
                                                    onClick={() => handleQuickAttendance(name)}
                                                    disabled={loading}
                                                    className="w-full text-left px-4 py-3 bg-white border border-green-300 rounded-xl hover:bg-green-50 hover:border-green-500 transition-all font-semibold text-gray-800 flex items-center justify-between group shadow-md text-sm disabled:opacity-50">
                                                    <span>{name}</span>
                                                    <CheckCircle className="w-5 h-5 text-green-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased">
            {showPhotoModal && <PhotoModal photoUrl={currentPhoto} onClose={() => setShowPhotoModal(false)} />}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-4 md:p-6 mb-6 border-t-8 border-indigo-600/70">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-800 mb-1">DASHBOARD SERVER</h1>
                            <p className="text-sm text-gray-500 font-semibold">STATUS: <span className={`font-bold ${serverType === 'admin' ? 'text-red-600' : 'text-green-600'}`}>{serverType.toUpperCase()}</span></p>
                            {syncStatus && (
                                <div className="mt-1 text-xs font-semibold text-blue-600">{syncStatus}</div>
                            )}
                        </div>
                        <button 
                            onClick={handleServerLogout} 
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-lg text-sm font-bold"
                        >
                            <LogOut className="w-4 h-4" /> LOGOUT
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                    <div className={`grid ${serverType === 'admin' ? 'grid-cols-3' : 'grid-cols-2'} border-b`}>
                        {serverType === 'admin' && (
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`py-4 px-6 font-bold transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Home className="w-5 h-5" /> DASHBOARD
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('riwayat')}
                            className={`py-4 px-6 font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'riwayat' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FileText className="w-5 h-5" /> RIWAYAT
                        </button>
                        <button
                            onClick={() => setActiveTab('pengaturan')}
                            className={`py-4 px-6 font-bold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'pengaturan' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Settings className="w-5 h-5" /> PENGATURAN
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && serverType === 'admin' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-indigo-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">TOTAL ABSENSI</p>
                                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
                                    </div>
                                    <FileText className="w-12 h-12 text-indigo-500 opacity-20" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">ABSEN MASUK</p>
                                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.masuk}</p>
                                    </div>
                                    <LogIn className="w-12 h-12 text-green-500 opacity-20" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">ABSEN KELUAR</p>
                                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.keluar}</p>
                                    </div>
                                    <LogOut className="w-12 h-12 text-orange-500 opacity-20" />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">KARYAWAN UNIK</p>
                                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.unique}</p>
                                    </div>
                                    <Users className="w-12 h-12 text-purple-500 opacity-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'riwayat' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-indigo-600" /> RIWAYAT ABSENSI
                                </h2>
                                <div className="flex gap-3 flex-wrap">
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    />
                                    <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md font-medium">
                                        <Download className="w-4 h-4" /> EXPORT CSV
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tanggal</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Waktu Input</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nama</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tipe</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Waktu</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Izin Pengawas</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Izin Subbag Turt</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Keperluan</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Lokasi</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Foto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedFilteredAttendances.length === 0 ? (
                                            <tr>
                                                <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                                                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                    Belum ada data absensi
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedFilteredAttendances.map((att) => (
                                                <tr key={att.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-gray-800">{att.date}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{att.timestamp}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{att.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                            att.type === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            {att.type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-800 font-mono">{att.customTime}</td>
                                                    <td className="px-4 py-3">
                                                        {att.type === 'keluar' ? (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                att.izinPengawas === 'Ya' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {att.izinPengawas || '-'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {att.type === 'keluar' ? (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                att.izinSubbagTurt === 'Sudah' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {att.izinSubbagTurt || '-'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{att.purpose || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <LocationDisplay locationData={att.location} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {att.photo && (
                                                            <button
                                                                onClick={() => { setCurrentPhoto(att.photo); setShowPhotoModal(true); }}
                                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                                            >
                                                                <UserCheck className="w-4 h-4" /> Lihat
                                                            </button>
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
                )}

                {activeTab === 'pengaturan' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Settings className="w-6 h-6 text-indigo-600" /> PENGATURAN {serverType === 'pkd' ? 'PKD' : 'ADMIN'}
                            </h2>

                            <div className="space-y-6">
                                {/* Ubah Password - Untuk Admin dan PKD */}
                                <div className={serverType === 'admin' ? 'border-b pb-6' : ''}>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Key className="w-5 h-5 text-indigo-600" /> Ubah Password {serverType === 'admin' ? 'Admin' : 'PKD'}
                                    </h3>
                                    {!showPasswordChange ? (
                                        <button
                                            onClick={() => setShowPasswordChange(true)}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md font-medium"
                                        >
                                            Ubah Password Saya
                                        </button>
                                    ) : (
                                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                                <p className="text-sm text-blue-800 font-semibold">
                                                    Anda akan mengubah password untuk akun: <span className="font-bold uppercase">{serverType}</span>
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Minimal 6 karakter"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handlePasswordChange}
                                                    disabled={loading}
                                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                                                >
                                                    Simpan
                                                </button>
                                                <button
                                                    onClick={() => { setShowPasswordChange(false); setNewPassword(''); }}
                                                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fitur khusus Admin - Kelola Karyawan */}
                                {serverType === 'admin' && (
                                    <>
                                        <div className="border-b pb-6">
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <UserPlus className="w-5 h-5 text-green-600" /> Kelola Karyawan
                                            </h3>
                                            {!showAddEmployee ? (
                                                <button
                                                    onClick={() => setShowAddEmployee(true)}
                                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md font-medium"
                                                >
                                                    Tambah Karyawan Baru
                                                </button>
                                            ) : (
                                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Karyawan</label>
                                                        <input
                                                            type="text"
                                                            value={newEmployeeName}
                                                            onChange={(e) => setNewEmployeeName(e.target.value)}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 uppercase"
                                                            placeholder="MASUKKAN NAMA LENGKAP"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={handleAddEmployee}
                                                            disabled={loading}
                                                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                                                        >
                                                            Tambahkan
                                                        </button>
                                                        <button
                                                            onClick={() => { setShowAddEmployee(false); setNewEmployeeName(''); }}
                                                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-6">
                                                <h4 className="font-bold text-gray-700 mb-3">Daftar Karyawan ({employeeList.length})</h4>
                                                <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="space-y-2">
                                                        {employeeList.map((name) => (
                                                            <div key={name} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                                                <span className="font-medium text-gray-800 text-sm">{name}</span>
                                                                <button
                                                                    onClick={() => handleRemoveEmployee(name)}
                                                                    disabled={loading}
                                                                    className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <Trash2 className="w-5 h-5 text-red-600" /> Hapus Data
                                            </h3>
                                            <button
                                                onClick={handleClearAllAttendances}
                                                disabled={loading}
                                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md font-medium flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" /> Hapus Semua Data Absensi
                                            </button>
                                            <p className="text-sm text-gray-500 mt-2">⚠️ Tindakan ini tidak dapat dibatalkan!</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceSystem;
