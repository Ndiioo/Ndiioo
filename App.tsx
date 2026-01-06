
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Package, 
  User, 
  MapPin, 
  ClipboardList, 
  Info, 
  Loader2, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink, 
  Check, 
  ListChecks, 
  Copy, 
  LogOut, 
  Lock, 
  UserCircle, 
  Camera, 
  ImagePlus, 
  XCircle, 
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  ChevronRight,
  Filter,
  Github,
  Globe,
  QrCode,
  Maximize2,
  Minimize2,
  Activity,
  TrendingUp,
  Users,
  PieChart,
  RotateCcw,
  Scan,
  Mail,
  ShieldCheck,
  BadgeCheck,
  Send,
  Calendar,
  Phone,
  Settings,
  Pencil,
  Download,
  Share2,
  Briefcase
} from 'lucide-react';
import { Assignment, Station, GroupedAssignment } from './types';
import { STATIONS } from './data';
import { getLogisticsInsights } from './services/geminiService';
import { fetchSpreadsheetData, updateSpreadsheetTask } from './services/spreadsheetService';
import { QRCodeSVG } from 'qrcode.react';

const GITHUB_REPO_URL = "https://github.com/Ndiioo/SPX-Assigment-Task";
const AUTO_REFRESH_INTERVAL = 60000;
const DEFAULT_PASSWORD = "123456";
const MASTER_ADMIN_ID = "Admin";

const ADMIN_REGISTRY = [
  { id: 'Ops186909', name: 'SAFRIWANDI', position: 'PIC' },
  { id: 'Ops1187094', name: 'MUCHLIS MUSTARI', position: 'Daily Worker' },
  { id: 'Ops1187093', name: 'ANGGA', position: 'Daily Worker' },
  { id: 'Ops1180047', name: 'ILHAM SILVA ROYANTO', position: 'Daily Worker' },
  { id: 'Ops1152905', name: 'SURYA SAPUTRA', position: 'Daily Worker' },
  { id: 'Ops1034226', name: 'Akbar', position: 'Shift Lead' },
  { id: 'Ops991421', name: 'HENDRI RAMADAN', position: 'Daily Worker' },
  { id: 'Ops968087', name: 'AGUNG', position: 'Shift Worker' },
  { id: 'Ops890915', name: 'MUH.ARYADIN', position: 'Operator Dedicated' },
  { id: 'Ops620808', name: 'Dicky Wahyudi Bakri', position: 'Admin Tracer' },
];

interface UserProfile {
  email: string;
  phone: string;
  dob: string;
  photoUrl: string;
  position: string;
  isComplete: boolean;
}

interface UserSession {
  id: string;
  role: 'admin' | 'operator' | 'courier';
  name: string;
  position?: string;
  profile?: UserProfile;
}

type StatType = 'none' | 'packages' | 'couriers' | 'completed' | 'ongoing';

const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const extractIdAndName = (fullName: string) => {
  const idMatch = fullName.match(/\[(.*?)\]/);
  const id = idMatch ? idMatch[1].trim() : '';
  const name = fullName.replace(/\[.*?\]/, '').trim();
  const capitalizedName = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return { id, name: capitalizedName || fullName };
};

const extractIdFromBrackets = (name: string): string | null => {
  const match = name.match(/\[(.*?)\]/);
  if (!match) return null;
  let id = match[1].trim();
  if (id.toLowerCase().startsWith('ops')) {
    return 'Ops' + id.substring(3);
  }
  return id;
};

const getInitials = (name: string) => {
  const cleanName = name.replace(/\[.*?\]/, '').trim();
  return cleanName.length > 0 ? cleanName.charAt(0).toUpperCase() : name.trim().charAt(0).toUpperCase();
};

