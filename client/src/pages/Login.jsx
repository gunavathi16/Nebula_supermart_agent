import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('kirana123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await login(username, password);
    setSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6 border border-slate-100">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="lg" showText={false} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nebula Supermarket</h2>
            <p className="text-xs text-amber-600 font-semibold tracking-wide mt-0.5">
              Daily Provisions • Honest Measures • Lasting Trust
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Store Management Portal for Owner & Counter Staff
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 text-sm transition active:scale-95"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In to Counter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Selection for Supermarket Management */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2.5">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Select Supermarket Role</p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'kirana123')}
              className={`p-2.5 rounded-xl border transition ${
                username === 'admin' 
                  ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>👑</span>
                <span>Store Owner</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Full P&L, margins, reports & settings</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('staff', 'staff123')}
              className={`p-2.5 rounded-xl border transition ${
                username === 'staff' 
                  ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>🏷️</span>
                <span>Counter Staff</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">POS checkout, stock intake & khata</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
