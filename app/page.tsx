'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

// 🌐 DICIONÁRIO GLOBAL GSA
const translations: any = {
  'pt-BR': {
    welcome: 'Cockpit Financeiro',
    incomes: 'Entradas',
    expenses: 'Saídas',
    result: 'Resultado',
    goal: 'Meta Mensal',
    locked: 'Acesso Suspenso',
    subscribe: 'Assinar Mensal (Cartão)',
    pay30: 'Pagar 30 dias (Pix/Boleto)',
    pending: 'contas atrasadas',
    category: 'Categoria',
    description: 'Descrição',
    value: 'Valor',
    launch: 'Lançar no Cockpit',
    settings: 'Configurações',
    logout: 'Sair'
  },
  'en-US': {
    welcome: 'Financial Cockpit',
    incomes: 'Incomes',
    expenses: 'Expenses',
    result: 'Net Profit',
    goal: 'Monthly Goal',
    locked: 'Access Suspended',
    subscribe: 'Monthly Subscription (Card)',
    pay30: 'Pay 30 days (One-time)',
    pending: 'overdue bills',
    category: 'Category',
    description: 'Description',
    value: 'Value',
    launch: 'Launch to Cockpit',
    settings: 'Settings',
    logout: 'Logout'
  }
};

export default function GSAFlowGlobal() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('pt-BR');
  const [currency, setCurrency] = useState('BRL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState({ 
    nome_empresa: 'GSA FLOW', 
    meta_faturamento: 10000, 
    categorias: ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'],
    expira_em: null as string | null
  });

  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<'mes' | 'ano'>('mes');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Estados de Cadastro
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoComprovante, setNovoComprovante] = useState('');

  useEffect(() => {
    // 🌍 DETECÇÃO DE LOCALIZAÇÃO
    const userLocale = navigator.language || 'pt-BR';
    setLang(translations[userLocale] ? userLocale : 'en-US');
    setCurrency(userLocale.includes('BR') ? 'BRL' : 'USD');

    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) carregarDadosSaaS(session.user.id);
      setLoading(false);
    };
    sessionInit();
  }, []);

  // 💰 FORMATADOR DE MOEDA INTERNACIONAL
  const fmt = (val: number) => {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: currency,
    }).format(val);
  };

  const t = translations[lang] || translations['en-US'];

  async function carregarDadosSaaS(userId: string) {
    let { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', userId).single();
    if (prof) setPerfil(prof);
    else {
      const dataExp = new Date(); dataExp.setDate(dataExp.getDate() + 3);
      const { data: nProf } = await supabase.from('perfis_usuarios').insert({ 
        id: userId, expira_em: dataExp.toISOString() 
      }).select().single();
      if (nProf) setPerfil(nProf);
    }
    carregarLancamentos();
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  const handleAuth = async (e: any) => {
    e.preventDefault();
    const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password});
    if (error) alert(error.message); else window.location.reload();
  };

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const payload = { descricao: novaDescricao, valor: Number(novoValor), tipo: novoTipo, data_vencimento: novaData, categoria: novaCategoria, user_id: user.id };
    if (idEmEdicao) await supabase.from('lancamentos').update(payload).eq('id', idEmEdicao);
    else await supabase.from('lancamentos').insert(payload);
    setNovaDescricao(''); setNovoValor(''); carregarLancamentos();
  };

  if (loading) return <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic">GSA FLOW GLOBAL</div>;

  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const assinaturaVencida = !isAdmin && perfil.expira_em && new Date(perfil.expira_em) < new Date();

  if (user && assinaturaVencida) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="bg-zinc-900 border border-red-500/50 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
          <div className="text-5xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-red-500 uppercase italic mb-2 tracking-tighter">{t.locked}</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed"><strong>{perfil.nome_empresa}</strong></p>
          <div className="space-y-3">
            <a href="https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=eb0e8f15cbbd4be085473bca86164037" className="block bg-blue-600 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:bg-blue-500">{t.subscribe}</a>
            <a href="https://mpago.li/1fcbewH" className="block bg-zinc-800 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-zinc-700 hover:bg-zinc-700">{t.pay30}</a>
          </div>
          <button onClick={() => window.location.reload()} className="mt-8 text-blue-500 text-[10px] font-black uppercase underline">I already paid / Já paguei</button>
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase tracking-tighter">GSA FLOW</h1>
        <p className="text-zinc-600 text-[9px] font-bold uppercase mb-10 tracking-[0.3em]">Global Business Intelligence</p>
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">{isSignUp ? 'Create Account' : 'Login'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-500 text-[9px] font-black uppercase tracking-widest">{isSignUp ? 'Login' : 'Register Free'}</button>
      </div>
    </div>
  );

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });
  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-6xl mx-auto gap-4">
        <div>
            <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic uppercase leading-none">{perfil.nome_empresa}</h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase mt-2 tracking-[0.2em]">{t.welcome}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setMostrarConfig(true)} className="p-2 bg-zinc-900 rounded-full border border-zinc-800">⚙️</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="px-4 py-2 bg-zinc-900 rounded-full text-[9px] font-black uppercase text-zinc-600">{t.logout}</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]"><p className="text-blue-400 text-[8px] font-black uppercase mb-1">{t.incomes}</p><h2 className="text-2xl font-black italic">{fmt(totalReceitas)}</h2></div>
        <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem]"><p className="text-red-400 text-[8px] font-black uppercase mb-1">{t.expenses}</p><h2 className="text-2xl font-black italic">{fmt(totalDespesas)}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1">{t.result}</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(lucroLiquido)}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-[2rem] border-dashed text-center"><p className="text-zinc-600 text-[8px] font-black uppercase mb-1">{t.goal}</p><h2 className="text-2xl font-black italic text-zinc-400">{fmt(perfil.meta_faturamento)}</h2></div>
      </div>

      {/* FORMULÁRIO E LISTA CONTINUAM AQUI... */}
      <div className="max-w-6xl mx-auto p-8 bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] text-center italic font-black text-zinc-700 uppercase tracking-widest">
         GSA FLOW GLOBAL SYSTEM ACTIVE
      </div>
    </div>
  );
}