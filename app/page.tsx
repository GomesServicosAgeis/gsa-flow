'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

export default function GSAFlowV133() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoParcelas, setNovoParcelas] = useState(1);
  const [novoComprovante, setNovoComprovante] = useState('');

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  // FUNÇÃO DE FORMATAÇÃO MONETÁRIA BRASILEIRA
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) carregarDadosSaaS(session.user.id);
      setLoading(false);
    };
    sessionInit();
  }, []);

  async function carregarDadosSaaS(userId: string) {
    let { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', userId).single();
    if (prof) setPerfil(prof);
    carregarLancamentos();
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const valLimpo = Number(novoValor.toString().replace(',', '.'));
    const dataBase = new Date(novaData + 'T00:00:00');

    if (idEmEdicao) {
        await supabase.from('lancamentos').update({ 
            descricao: novaDescricao, valor: valLimpo, tipo: novoTipo, 
            data_vencimento: novaData, categoria: novaCategoria, 
            user_id: user.id, comprovante_url: novoComprovante || null
        }).eq('id', idEmEdicao);
    } else {
        const novos = [];
        for (let i = 0; i < novoParcelas; i++) {
            const d = new Date(dataBase); d.setMonth(dataBase.getMonth() + i);
            novos.push({
                descricao: `${novaDescricao} ${novoParcelas > 1 ? `(${i + 1}/${novoParcelas})` : ''}`.trim(),
                valor: valLimpo, tipo: novoTipo, data_vencimento: d.toISOString().split('T')[0],
                categoria: novaCategoria, user_id: user.id, status: 'agendado',
                comprovante_url: novoComprovante || null
            });
        }
        await supabase.from('lancamentos').insert(novos);
    }
    setNovaDescricao(''); setNovoValor(''); setIdEmEdicao(null); setNovoParcelas(1); setNovoComprovante(''); carregarLancamentos();
  };

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const porcentagemMeta = perfil.meta_faturamento > 0 ? Math.round((totalReceitas / perfil.meta_faturamento) * 100) : 0;

  const gastosPorCategoria = perfil.categorias.map(cat => ({
    name: cat,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat).reduce((acc, i) => acc + (Number(i.valor) || 0), 0)
  })).filter(item => item.value > 0);

  const dadosCincoMeses = Array.from({ length: 5 }, (_, i) => {
    const offset = i - 2;
    const dataRef = new Date(anoVis, mesVis + offset, 1);
    const mIdx = dataRef.getMonth();
    const aIdx = dataRef.getFullYear();
    const mesItems = lancamentos.filter(l => {
        const d = new Date(l.data_vencimento + 'T00:00:00');
        return d.getMonth() === mIdx && d.getFullYear() === aIdx;
    });
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(dataRef),
      receita: mesItems.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + (Number(l.valor) || 0), 0),
      despesa: mesItems.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
    };
  });

  if (!user && !loading) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-black text-blue-500 mb-10 italic uppercase">GSA FLOW</h1>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}); if (error) alert(error.message); else window.location.reload(); }} className="space-y-4">
          <input type="email" placeholder="E-mail" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">Acessar Cockpit</button>
        </form>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic">GSA FLOW</div>;

  return (
    <div className="min-h-screen bg-[#06080a] text-zinc-300 p-4 sm:p-8 font-sans text-sm pb-24 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-7xl mx-auto gap-4">
        <h1 className="text-3xl font-black text-blue-500 italic uppercase">GSA FLOW</h1>
        <div className="flex gap-4 items-center bg-zinc-900/40 p-2 px-6 rounded-full border border-white/5">
            <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() - 1)))}>◀</button>
                <span className="min-w-[140px] text-center text-zinc-200">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</span>
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() + 1)))}>▶</button>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-[9px] font-black uppercase text-zinc-600">Sair</button>
        </div>
      </header>

      {/* CARDS VALORES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl"><p className="text-blue-500 text-[8px] font-black uppercase mb-1">Entradas</p><h2 className="text-2xl font-black italic text-white">{formatarMoeda(totalReceitas)}</h2></div>
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl"><p className="text-red-500 text-[8px] font-black uppercase mb-1">Saídas</p><h2 className="text-2xl font-black italic text-white">{formatarMoeda(totalDespesas)}</h2></div>
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1">Saldo Previsto</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroLiquido)}</h2></div>
        <div className="bg-zinc-900/10 border border-dashed border-white/10 p-6 rounded-[2.5rem] flex items-center justify-center text-center"><p className="text-zinc-700 text-[8px] font-black uppercase italic tracking-widest">Meta: <br/>{formatarMoeda(perfil.meta_faturamento)}</p></div>
      </div>

      {/* TRIPLE COCKPIT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* BATERIA */}
        <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] h-[320px] flex flex-col items-center justify-between shadow-2xl">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Battery Meta</p>
            <div className="relative w-16 h-44 bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex flex-col-reverse shadow-inner">
                <div 
                    className="w-full bg-gradient-to-t from-blue-700 to-blue-400 transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    style={{ height: `${Math.min(porcentagemMeta, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-xl font-black italic mix-blend-difference">{porcentagemMeta}%</span></div>
            </div>
            <p className="text-blue-500/50 text-[8px] font-black uppercase tracking-widest italic tracking-[0.2em]">Efficiency Status</p>
        </div>

        {/* TENDÊNCIA */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] h-[320px] shadow-2xl flex flex-col">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-6 text-center">Cashflow Trend</p>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosCincoMeses}>
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px', fontSize: '10px' }} />
                        <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} stroke="#444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* PIZZA (FIX LEGEND COLOR) */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] h-[320px] shadow-2xl flex flex-col items-center">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-4 text-center">Mix Categorias</p>
            <div className="flex-1 w-full">
                {gastosPorCategoria.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={gastosPorCategoria} innerRadius={55} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                                {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '9px' }} />
                            {/* CORREÇÃO DEFINITIVA DA COR DA LEGENDA */}
                            <Legend 
                                verticalAlign="bottom" 
                                formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-800 text-[8px] font-black uppercase tracking-widest italic">No Data</div>
                )}
            </div>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className={`max-w-7xl mx-auto p-6 rounded-[3rem] border backdrop-blur-sm mb-10 shadow-2xl transition-all duration-500 ${idEmEdicao ? 'bg-blue-600/5 border-blue-500/50' : 'bg-zinc-900/20 border-white/5'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="flex bg-black/40 rounded-2xl p-1 h-12 border border-white/5">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-xl text-[9px] font-black uppercase transition-all ${novoTipo === 'entrada' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-600'}`}>Receita</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-xl text-[9px] font-black uppercase transition-all ${novoTipo === 'saida' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-600'}`}>Saída</button>
          </div>
          <input type="date" className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-400 outline-none" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-400 font-black uppercase outline-none" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {perfil.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-400 font-black outline-none" value={novoParcelas} onChange={e => setNovoParcelas(Number(e.target.value))}>
            <option value={1}>Único</option><option value={2}>Repetir 2x</option><option value={6}>6x</option><option value={12}>12x</option>
          </select>
          <input type="text" placeholder="Link Comprovante" className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-500 outline-none" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="text" placeholder="Descrição" className="bg-black/40 p-4 h-14 rounded-2xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/30" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-black/40 p-4 h-14 rounded-2xl border border-white/5 text-xs text-white outline-none font-mono focus:border-blue-500/30" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 text-white font-black h-14 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all italic">Lançar no Cockpit</button>
        </div>
      </div>

      {/* LISTAGEM MOBILE RESPONSIVE */}
      <div className="max-w-7xl mx-auto space-y-3 mb-20">
        {lancamentosDoMes.map((item) => {
          const eConfirmado = item.status === 'confirmado';
          const estaAtrasado = !eConfirmado && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-[2.5rem] border transition-all duration-300 gap-4 shadow-xl ${eConfirmado ? 'bg-black/20 border-white/5 opacity-50' : estaAtrasado ? 'bg-red-500/5 border-red-500/30 animate-pulse-slow' : 'bg-zinc-900/20 border-white/5 hover:bg-zinc-900/40'}`}>
              <div className="flex items-center gap-4 w-full">
                <span className={`text-[10px] font-mono px-4 py-2 rounded-xl font-bold min-w-[65px] text-center ${estaAtrasado ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-500'}`}>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div className="truncate">
                  <p className={`font-bold text-base tracking-tight truncate max-w-[200px] sm:max-w-md ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>{item.descricao}</p>
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mt-1 italic">{item.categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-white/5 pt-4 sm:pt-0 sm:border-none">
                <span className={`font-black text-lg tracking-tighter ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>{item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}</span>
                <div className="flex gap-4">
                    {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-xl hover:bg-blue-600 hover:text-white transition-all">Pagar</button>}
                    <button onClick={() => { setIdEmEdicao(item.id); setNovaDescricao(item.descricao); setNovoValor(item.valor.toString()); setNovaData(item.data_vencimento); setNovoTipo(item.tipo); setNovaCategoria(item.categoria); setNovoComprovante(item.comprovante_url || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-zinc-700 hover:text-white transition-colors text-xl">✏️</button>
                    <button onClick={async () => { if(confirm('Remover?')) { await supabase.from('lancamentos').delete().eq('id', item.id); carregarLancamentos(); } }} className="text-zinc-800 hover:text-red-500 transition-colors text-xl">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse-red { 0%, 100% { border-color: rgba(239, 68, 68, 0.2); } 50% { border-color: rgba(239, 68, 68, 0.5); } }
        .animate-pulse-slow { animation: pulse-red 2s infinite; }
      `}</style>
    </div>
  );
}