const downloadQRCode = (taskId: string) => {
  const svg = document.getElementById(`qr-${taskId}`);
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `QR_${taskId}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(svgData);
};

const StatCard: React.FC<{ 
  title: string, value: string | number, icon: any, colorClass: string, isActive: boolean, onClick: () => void 
}> = ({ title, value, icon: Icon, colorClass, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left p-2 md:p-4 rounded-xl shadow-sm border transition-all relative overflow-hidden group ${
      isActive ? 'bg-white border-[#EE4D2D] ring-2 ring-orange-100' : 'bg-white border-gray-100'
    }`}
  >
    <div className="flex items-center gap-1.5 md:gap-4 relative z-10">
      <div className={`p-1.5 md:p-3 rounded-lg ${colorClass} shrink-0 shadow-sm transition-transform group-hover:scale-110`}>
        <Icon size={12} className="text-white md:w-5 md:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[6px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-[10px] md:text-xl font-black text-gray-800 leading-tight truncate">{value}</p>
      </div>
    </div>
  </button>
);

const AssignmentCard: React.FC<{ group: GroupedAssignment, onClick: () => void }> = ({ group, onClick }) => {
  const avatarBg = getAvatarColor(group.courierName);
  const { id, name } = extractIdAndName(group.courierName);
  
  return (
    <div onClick={onClick} className="group bg-white p-2.5 md:p-6 rounded-xl md:rounded-[32px] shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl ${avatarBg} flex items-center justify-center text-white font-black text-xs md:text-2xl shadow-sm shrink-0`}>
             {getInitials(group.courierName)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight text-[9px] md:text-base truncate">{name}</h3>
            <p className="text-[7px] md:text-[10px] text-gray-400 font-medium">ID: {id || 'N/A'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={`text-[6px] md:text-[9px] px-1 md:px-2 py-0.5 md:py-1 rounded-full font-bold uppercase ${group.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{group.status}</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] md:text-3xl font-black text-gray-800 tracking-tighter">{group.totalPackages}</span>
          <span className="text-[7px] md:text-[10px] font-bold text-gray-400 uppercase ml-1">Pkt</span>
        </div>
        <div className="flex items-center gap-1 text-[#EE4D2D] font-bold text-[7px] md:text-xs">Buka <ArrowRight size={8} /></div>
      </div>
    </div>
  );
};

const ProfileForm: React.FC<{ session: UserSession, onSave: (profile: UserProfile) => void, onClose: () => void, title: string }> = ({ session, onSave, onClose, title }) => {
  const [email, setEmail] = useState(session.profile?.email || "");
  const [phone, setPhone] = useState(session.profile?.phone || "");
  const [dob, setDob] = useState(session.profile?.dob || "");
  const [position, setPosition] = useState(session.profile?.position || session.position || "");
  const [photoUrl, setPhotoUrl] = useState(session.profile?.photoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ email, phone, dob, position, photoUrl, isComplete: true });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="bg-[#EE4D2D] p-5 md:p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <XCircle size={18} />
          </button>
          <h2 className="text-sm md:text-xl font-black tracking-tight">{title}</h2>
          <p className="text-[7px] md:text-[9px] font-bold uppercase opacity-80 mt-0.5 tracking-widest">Informasi Hub SPX Express</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-3 md:space-y-4">
          <div className="flex flex-col items-center mb-2">
            <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-gray-50 flex items-center justify-center bg-gray-50 shadow-sm group-hover:border-orange-200 transition-all">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-300" />}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#EE4D2D] text-white p-1 rounded-lg shadow-md"><ImagePlus size={10} /></div>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
            </div>
          </div>
          <div className="space-y-2 md:space-y-3">
            <div className="bg-gray-50 p-2.5 md:p-3 rounded-xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-3">
              <Mail className="text-gray-400" size={14} />
              <div className="flex-1">
                <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">Alamat Email</p>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@spx.id" className="w-full bg-transparent text-[10px] md:text-xs font-bold outline-none" required />
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 md:p-3 rounded-xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-3">
              <Phone className="text-gray-400" size={14} />
              <div className="flex-1">
                <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">Nomor WhatsApp</p>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..." className="w-full bg-transparent text-[10px] md:text-xs font-bold outline-none" required />
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 md:p-3 rounded-xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-3">
              <Briefcase className="text-gray-400" size={14} />
              <div className="flex-1">
                <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">Jabatan / Job Position</p>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Contoh: Kurir, Admin" className="w-full bg-transparent text-[10px] md:text-xs font-bold outline-none" required />
              </div>
            </div>
            <div className="bg-gray-50 p-2.5 md:p-3 rounded-xl border border-gray-100 focus-within:bg-white focus-within:border-orange-500 transition-all flex items-center gap-3">
              <Calendar className="text-gray-400" size={14} />
              <div className="flex-1">
                <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">Tanggal Lahir</p>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-transparent text-[10px] md:text-xs font-bold outline-none" required />
              </div>
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button type="submit" className="w-full bg-[#EE4D2D] text-white py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Check size={16} /> Simpan Profil</button>
            <button type="button" onClick={onClose} className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all">Lain Kali Saja</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Modal: React.FC<{ group: GroupedAssignment, onClose: () => void, onCompleteTask: (taskId: string) => void }> = ({ group, onClose, onCompleteTask }) => {
  const [zoomedTaskId, setZoomedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Ongoing' | 'Completed'>('All');

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'All') return group.tasks;
    return group.tasks.filter(t => t.status === statusFilter);
  }, [group.tasks, statusFilter]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      {zoomedTaskId && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setZoomedTaskId(null)}>
          <div className="bg-white p-4 rounded-[32px] md:rounded-[40px] shadow-2xl relative">
            <QRCodeSVG value={zoomedTaskId} size={window.innerWidth < 768 ? 240 : 400} level="H" includeMargin={true} />
            <button onClick={() => setZoomedTaskId(null)} className="absolute -top-10 right-0 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center gap-2"><Minimize2 size={18} /> Tutup</button>
          </div>
          <p className="mt-6 text-lg font-black text-white tracking-tighter truncate max-w-full px-4">{zoomedTaskId}</p>
          <button onClick={(e) => { e.stopPropagation(); downloadQRCode(zoomedTaskId); }} className="mt-4 bg-[#EE4D2D] text-white px-6 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-xl"><Download size={18} /> Download</button>
        </div>
      )}

      <div className="bg-white rounded-[24px] md:rounded-[48px] w-full max-w-2xl max-h-[96vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-[#EE4D2D] p-4 md:p-8 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-tighter truncate max-w-[180px] md:max-w-none">{group.courierName}</h2>
            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-80 mt-0.5 italic">{group.station} Station</p>
          </div>
          <button onClick={onClose} className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-[24px]"><XCircle size={18} md:size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-6 bg-gray-50/50">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['All', 'Pending', 'Ongoing', 'Completed'].map((s) => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s as any)}
                className={`px-3 py-1.5 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'}`}
              >
                {s === 'All' ? 'Semua' : s === 'Completed' ? 'Selesai' : s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl p-3 md:p-6 border border-gray-100 shadow-sm space-y-3 md:space-y-6">
                <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center">
                  <div className="shrink-0 flex flex-col items-center gap-1.5">
                    <div onClick={() => setZoomedTaskId(task.taskId)} className="p-1.5 bg-white rounded-xl border-2 border-gray-50 shadow-sm cursor-zoom-in">
                      <QRCodeSVG id={`qr-${task.taskId}`} value={task.taskId} size={100} md:size={160} level="H" includeMargin={true} />
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setZoomedTaskId(task.taskId)} className="p-1.5 bg-gray-50 rounded-md text-gray-400 hover:text-orange-500"><Maximize2 size={10} /></button>
                      <button onClick={() => downloadQRCode(task.taskId)} className="p-1.5 bg-gray-50 rounded-md text-gray-400 hover:text-orange-500"><Download size={10} /></button>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 w-full space-y-2 md:space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-[6px] md:text-[8px] font-black text-gray-400 uppercase">ID Tugas</p>
                        <h4 className="text-[11px] md:text-xl font-black text-gray-900 tracking-tighter truncate">{task.taskId}</h4>
                      </div>
                      <span className={`px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[6px] md:text-[8px] font-black uppercase ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{task.status}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[8px] md:text-sm">
                      <div className="flex flex-col">
                        <span className="text-[6px] md:text-[8px] font-black text-gray-400 uppercase">Paket</span>
                        <span className="font-black text-gray-800">{task.packageCount} Pkt</span>
                      </div>
                      <div className="w-[1px] h-4 bg-gray-100"></div>
                      <div className="flex flex-col">
                        <span className="text-[6px] md:text-[8px] font-black text-gray-400 uppercase">Update</span>
                        <span className="font-bold text-gray-600">{task.lastUpdated}</span>
                      </div>
                    </div>

                    {task.status !== 'Completed' ? (
                      <button onClick={() => onCompleteTask(task.id)} className="w-full bg-[#EE4D2D] text-white py-2.5 rounded-lg md:rounded-xl font-black text-[8px] md:text-[10px] uppercase shadow-md flex items-center justify-center gap-1.5"><Scan size={12} /> Selesaikan</button>
                    ) : (
                      <div className="w-full py-2.5 rounded-lg md:rounded-xl bg-green-50 border border-green-100 text-green-700 font-black text-[7px] md:text-[9px] uppercase flex items-center justify-center gap-1"><CheckCircle2 size={10} /> Selesai Terverifikasi</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 md:p-6 bg-white border-t border-gray-100 shrink-0 text-center">
          <button onClick={onClose} className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest">Tutup</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [selectedGroup, setSelectedGroup] = useState<GroupedAssignment | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStat, setActiveStat] = useState<StatType>('none');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showManualProfile, setShowManualProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotMsg, setForgotMsg] = useState<{title: string, msg: string, status: 'prompt' | 'sending' | 'success'} | null>(null);

  useEffect(() => {
    fetchData(true).then(() => setLoading(false));
  }, []);

  const fetchData = async (isInitial = false) => {
    if (refreshing) return;
    try {
      if (!isInitial) setRefreshing(true);
      const allData: Assignment[] = [];
      for (const station of STATIONS) {
        try {
          const stationData = await fetchSpreadsheetData(station);
          allData.push(...stationData);
        } catch (e) { console.error(e); }
      }
      setAssignments(allData);
      if (session && allData.length > 0 && (!insights || !isInitial)) {
        const insightText = await getLogisticsInsights(allData);
        setInsights(insightText);
      }
    } catch (err) { console.error(err); } finally {
      if (!isInitial) setRefreshing(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (session && autoRefreshEnabled) interval = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [session, autoRefreshEnabled]);

  const filteredAssignmentsData = useMemo(() => {
    if (!session) return [];
    let result = assignments;
    if (session.role === 'courier') result = assignments.filter(a => extractIdFromBrackets(a.courierName) === session.id);
    if (selectedStation !== 'All') result = result.filter(a => a.station === selectedStation);
    if (activeStat === 'completed') result = result.filter(a => a.status === 'Completed');
    else if (activeStat === 'ongoing') result = result.filter(a => a.status !== 'Completed');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.courierName.toLowerCase().includes(q) || a.taskId.toLowerCase().includes(q));
    }
    return result;
  }, [assignments, session, selectedStation, activeStat, searchQuery]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, GroupedAssignment> = {};
    filteredAssignmentsData.forEach(a => {
      const key = `${a.courierName}-${a.station}`;
      if (!groups[key]) groups[key] = { courierName: a.courierName, station: a.station, totalPackages: 0, tasks: [], status: 'Ongoing', lastUpdated: a.lastUpdated };
      groups[key].totalPackages += a.packageCount;
      groups[key].tasks.push(a);
    });
    return Object.values(groups).map((g): GroupedAssignment => ({
      ...g,
      status: (g.tasks.every(t => t.status === 'Completed') ? 'Completed' : g.tasks.every(t => t.status === 'Pending') ? 'Pending' : 'Ongoing') as any
    }));
  }, [filteredAssignmentsData]);

  const stats = useMemo(() => ({
    totalPackages: filteredAssignmentsData.reduce((sum, a) => sum + a.packageCount, 0),
    totalCouriers: new Set(filteredAssignmentsData.map(a => a.courierName)).size,
    completedTasks: filteredAssignmentsData.filter(a => a.status === 'Completed').length,
    pendingTasks: filteredAssignmentsData.filter(a => a.status !== 'Completed').length,
  }), [filteredAssignmentsData]);

  const handleSelectGroup = (group: GroupedAssignment) => {
    const updated = assignments.map(a => {
      if (a.courierName === group.courierName && a.station === group.station && a.status === 'Pending') {
        updateSpreadsheetTask(a.taskId, 'Ongoing', a.station);
        return { ...a, status: 'Ongoing' as const, lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return a;
    });
    setAssignments(updated);
    setSelectedGroup({ ...group, tasks: group.tasks.map(t => t.status === 'Pending' ? { ...t, status: 'Ongoing' as const } : t) });
  };

  const handleCompleteTask = (taskId: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === taskId) {
        updateSpreadsheetTask(a.taskId, 'Completed', a.station);
        return { ...a, status: 'Completed' as const, lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return a;
    }));
    if (selectedGroup) {
      const tasks = selectedGroup.tasks.map(t => t.id === taskId ? { ...t, status: 'Completed' as const } : t);
      setSelectedGroup({ ...selectedGroup, tasks });
    }
  };

  const loadUserProfile = (id: string): UserProfile | undefined => {
    const saved = localStorage.getItem(`spx_profile_${id}`);
    return saved ? JSON.parse(saved) : undefined;
  };

  const saveUserProfile = (id: string, profile: UserProfile) => {
    localStorage.setItem(`spx_profile_${id}`, JSON.stringify(profile));
    if (session && session.id === id) setSession({ ...session, profile });
    setShowProfileSetup(false);
    setShowManualProfile(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false); setErrorMsg("");
    const normalized = username.trim();
    if (!normalized || !password.trim()) { setLoginError(true); setErrorMsg("Isi semua data."); return; }
    setIsLoggingIn(true);
    setTimeout(() => {
      let s: UserSession | null = null;
      if (normalized === MASTER_ADMIN_ID && password === DEFAULT_PASSWORD) s = { id: MASTER_ADMIN_ID, role: 'admin', name: 'Master Admin Hub', position: 'Administrator' };
      if (!s) {
        const ae = ADMIN_REGISTRY.find(a => a.id === normalized);
        if (ae && password === DEFAULT_PASSWORD) s = { id: ae.id, role: 'operator', name: ae.name, position: ae.position };
      }
      if (!s) {
        const match = assignments.map(a => ({ id: extractIdFromBrackets(a.courierName), name: a.courierName })).filter(i => i.id !== null).find(m => m.id === normalized);
        if (match && password === DEFAULT_PASSWORD) {
          const { name } = extractIdAndName(match.name);
          s = { id: normalized, role: normalized.startsWith('Ops') ? 'operator' : 'courier', name, position: 'Courier' };
        }
      }
      if (s) {
        const p = loadUserProfile(s.id);
        s.profile = p;
        setSession(s);
        if (!p || !p.isComplete) setShowProfileSetup(true);
      } else { setLoginError(true); setErrorMsg("ID atau Password salah."); }
      setIsLoggingIn(false);
    }, 1000);
  };

  const handleLogout = () => {
    setSession(null);
    setSelectedGroup(null);
    setActiveStat('none');
    setSearchQuery("");
  };

  if (loading) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 md:p-16 rounded-[48px] md:rounded-[60px] shadow-2xl flex flex-col items-center border border-orange-100">
        <Loader2 className="animate-spin text-[#EE4D2D] mb-6" size={50} md:size={80} />
        <h2 className="text-lg md:text-3xl font-black text-gray-800 italic">Syncing Hub Data</h2>
        <p className="text-[7px] md:text-[10px] text-gray-400 mt-2 font-black uppercase tracking-[0.3em]">Connecting to Cloud Database...</p>
      </div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-orange-200/30 rounded-full blur-[100px] animate-pulse"></div>
      <div className="max-w-xs md:max-w-md w-full bg-white rounded-[32px] md:rounded-[60px] shadow-2xl p-6 md:p-12 flex flex-col items-center relative z-10 border border-orange-100">
        {forgotMsg && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[100] p-6 md:p-12 flex flex-col items-center justify-center text-center rounded-[32px] md:rounded-[60px]">
            <div className={`w-12 h-12 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-6 ${forgotMsg.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {forgotMsg.status === 'sending' ? <Loader2 className="animate-spin" size={20} /> : forgotMsg.status === 'success' ? <Check size={28} /> : <Mail size={28} />}
            </div>
            <h3 className="text-base md:text-2xl font-black text-gray-800 mb-2">{forgotMsg.title}</h3>
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mb-6 leading-relaxed">{forgotMsg.msg}</p>
            <div className="flex flex-col gap-2 md:gap-4 w-full">
              {forgotMsg.status === 'prompt' && <button onClick={() => { setForgotMsg({ ...forgotMsg, status: 'sending', title: 'Mengirim...' }); setTimeout(() => setForgotMsg({ status: 'success', title: 'Berhasil!', msg: 'Email terkirim.' }), 1500); }} className="w-full bg-[#EE4D2D] text-white py-3 md:py-4 rounded-xl font-black text-[9px] uppercase shadow-lg">Kirim Instruksi</button>}
              <button onClick={() => setForgotMsg(null)} className="w-full bg-gray-900 text-white py-3 md:py-4 rounded-xl font-black text-[9px] uppercase">Kembali</button>
            </div>
          </div>
        )}
        <div className="bg-[#EE4D2D] px-4 py-2 md:px-10 md:py-6 rounded-xl md:rounded-[32px] shadow-xl mb-6 md:mb-12 flex items-center justify-center">
          <div className="flex items-center gap-1"><span className="text-white font-[900] text-xl md:text-4xl italic tracking-tighter leading-none">SPX</span><span className="text-white font-light text-xl md:text-4xl tracking-tighter leading-none">Express</span></div>
        </div>
        <h1 className="text-lg md:text-3xl font-black text-gray-800 italic">Access Portal</h1>
        <p className="text-gray-400 text-[7px] md:text-[10px] font-black mt-1 mb-6 md:mb-12 uppercase tracking-[0.3em]">Logistics Hub Control</p>
        <form onSubmit={handleLogin} className="w-full space-y-3 md:space-y-6">
          {errorMsg && <div className="bg-red-50 p-2 rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle className="text-red-500" size={12} /><p className="text-red-600 text-[7px] font-black uppercase">{errorMsg}</p></div>}
          <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100 flex items-center gap-2 md:gap-3">
            <UserCircle className="text-gray-300" size={18} />
            <div className="flex-1">
              <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">User ID / Ops ID</p>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ID Anda" className="w-full bg-transparent text-[10px] font-black outline-none" required />
            </div>
          </div>
          <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100 flex items-center gap-2 md:gap-3 relative">
            <Lock className="text-gray-300" size={18} />
            <div className="flex-1">
              <p className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase">Password</p>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent text-[10px] font-black outline-none" required />
            </div>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-300">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-[#EE4D2D] text-white py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70">
            {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={20} md:size={24} />} Login Hub
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-20">
      {showProfileSetup && session && <ProfileForm session={session} title="Profil Baru" onSave={(p) => saveUserProfile(session.id, p)} onClose={() => setShowProfileSetup(false)} />}
      {showManualProfile && session && <ProfileForm session={session} title="Update Profil" onSave={(p) => saveUserProfile(session.id, p)} onClose={() => setShowManualProfile(false)} />}
      
      <div className="sticky top-0 z-50 bg-gray-50/90 backdrop-blur-xl border-b border-gray-100">
        <header className="bg-[#EE4D2D] text-white pt-3 pb-8 md:pt-6 md:pb-16 px-3 md:px-10 rounded-b-[32px] md:rounded-b-[60px] shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-1.5 md:gap-6">
              <div className="bg-black px-2 py-1 md:px-5 md:py-3 rounded-lg md:rounded-xl border border-white/20">
                <div className="flex items-center gap-1"><span className="text-white font-black text-[10px] md:text-2xl italic tracking-tighter">SPX</span><span className="text-white font-light text-[10px] md:text-2xl tracking-tighter">Express</span></div>
              </div>
              <div className="hidden lg:flex flex-col">
                <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">Assignment Task Dashboard</h1>
              </div>
            </div>
            
            <button onClick={() => setShowManualProfile(true)} className="flex items-center bg-black/20 px-2 py-1 md:px-5 md:py-3 rounded-full border border-white/10 group shadow-md transition-all hover:bg-black/30">
              <div className="w-7 h-7 md:w-12 md:h-12 rounded-full overflow-hidden mr-1.5 md:mr-4 border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-md">
                {(session.profile?.photoUrl) ? <img src={session.profile.photoUrl} className="w-full h-full object-cover" /> : <span className="font-black text-[10px] md:text-xl">{getInitials(session.name)}</span>}
              </div>
              <div className="flex flex-col items-start pr-1 md:pr-6 text-left">
                <p className="text-[6px] md:text-[9px] font-black uppercase text-orange-200 leading-none">
                  {session.profile?.position || session.position || 'HUB STAFF'}
                </p>
                <p className="text-[9px] md:text-sm font-black truncate max-w-[70px] md:max-w-[150px] uppercase leading-tight mt-0.5">
                  {session.name}
                </p>
                <p className="text-[6px] md:text-[9px] text-white/60 font-medium">ID: {session.id}</p>
              </div>
              <Settings size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <div className="flex items-center gap-1.5 md:gap-4">
              <button onClick={() => fetchData()} className={`p-1.5 md:p-4 rounded-lg bg-white/10 transition-all ${refreshing ? 'animate-spin' : ''}`}><RefreshCw size={14} md:size={24} /></button>
              <button onClick={handleLogout} className="p-1.5 md:p-4 rounded-lg bg-white/10"><LogOut size={14} md:size={24} /></button>
            </div>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-3 md:px-10 -mt-5 md:-mt-10 pb-4 md:pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
            <StatCard title="Total Paket" value={stats.totalPackages} icon={Package} colorClass="bg-orange-600" isActive={activeStat === 'packages'} onClick={() => setActiveStat(activeStat === 'packages' ? 'none' : 'packages')} />
            <StatCard title="Kurir Hub" value={stats.totalCouriers} icon={Users} colorClass="bg-blue-600" isActive={activeStat === 'couriers'} onClick={() => setActiveStat(activeStat === 'couriers' ? 'none' : 'couriers')} />
            <StatCard title="Selesai" value={stats.completedTasks} icon={CheckCircle2} colorClass="bg-emerald-600" isActive={activeStat === 'completed'} onClick={() => setActiveStat(activeStat === 'completed' ? 'none' : 'completed')} />
            <StatCard title="Proses" value={stats.pendingTasks} icon={Clock} colorClass="bg-gray-500" isActive={activeStat === 'ongoing'} onClick={() => setActiveStat(activeStat === 'ongoing' ? 'none' : 'ongoing')} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 md:px-10 mt-4 md:mt-10 space-y-4 md:space-y-10 relative z-10">
        {activeStat !== 'none' && (
          <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[50px] border border-orange-50 shadow-xl animate-in slide-in-from-top duration-500 overflow-hidden">
            <div className="flex justify-between items-center mb-4 md:mb-10 relative z-10">
              <h3 className="text-sm md:text-3xl font-black text-gray-800 tracking-tighter italic flex items-center gap-2 md:gap-4 uppercase">
                {activeStat === 'packages' ? 'Analitik Paket' : activeStat === 'couriers' ? 'Data Kurir Hub' : activeStat === 'completed' ? 'Pencapaian Selesai' : 'Tugas Dalam Proses'}
              </h3>
              <button onClick={() => setActiveStat('none')} className="bg-gray-100 px-3 py-1.5 rounded-lg text-[7px] md:text-[10px] font-black uppercase tracking-widest">Tutup</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 relative z-10">
              {STATIONS.map(s => {
                const tasks = filteredAssignmentsData.filter(a => a.station === s);
                const progress = tasks.length > 0 ? (tasks.filter(a => a.status === 'Completed').length / tasks.length) * 100 : 0;
                return (
                  <div key={s} className="bg-gray-50 p-3 md:p-8 rounded-xl md:rounded-[36px] border border-gray-100 space-y-2 md:space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">{s} Hub</span>
                      <span className="text-[10px] md:text-xl font-black">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 md:h-4 bg-white rounded-full overflow-hidden border border-gray-100 p-0.5">
                      <div className={`h-full rounded-full bg-orange-500 transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-[6px] md:text-[10px] font-black text-gray-400 uppercase">{tasks.length} AT Terdaftar</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {insights && (
          <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[32px] border border-orange-100 shadow-sm flex gap-3 md:gap-6 items-center">
            <div className="w-8 h-8 md:w-14 md:h-14 bg-orange-100 rounded-lg md:rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle className="text-[#EE4D2D]" size={18} md:size={28} />
            </div>
            <div className="flex-1">
              <span className="text-[6px] md:text-[10px] font-black text-[#EE4D2D] uppercase tracking-widest mb-0.5 block">AI Operational Insight</span>
              <p className="text-gray-600 font-medium text-[9px] md:text-sm leading-snug italic">"{insights}"</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 md:gap-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input type="text" placeholder="Cari kurir atau ID tugas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 md:py-5 rounded-xl md:rounded-[32px] bg-white border border-gray-100 shadow-sm focus:border-orange-500 outline-none text-[10px] md:text-sm font-bold transition-all" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button onClick={() => setSelectedStation('All')} className={`px-4 py-3 md:py-4 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest shadow-sm border shrink-0 ${selectedStation === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'}`}>Semua Hub</button>
            {STATIONS.map(s => (<button key={s} onClick={() => setSelectedStation(s)} className={`px-4 py-3 md:py-4 rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest shadow-sm border shrink-0 ${selectedStation === s ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'bg-white text-gray-400 border-gray-100'}`}>{s}</button>))}
          </div>
        </div>

        {groupedAssignments.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-8 pb-8">
            {groupedAssignments.map((g, i) => (<AssignmentCard key={`${g.courierName}-${i}`} group={g} onClick={() => handleSelectGroup(g)} />))}
          </div>
        ) : (
          <div className="bg-white rounded-[24px] p-10 md:p-24 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
            <ClipboardList size={40} className="text-gray-100 mb-3" />
            <h3 className="text-sm md:text-3xl font-black text-gray-800 tracking-tighter italic leading-none">Tidak Ada Data</h3>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[6px] md:text-[10px] mt-2">Database Hub Belum Ada Isi</p>
          </div>
        )}
      </main>

      {selectedGroup && <Modal group={selectedGroup} onClose={() => setSelectedGroup(null)} onCompleteTask={handleCompleteTask} />}
      
      <footer className="max-w-7xl mx-auto px-3 mt-4 text-center space-y-1.5 opacity-40">
        <p className="text-[6px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Shopee Xpress Hub Cluster Tompobulu © 2026</p>
      </footer>
    </div>
  );
};

export default App;
