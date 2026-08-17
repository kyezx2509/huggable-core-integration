import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster, toast } from "sonner";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useServerFn } from "@tanstack/react-start";
import { resendToUtmify } from "@/lib/utmify-admin.functions";
import {
  CalendarIcon, LayoutDashboard, ShoppingBag, Users, Shield, Settings as SettingsIcon,
  LogOut, Search, RefreshCw, Eye, Trash2, CheckCircle2, FileText, X, MapPin, Activity, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/acessar/")({
  component: AdminPanel,
});

type DateFilter = "all" | "today" | "yesterday" | "last7days" | "custom";
type Tab = "dashboard" | "orders" | "attribution" | "utmify" | "receipts" | "visitors" | "security" | "apis" | "settings";

function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [visSelected, setVisSelected] = useState<any>(null);
  const [attSelected, setAttSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) checkAdmin(s.user.id);
      else { setIsAdmin(false); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data: role } = await (supabase as any).from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    let admin = !!role;
    if (!admin) {
      const { data } = await supabase.from("admin_users").select("id").eq("id", userId).maybeSingle();
      admin = !!data;
    }
    setIsAdmin(admin);
    if (admin) {
      fetchAll();
    }
    setLoading(false);
  };

  const fetchAll = async () => {
    fetchTransactions();
    fetchAttempts();
    fetchVisitors();
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(1000);
    if (data) setTransactions(data);
  };
  const fetchAttempts = async () => {
    const { data } = await (supabase as any).from("login_attempts").select("*").order("created_at", { ascending: false }).limit(500);
    if (data) setAttempts(data);
  };
  const fetchVisitors = async () => {
    const { data } = await (supabase as any).from("visitor_logs").select("*").order("created_at", { ascending: false }).limit(5000);
    if (data) setVisitors(data);
  };

  const logAttempt = async (email: string, password: string, success: boolean, error_message?: string) => {
    try {
      await fetch("/api/public/log-login-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, success, error_message }),
      });
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) {
      await logAttempt(email, password, false, error.message);
      toast.error("Login inválido");
    } else {
      await logAttempt(email, password, true);
      toast.success("Bem-vindo");
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  const adminAction = async (payload: any) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("/api/public/admin-action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const openReceipt = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("comprovantes")
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) {
        toast.error(error?.message || "Não foi possível abrir o comprovante");
        return;
      }
      setReceiptUrl(data.signedUrl);
    } catch {
      toast.error("Erro de conexão ao abrir o comprovante");
    }
  };

  // ---------- filtering ----------
  const offerTx = transactions;
  const offerVisitors = visitors;

  const filteredTx = useMemo(() => {
    let arr = offerTx;
    if (statusFilter !== "all") arr = arr.filter(t => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t =>
        t.customer_name?.toLowerCase().includes(q) ||
        t.customer_email?.toLowerCase().includes(q) ||
        t.customer_cpf?.includes(q) ||
        t.transaction_id?.toLowerCase().includes(q),
      );
    }
    if (dateFilter !== "all") {
      const now = new Date();
      let from: Date | undefined; let to: Date | undefined;
      if (dateFilter === "today") { from = startOfDay(now); to = endOfDay(now); }
      else if (dateFilter === "yesterday") { const y = subDays(now, 1); from = startOfDay(y); to = endOfDay(y); }
      else if (dateFilter === "last7days") { from = startOfDay(subDays(now, 6)); to = endOfDay(now); }
      else if (dateFilter === "custom" && dateRange.from) {
        from = startOfDay(dateRange.from);
        to = endOfDay(dateRange.to || dateRange.from);
      }
      if (from && to) arr = arr.filter(t => { const d = new Date(t.created_at); return d >= from! && d <= to!; });
    }
    return arr;
  }, [offerTx, statusFilter, search, dateFilter, dateRange]);

  const receipts = useMemo(() => offerTx.filter(t => t.comprovante_url), [offerTx]);

  const stats = useMemo(() => {
    const total = filteredTx.length;
    const paid = filteredTx.filter(t => t.status === "paid").length;
    const pending = filteredTx.filter(t => t.status === "pending").length;
    const revenue = filteredTx.filter(t => t.status === "paid").reduce((s, t) => s + Number(t.amount || 0) / 100, 0);
    return { total, paid, pending, revenue };
  }, [filteredTx]);

  // ---------- UI ----------
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-300">Carregando...</div>;

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Painel Admin</h1>
              <p className="text-xs text-slate-400">Acesso restrito</p>
            </div>
          </div>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
            className="w-full mb-4 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 outline-none" />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Senha</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
            className="w-full mb-6 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 outline-none" />
          <button disabled={signingIn} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg disabled:opacity-50">
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
          {session && !isAdmin && (
            <p className="text-red-400 text-xs mt-4 text-center">Esta conta não tem permissão de admin.</p>
          )}
        </form>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "attribution", label: "Setor Face ou Google", icon: Activity },
    { id: "utmify", label: "Utmify", icon: Send },
    { id: "receipts", label: "Comprovantes", icon: FileText },
    { id: "visitors", label: "Visitantes", icon: Users },
    { id: "security", label: "Segurança", icon: Shield },
    { id: "apis", label: "APIs CPF", icon: Activity },
    { id: "settings", label: "Configurações", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Celimax · Painel Admin</h1>
              <p className="text-xs text-slate-400">{session.user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-bold">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 flex overflow-x-auto gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap",
                tab === t.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {tab === "attribution" && (
          <div className="mb-6">
            <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} dateRange={dateRange} setDateRange={setDateRange} onRefresh={fetchAll} />
          </div>
        )}
        {tab === "dashboard" && (
          <>
            <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} dateRange={dateRange} setDateRange={setDateRange} onRefresh={fetchAll} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card label="Total pedidos" value={String(stats.total)} sub="no período" color="blue" />
              <Card label="Pagos" value={String(stats.paid)} sub={`${stats.total ? Math.round(stats.paid / stats.total * 100) : 0}% conversão`} color="emerald" />
              <Card label="Pendentes" value={String(stats.pending)} sub="aguardando" color="amber" />
              <Card label="Receita" value={`R$ ${stats.revenue.toFixed(2)}`} sub="pagos" color="violet" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold mb-3">Últimos pedidos</h3>
                <div className="space-y-2">
                  {filteredTx.slice(0, 8).map(t => (
                    <div key={t.id} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                      <div>
                        <div className="font-medium">{t.customer_name}</div>
                        <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">R$ {(Number(t.amount)/100).toFixed(2)}</div>
                        <StatusPill status={t.status} />
                      </div>
                    </div>
                  ))}
                  {filteredTx.length === 0 && <p className="text-slate-500 text-sm">Nenhum pedido.</p>}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold mb-3">Tentativas de login recentes</h3>
                <div className="space-y-2">
                  {attempts.slice(0, 8).map(a => (
                    <div key={a.id} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                      <div>
                        <div className="font-medium">{a.email || "—"}</div>
                        <div className="text-xs text-slate-500">{a.ip} · {a.city || a.country || "—"}</div>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", a.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                        {a.success ? "OK" : "FALHA"}
                      </span>
                    </div>
                  ))}
                  {attempts.length === 0 && <p className="text-slate-500 text-sm">Sem tentativas.</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "orders" && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, email, CPF, id..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm">
                <option value="all">Todos os status</option>
                <option value="paid">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <DateFilterBar dateFilter={dateFilter} setDateFilter={setDateFilter} dateRange={dateRange} setDateRange={setDateRange} onRefresh={fetchTransactions} compact />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="text-left px-4 py-3">Cliente</th>
                      <th className="text-left px-4 py-3">Valor</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Data</th>
                      <th className="text-right px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map(t => (
                      <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.customer_name}</div>
                          <div className="text-xs text-slate-500">{t.customer_email}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">R$ {(Number(t.amount)/100).toFixed(2)}</td>
                        <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setSelected(t)} className="text-emerald-400 hover:text-emerald-300 p-1"><Eye className="w-4 h-4" /></button>
                          {t.status !== "paid" && (
                            <button onClick={async () => { await adminAction({ action: "mark_paid", id: t.id }); toast.success("Marcado como pago"); fetchTransactions(); }}
                              className="text-blue-400 hover:text-blue-300 p-1" title="Marcar pago"><CheckCircle2 className="w-4 h-4" /></button>
                          )}
                          <button onClick={async () => { if (confirm("Excluir pedido?")) { await adminAction({ action: "delete_tx", id: t.id }); fetchTransactions(); } }}
                            className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredTx.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "attribution" && (
          <AttributionPanel 
            transactions={transactions} 
            visitors={visitors} 
            setSelected={setSelected}
            adminAction={adminAction}
            fetchTransactions={fetchTransactions}
          />
        )}

        {tab === "utmify" && <UtmifyPanel transactions={transactions} />}

        {tab === "receipts" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-bold mb-4">Comprovantes enviados ({receipts.length})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.map(t => (
                <div key={t.id} className="border border-slate-800 rounded-lg p-4">
                  <div className="font-medium">{t.customer_name}</div>
                  <div className="text-xs text-slate-500 mb-2">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                  <div className="text-sm mb-3">R$ {(Number(t.amount)/100).toFixed(2)} · <StatusPill status={t.status} /></div>
                  <button onClick={() => openReceipt(t.comprovante_url)}
                    className="text-emerald-400 text-sm hover:underline">Ver comprovante →</button>
                </div>
              ))}
              {receipts.length === 0 && <p className="text-slate-500 col-span-full text-center py-8">Nenhum comprovante ainda.</p>}
            </div>
          </div>
        )}

        {receiptUrl && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setReceiptUrl(null)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold">Comprovante</h2>
                <div className="flex items-center gap-3">
                  <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-400 text-sm hover:underline">Abrir em nova aba</a>
                  <button onClick={() => setReceiptUrl(null)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
              </div>
              <div className="p-4">
                {/\.pdf(\?|$)/i.test(receiptUrl)
                  ? <iframe src={receiptUrl} className="w-full h-[70vh] rounded-lg bg-white" title="Comprovante" />
                  : <img src={receiptUrl} alt="Comprovante enviado pelo cliente" className="w-full rounded-lg" />}
              </div>
            </div>
          </div>
        )}

        {tab === "visitors" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-bold">Visitantes ({offerVisitors.length})</h3>
              <button onClick={fetchVisitors} className="text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3">IP</th>
                    <th className="text-left px-4 py-3">Local</th>
                    <th className="text-left px-4 py-3">Dispositivo</th>
                    <th className="text-left px-4 py-3">Página</th>
                    <th className="text-left px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {offerVisitors.map(v => (
                    <tr key={v.id} onClick={() => setVisSelected(v)} className="border-t border-slate-800 hover:bg-slate-800/30 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs">{v.ip || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3">{v.device} · {v.browser}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">{v.path}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "security" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-bold">Tentativas de acesso ao /acessar</h3>
              <p className="text-xs text-slate-400 mt-1">Todas as tentativas de login são registradas, incluindo IP, senha usada, dispositivo e localização.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">E-mail</th>
                    <th className="text-left px-4 py-3">Senha tentada</th>
                    <th className="text-left px-4 py-3">IP · Local</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a.id} onClick={() => setAttSelected(a)} className="border-t border-slate-800 hover:bg-slate-800/30 cursor-pointer">
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">{a.email || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-amber-300">{a.attempted_password || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono">{a.ip || "—"}</div>
                        <div className="text-slate-500">{[a.city, a.country].filter(Boolean).join(", ")}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                          a.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                          {a.success ? "SUCESSO" : "FALHA"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Sem tentativas registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "apis" && <ApiStatusPanel />}

        {tab === "settings" && <SettingsPanel adminAction={adminAction} />}
      </main>

      {/* Modais */}
      {selected && <OrderModal tx={selected} onClose={() => setSelected(null)} adminAction={adminAction} onChange={fetchTransactions} />}
      {visSelected && <VisitorModal v={visSelected} onClose={() => setVisSelected(null)} />}
      {attSelected && <AttemptModal a={attSelected} onClose={() => setAttSelected(null)} />}

      <Toaster position="top-right" richColors />
    </div>
  );
}

function DateFilterBar({ dateFilter, setDateFilter, dateRange, setDateRange, onRefresh, compact }: any) {
  return (
    <div className={cn("flex flex-wrap gap-2 items-center", compact ? "" : "mb-4")}>
      {(["all", "today", "yesterday", "last7days"] as const).map(f => (
        <button key={f} onClick={() => setDateFilter(f)}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-bold",
            dateFilter === f ? "bg-emerald-500 text-slate-950" : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800")}>
          {f === "all" ? "Todos" : f === "today" ? "Hoje" : f === "yesterday" ? "Ontem" : "7 dias"}
        </button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn("px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1",
            dateFilter === "custom" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800")}>
            <CalendarIcon className="w-3 h-3" />
            {dateFilter === "custom" && dateRange.from ? format(dateRange.from, "dd/MM", { locale: ptBR }) + (dateRange.to ? "-" + format(dateRange.to, "dd/MM", { locale: ptBR }) : "") : "Calendário"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={dateRange as any} onSelect={(r: any) => { setDateRange(r || {}); if (r?.from) setDateFilter("custom"); }} locale={ptBR} />
        </PopoverContent>
      </Popover>
      {onRefresh && (
        <button onClick={onRefresh} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function Card({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: any = {
    emerald: "border-l-emerald-500", amber: "border-l-amber-500",
    blue: "border-l-blue-500", violet: "border-l-violet-500",
  };
  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-800 border-l-4 ${colors[color]} p-4`}>
      <div className="text-xs text-slate-400 uppercase font-bold">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: any = {
    paid: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", map[status] || "bg-slate-700 text-slate-300")}>{status}</span>;
}

function OrderModal({ tx, onClose, adminAction, onChange }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold">Detalhes do pedido</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Nome" value={tx.customer_name} />
            <Info label="E-mail" value={tx.customer_email} />
            <Info label="Telefone" value={tx.customer_phone} />
            <Info label="CPF" value={tx.customer_cpf} />
            <Info label="IP" value={tx.customer_ip} mono />
            <Info label="Método" value={tx.payment_method} />
            <Info label="Gateway" value={tx.gateway} />
            <Info label="Valor" value={`R$ ${(Number(tx.amount)/100).toFixed(2)}`} />
            <Info label="Status" value={tx.status} />
            <Info label="Transaction ID" value={tx.transaction_id} mono />
          </div>
          {tx.tracking_json && (
            <div>
              <div className="text-xs text-slate-400 uppercase mb-1">UTMs / Tracking</div>
              <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto text-emerald-400">{JSON.stringify(tx.tracking_json, null, 2)}</pre>
            </div>
          )}
          {tx.items_json && (
            <div>
              <div className="text-xs text-slate-400 uppercase mb-1">Itens</div>
              <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(tx.items_json, null, 2)}</pre>
            </div>
          )}
          {tx.customer_address && (
            <div>
              <div className="text-xs text-slate-400 uppercase mb-1">Endereço</div>
              <pre className="bg-slate-950 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(tx.customer_address, null, 2)}</pre>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
            {tx.status !== "paid" && (
              <button onClick={async () => { await adminAction({ action: "mark_paid", id: tx.id }); toast.success("Pago"); onChange(); onClose(); }}
                className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg">Marcar pago</button>
            )}
            {tx.comprovante_url && (
              <button onClick={async () => { const r = await adminAction({ action: "sign_receipt", path: tx.comprovante_url }); if (r?.url) window.open(r.url, "_blank"); else toast.error(r?.error || "Não foi possível abrir o comprovante"); }}
                className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg">Ver comprovante</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitorModal({ v, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold">Visitante</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Data" value={new Date(v.created_at).toLocaleString("pt-BR")} />
          <Info label="IP" value={v.ip} mono />
          <Info label="País" value={v.country} />
          <Info label="Região" value={v.region} />
          <Info label="Cidade" value={v.city} />
          <Info label="ISP" value={v.isp} />
          <Info label="Dispositivo" value={`${v.device} · ${v.os} · ${v.browser}`} />
          <Info label="Mobile" value={v.is_mobile ? "Sim" : "Não"} />
          <Info label="Página" value={v.path} />
          <Info label="Referrer" value={v.referrer} />
          <Info label="UTM Source" value={v.utm_source} />
          <Info label="UTM Campaign" value={v.utm_campaign} />
        </div>
        {v.latitude && v.longitude && (
          <div className="px-5 pb-5">
            <a target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
              <MapPin className="w-4 h-4" /> Ver no mapa
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptModal({ a, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold">Tentativa de login</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Data" value={new Date(a.created_at).toLocaleString("pt-BR")} />
          <Info label="Sucesso" value={a.success ? "Sim" : "Não"} />
          <Info label="E-mail" value={a.email} />
          <Info label="Senha usada" value={a.attempted_password} mono />
          <Info label="IP" value={a.ip} mono />
          <Info label="País" value={a.country} />
          <Info label="Região" value={a.region} />
          <Info label="Cidade" value={a.city} />
        </div>
        <div className="px-5 pb-5">
          <div className="text-xs text-slate-400 uppercase mb-1">User-Agent</div>
          <pre className="bg-slate-950 p-3 rounded text-xs break-all whitespace-pre-wrap">{a.user_agent || "—"}</pre>
          {a.error_message && (
            <>
              <div className="text-xs text-slate-400 uppercase mb-1 mt-3">Erro</div>
              <pre className="bg-slate-950 p-3 rounded text-xs text-red-400">{a.error_message}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div className={cn("font-medium break-all", mono && "font-mono text-xs")}>{value || "—"}</div>
    </div>
  );
}

function SettingsPanel({ adminAction }: any) {
  const [gateway, setGateway] = useState("legacy");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "payment_gateway").maybeSingle();
      if (data?.value) setGateway(data.value);
    })();
  }, []);
  const save = async () => {
    setSaving(true);
    // Grava direto pelo cliente autenticado (RLS de admin) e confirma o valor salvo
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key: "payment_gateway", value: gateway, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      // fallback pelo backend admin
      try {
        await adminAction({ action: "set_setting", key: "payment_gateway", value: gateway });
      } catch (e: any) {
        setSaving(false);
        toast.error("Erro ao salvar: " + (error.message || e?.message));
        return;
      }
    }
    const { data: check } = await (supabase as any)
      .from("site_settings").select("value").eq("key", "payment_gateway").maybeSingle();
    setSaving(false);
    if (check?.value === gateway) toast.success(`Gateway salvo: ${gateway}`);
    else toast.error("Não foi possível salvar o gateway");
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-xl">
      <h3 className="font-bold mb-4">Gateway de pagamento</h3>
      <select value={gateway} onChange={e => setGateway(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm mb-4">
        <option value="legacy">Legacy (padrão)</option>
        <option value="freepay">FreePay</option>
      </select>
      <button onClick={save} disabled={saving}
        className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-lg disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

function ApiStatusPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/public/api-status", { cache: "no-store" });
      const j = await r.json();
      setData(j);
      setLastCheck(new Date());
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 900_000);
    return () => clearInterval(id);
  }, []);

  const results: any[] = data?.results || [];
  const onCount = results.filter(r => r.ok).length;
  const offCount = results.length - onCount;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="text-sm text-slate-400">
          CPF de teste: <span className="text-slate-200 font-mono">{data?.test_cpf || "000.000.002-72"}</span>
        </div>
        <div className="text-xs text-slate-500">
          {lastCheck ? `Última checagem: ${format(lastCheck, "HH:mm:ss")}` : "Carregando..."} · auto a cada 15min
        </div>
        <button onClick={load} disabled={loading}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Testar agora
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Total APIs" value={String(results.length)} sub="monitoradas" color="blue" />
        <Card label="Online" value={String(onCount)} sub="respondendo" color="emerald" />
        <Card label="Offline" value={String(offCount)} sub="com falha" color="amber" />
        <Card label="Uptime" value={`${results.length ? Math.round(onCount / results.length * 100) : 0}%`} sub="agora" color="violet" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-slate-400 text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">API</th>
              <th className="px-4 py-3 text-left">Latência</th>
              <th className="px-4 py-3 text-left">Retorno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                    r.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", r.ok ? "bg-emerald-400" : "bg-red-400")} />
                    {r.ok ? "ON" : "OFF"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">{r.label}</td>
                <td className="px-4 py-3 text-slate-400">{r.ms}ms{r.status ? ` · HTTP ${r.status}` : ""}</td>
                <td className="px-4 py-3 text-slate-500 truncate max-w-[400px]" title={r.sample || r.message}>
                  {r.ok ? (r.sample || "OK") : (r.message || "falha")}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                {loading ? "Consultando APIs..." : "Sem dados."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttributionPanel({ transactions, visitors, setSelected, adminAction, fetchTransactions }: any) {
  const [sourceFilter, setSourceFilter] = useState<"all" | "google" | "facebook">("all");

  const stats = useMemo(() => {
    const getParam = (path: string, key: string) => {
      try {
        const query = path.includes("?") ? path.slice(path.indexOf("?") + 1) : path;
        return new URLSearchParams(query).get(key);
      } catch {
        return null;
      }
    };

    const findMatchingVisitor = (tx: any) => {
      const tracking = tx.tracking_json || {};
      const txDate = new Date(tx.created_at).getTime();
      const sessionId = tracking.visitor_session_id;
      const clickId = tracking.gclid || tracking.gbraid || tracking.wbraid || tracking.fbclid;

      const candidates = visitors.filter((v: any) => {
        const path = v.path || "";
        if (sessionId && v.session_id === sessionId) return true;
        if (clickId && ["gclid", "gbraid", "wbraid", "fbclid"].some(key => getParam(path, key) === clickId)) return true;
        const usableIp = tx.customer_ip && tx.customer_ip !== "127.0.0.1" && tx.customer_ip !== "::1";
        const visitDate = new Date(v.created_at).getTime();
        return usableIp && v.ip === tx.customer_ip && visitDate <= txDate + 600000 && visitDate >= txDate - 10800000;
      });
      return candidates.sort((a: any, b: any) => {
        const aPath = a.path || "";
        const bPath = b.path || "";
        const aExactSession = sessionId && a.session_id === sessionId ? 1 : 0;
        const bExactSession = sessionId && b.session_id === sessionId ? 1 : 0;
        const aGoogleId = /^2\d{10}$/.test(getParam(aPath, "gad_campaignid") || "") ? 1 : 0;
        const bGoogleId = /^2\d{10}$/.test(getParam(bPath, "gad_campaignid") || "") ? 1 : 0;
        const aExactClick = clickId && ["gclid", "gbraid", "wbraid", "fbclid"].some(key => getParam(aPath, key) === clickId) ? 1 : 0;
        const bExactClick = clickId && ["gclid", "gbraid", "wbraid", "fbclid"].some(key => getParam(bPath, key) === clickId) ? 1 : 0;
        return (bExactSession - aExactSession) || (bExactClick - aExactClick) || (bGoogleId - aGoogleId) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      })[0];
    };

    const getSource = (tx: any, visitor: any) => {
      const tracking = tx.tracking_json || {};
      const utmSource = String(tracking.utm_source || "").toLowerCase();
      const visitorPath = visitor?.path || "";
      const visitorSource = String(visitor?.utm_source || getParam(visitorPath, "utm_source") || "").toLowerCase();
      const explicitSource = `${utmSource} ${visitorSource}`;
      const hasFacebookClick = !!(tracking.fbclid || getParam(visitorPath, "fbclid"));
      const hasGoogle = !!(tracking.gclid || tracking.gbraid || tracking.wbraid || tracking.gad_campaignid || getParam(visitorPath, "gclid") || getParam(visitorPath, "gbraid") || getParam(visitorPath, "wbraid") || getParam(visitorPath, "gad_campaignid"));

      // IDs 120... de utm_id/campanha são do Meta e nunca identificam Google.
      if (explicitSource.includes("facebook") || explicitSource.includes("instagram") || /(^|\s)fb/.test(explicitSource)) return "facebook";
      if (explicitSource.includes("google") || explicitSource.includes("gads") || hasGoogle) return "google";
      if (hasFacebookClick) return "facebook";
      return "other";
    };

    const google = { total: 0, paid: 0, revenue: 0, orders: [] as any[] };
    const facebook = { total: 0, paid: 0, revenue: 0, orders: [] as any[] };
    const other = { total: 0, paid: 0, revenue: 0, orders: [] as any[] };

    transactions.forEach((tx: any) => {
      const matchingVisitor = findMatchingVisitor(tx);
      const src = getSource(tx, matchingVisitor);
      const amount = Number(tx.amount || 0) / 100;
      const isPaid = tx.status === "paid";

      // O ID de campanha Google válido vem exclusivamente de gad_campaignid,
      // tem 11 dígitos e começa com 2. Nunca usamos utm_id/campaign_id da Meta.
      const directGoogleId = String(tx.tracking_json?.gad_campaignid || "");
      const visitorGoogleId = String(getParam(matchingVisitor?.path || "", "gad_campaignid") || "");
      const displayCampaignId = src === "google"
        ? (/^2\d{10}$/.test(directGoogleId) ? directGoogleId : (/^2\d{10}$/.test(visitorGoogleId) ? visitorGoogleId : null))
        : null;

      const enhancedTx = { ...tx, displayCampaignId };

      if (src === "google") {
        google.total++;
        if (isPaid) { google.paid++; google.revenue += amount; }
        google.orders.push({ ...enhancedTx, source: "Google" });
      } else if (src === "facebook") {
        facebook.total++;
        if (isPaid) { facebook.paid++; facebook.revenue += amount; }
        facebook.orders.push({ ...enhancedTx, source: "Facebook" });
      } else {
        other.total++;
        if (isPaid) { other.paid++; other.revenue += amount; }
        other.orders.push({ ...enhancedTx, source: "Outros" });
      }
    });

    return { google, facebook, other };
  }, [transactions, visitors]);

  const allOrders = useMemo(() => {
    let list = [...stats.google.orders, ...stats.facebook.orders, ...stats.other.orders];
    if (sourceFilter === "google") list = stats.google.orders;
    if (sourceFilter === "facebook") list = stats.facebook.orders;
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [stats, sourceFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-blue-500 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-blue-400">GOOGLE ADS</h3>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Gerados</div>
              <div className="text-xl font-bold">{stats.google.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Pagos</div>
              <div className="text-xl font-bold text-emerald-400">{stats.google.paid}</div>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Receita</div>
              <div className="text-lg font-bold">R$ {stats.google.revenue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-emerald-400">FACEBOOK ADS</h3>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Gerados</div>
              <div className="text-xl font-bold">{stats.facebook.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Pagos</div>
              <div className="text-xl font-bold text-emerald-400">{stats.facebook.paid}</div>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Receita</div>
              <div className="text-lg font-bold">R$ {stats.facebook.revenue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-slate-500 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-400">OUTROS / DIRETO</h3>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Gerados</div>
              <div className="text-xl font-bold">{stats.other.total}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Pagos</div>
              <div className="text-xl font-bold text-emerald-400">{stats.other.paid}</div>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Receita</div>
              <div className="text-lg font-bold">R$ {stats.other.revenue.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold">Lista de Pedidos por Origem</h3>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setSourceFilter("all")}
                className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", sourceFilter === "all" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
              >Todos</button>
              <button 
                onClick={() => setSourceFilter("google")}
                className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", sourceFilter === "google" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200")}
              >Google</button>
              <button 
                onClick={() => setSourceFilter("facebook")}
                className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", sourceFilter === "facebook" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200")}
              >Facebook</button>
            </div>
          </div>
          <div className="text-xs text-slate-500">Exibindo {allOrders.length} pedidos filtrados</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allOrders.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      t.source === "Google" ? "bg-blue-500/20 text-blue-400" :
                      t.source === "Facebook" ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-slate-700 text-slate-300"
                    )}>
                      {t.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.customer_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {t.customer_email}
                      {t.displayCampaignId && (
                        <span className="block text-blue-400">ID Camp: {t.displayCampaignId}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold">R$ {(Number(t.amount)/100).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(t)} className="text-emerald-400 hover:text-emerald-300 p-1"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UtmifyPanel({ transactions }: { transactions: any[] }) {
  const resend = useServerFn(resendToUtmify);
  const [sending, setSending] = useState<string | null>(null);

  const handleResend = async (txId: string) => {
    setSending(txId);
    try {
      const results = await resend({ data: { transactionIds: [txId] } });
      if (results && results[0]?.ok) {
        toast.success("Enviado com sucesso!");
      } else {
        toast.error("Falha ao enviar (verifique o token Utmify)");
      }
    } catch (e: any) {
      console.error("Resend error:", e);
      toast.error(e.message || "Erro no servidor");
    } finally {
      setSending(null);
    }
  };

  const handleResendAllPending = async () => {
    const pendingIds = transactions
      .filter(t => t.status === "pending")
      .slice(0, 20)
      .map(t => t.transaction_id);
    
    if (pendingIds.length === 0) {
      toast.info("Nenhum pedido pendente recente");
      return;
    }

    setSending("all");
    try {
      const results = await resend({ data: { transactionIds: pendingIds } });
      const successCount = results.filter(r => r.ok).length;
      toast.success(`${successCount} pedidos reenviados`);
    } catch (e) {
      toast.error("Erro ao reenviar lote");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Integração Utmify</h3>
          <p className="text-sm text-slate-400">Gerencie o envio de vendas para a Utmify</p>
        </div>
        <button 
          onClick={handleResendAllPending}
          disabled={sending === "all"}
          className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
        >
          {sending === "all" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Reenviar 20 últimos pendentes
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold">Pedidos Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {transactions.slice(0, 50).map(t => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.customer_name}</div>
                    <div className="text-[10px] text-slate-500">{t.transaction_id}</div>
                  </td>
                  <td className="px-4 py-3 font-bold">R$ {(Number(t.amount)/100).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleResend(t.transaction_id)}
                      disabled={sending === t.transaction_id}
                      className="text-emerald-400 hover:bg-emerald-400/10 p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Reenviar para Utmify"
                    >
                      {sending === t.transaction_id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
