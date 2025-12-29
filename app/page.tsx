'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function GSAFlowV152() {
  // --- ESTADOS GLOBAIS ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);

  // --- ESTADOS DE INTERFACE ---
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoParcelas, setNovoParcelas] = useState(1);
  const [novoComprovante, setNovoComprovante] = useState('');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [editNomeEmpresa, setEditNomeEmpresa] = useState('');
  const [editMeta, setEditMeta] = useState(0);
  const [novaCatInput, setNovaCatInput] = useState('');

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- SINCRONIZAÇÃO DE DADOS ---
  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', session.user.id).single();
        
        if (prof) {
          setPerfil(prof);
          setEditNomeEmpresa(prof.nome_empresa);
          setEditMeta(prof.meta_faturamento);
        } else {
          const dataExp = new Date(); dataExp.setDate(dataExp.getDate() + 3);
          const { data: nProf } = await supabase.from('perfis_usuarios').insert({ 
            id: session.user.id, 
            expira_em: dataExp.toISOString(),
            nome_empresa: 'Gomes Serviços Ágeis',
            categorias: ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'],
            meta_faturamento: 10000
          }).select().single();
          if (nProf) setPerfil(nProf);
        }
        carregarLancamentos();
      }
      setLoading(false);
    };
    sessionInit();
  }, []);

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  // --- LÓGICA DA TRAVA SINCRONIZADA ---
  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const hoje = new Date();
  const dataExpiracao = perfil?.expira_em ? new Date(perfil.expira_em) : null;
  
  // Só valida bloqueio se o perfil já foi carregado
  const deveBloquear = user && !isAdmin && perfil && (dataExpiracao && hoje > dataExpiracao);

  console.log("📊 MONITORAMENTO GSA:", { usuario: user?.email, perfilAtivo: !!perfil, bloquear: deveBloquear });

  async function atualizarPerfil() {
    if (!user) return;
    const { error } = await supabase.from('perfis_usuarios').update({ 
      nome_empresa: editNomeEmpresa, meta_faturamento: editMeta, categorias: perfil.categorias 
    }).eq('id', user.id);
    if (!error) {
      setPerfil({ ...perfil, nome_empresa: editNomeEmpresa, meta_faturamento: editMeta });
      setMostrarConfig(false);
    }
  }

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor || !user) return;
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

  // --- ESTADO DE CARREGAMENTO ---
  if (loading || (user && !perfil && !isAdmin)) {
    return <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic tracking-widest">GSA FLOW: SINCRONIZANDO...</div>;
  }

  // --- TELA DE BLOQUEIO ---
  if (deveBloquear) {
    return (
      <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center font-sans overflow-hidden">
        <div className="bg-zinc-900 border border-red-500/40 p-10 rounded-[3.5rem] w-full max-w-md shadow-[0_0_60px_rgba(239,68,68,0.2)] backdrop-blur-xl relative z-10">
          <div className="text-7xl mb-6">🔒</div>
          <h2 className="text-3xl font-black text-red-500 uppercase italic mb-4 tracking-tighter">Acesso Expirado</h2>
          <p className="text-zinc-500 text-sm mb-10 leading-relaxed font-medium italic">
            Sua licença para o cockpit expirou em {dataExpiracao?.toLocaleDateString('pt-BR')}. <br/>
            Reative agora para continuar seus lançamentos.
          </p>
          <div className="space-y-4">
            <a href="https://www.mercadopago.com.br" className="block bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95">Renovar Agora</a>
            <button onClick={() => window.location.reload()} className="text-zinc-600 text-[10px] font-black uppercase underline hover:text-white transition-colors">Confirmar Pagamento</button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN ---
  if (!user) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] w-full max-w-md shadow-2xl backdrop-blur-xl">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase tracking-tighter leading-none">GSA FLOW</h1>
        <p className="text-zinc-600 text-[9px] font-bold uppercase mb-10 tracking-[0.4em]">Business Intelligence</p>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}); if (error) alert(error.message); else window.location.reload(); }} className="space-y-4 text-left">
          <input type="email" placeholder="E-mail" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20">{isSignUp ? 'Criar Conta' : 'Acessar Cockpit'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-600 text-[9px] font-black uppercase tracking-widest">{isSignUp ? 'Já tem conta? Login' : 'Novo por aqui? Criar Acesso'}</button>
      </div>
    </div>
  );

  // --- LOGICA DE DADOS DO COCKPIT ---
  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const itensAtrasadosGeral = lancamentos.filter(i => i.status !== 'confirmado' && new Date(i.data_vencimento + 'T00:00:00') < hoje);
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });
  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const porcentagemMeta = (perfil?.meta_faturamento > 0) ? Math.round((totalReceitas / perfil.meta_faturamento) * 100) : 0;
  const gastosPorCategoria = perfil?.categorias?.map((cat: string) => ({
    name: cat,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat).reduce((acc, i) => acc + (Number(i.valor) || 0), 0)
  })).filter((item: any) => item.value > 0) || [];

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

  // --- RENDER DO COCKPIT ---
  return (
    <div className="min-h-screen bg-[#06080a] text-zinc-300 p-4 sm:p-8 font-sans text-sm pb-24 overflow-x-hidden">
      
      {/* MODAL CONFIGURAÇÃO */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-[3rem] w-full max-w-lg shadow-2xl relative">
            <h2 className="text-xl font-black text-blue-500 uppercase italic mb-8 tracking-tighter">Cockpit Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 block font-sans">Nome da Empresa</label>
                <input type="text" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500/50" value={editNomeEmpresa} onChange={e => setEditNomeEmpresa(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 block font-sans">Meta Mensal (R$)</label>
                <input type="number" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500/50 font-mono" value={editMeta} onChange={e => setEditMeta(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2 block font-sans">Gerenciar Categorias</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-black/40 p-3 rounded-xl border border-white/5 text-xs text-white" value={novaCatInput} onChange={e => setNovaCatInput(e.target.value)} placeholder="Nova..." />
                  <button onClick={() => { if(novaCatInput) { setPerfil({...perfil, categorias: [...perfil.categorias, novaCatInput]}); setNovaCatInput(''); } }} className="bg-blue-600 px-4 rounded-xl font-black shadow-lg shadow-blue-600/20">+</button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                  {perfil?.categorias?.map((cat: string) => (
                    <span key={cat} className="bg-zinc-800/50 border border-white/5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase">{cat} <button onClick={() => setPerfil({...perfil, categorias: perfil.categorias.filter((c: string) => c !== cat)})} className="text-red-500 ml-1 hover:text-white transition-colors">×</button></span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-10">
              <button onClick={atualizarPerfil} className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 italic transition-all hover:bg-blue-500">Gravar Alterações</button>
              <button onClick={() => setMostrarConfig(false)} className="bg-zinc-800 text-zinc-400 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Sair</button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA GLOBAL */}
      {itensAtrasadosGeral.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-600/10 border border-red-500/30 p-4 rounded-3xl flex justify-between items-center gap-4 backdrop-blur-md shadow-lg shadow-red-900/10">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 font-sans">Pendências Críticas: {itensAtrasadosGeral.length} vencidos.</p>
           </div>
           <button onClick={() => setDataVisualizacao(new Date(itensAtrasadosGeral[0].data_vencimento + 'T00:00:00'))} className="bg-red-600 text-white px-4 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95">Resolver</button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-7xl mx-auto gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-500 italic uppercase leading-none tracking-tighter">GSA FLOW</h1>
          <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.4em] mt-1 italic">{perfil?.nome_empresa}</p>
        </div>
        
        <div className="flex gap-4 items-center bg-zinc-900/40 p-2 px-6 rounded-full border border-white/5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() - 1)))} className="hover:text-white transition-colors">◀</button>
                <span className="min-w-[140px] text-center text-zinc-200 uppercase">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</span>
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() + 1)))} className="hover:text-white transition-colors">▶</button>
            </div>
            <div className="w-[1px] h-4 bg-white/10 mx-2" />
            <button onClick={() => setMostrarConfig(true)} className="text-lg hover:rotate-90 transition-all duration-500 cursor-pointer">⚙️</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-[9px] font-black uppercase text-zinc-600 hover:text-red-400 transition-colors font-sans">Sair</button>
        </div>
      </header>

      {/* CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md"><p className="text-blue-500 text-[8px] font-black uppercase mb-1 tracking-widest font-sans">Entradas</p><h2 className="text-2xl font-black italic text-white">{formatarMoeda(totalReceitas)}</h2></div>
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md"><p className="text-red-500 text-[8px] font-black uppercase mb-1 tracking-widest font-sans">Saídas</p><h2 className="text-2xl font-black italic text-white">{formatarMoeda(totalDespesas)}</h2></div>
        <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] shadow-xl backdrop-blur-md"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1 tracking-widest font-sans">Saldo Previsto</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroLiquido)}</h2></div>
        <div className="bg-zinc-900/10 border border-dashed border-white/10 p-6 rounded-[2.5rem] flex items-center justify-center text-center backdrop-blur-sm"><p className="text-zinc-700 text-[8px] font-black uppercase italic tracking-widest font-sans">Meta Alvo: <br/>{formatarMoeda(perfil?.meta_faturamento || 0)}</p></div>
      </div>

      {/* TRIPLE COCKPIT */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* BATERIA */}
        <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] h-[320px] flex flex-col items-center justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest font-sans">Battery Status</p>
            <div className="relative w-16 h-44 bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex flex-col-reverse shadow-inner">
                <div className="w-full bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]" style={{ height: `${Math.min(porcentagemMeta, 100)}%` }} />
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-xl font-black italic mix-blend-difference">{porcentagemMeta}%</span></div>
            </div>
            <p className="text-blue-500/40 text-[8px] font-black uppercase tracking-widest italic tracking-[0.2em] font-sans">Efficiency Status</p>
        </div>

        {/* TENDÊNCIA */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] h-[320px] shadow-2xl flex flex-col backdrop-blur-md">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-6 text-center font-sans">Cashflow Trend (5M)</p>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosCincoMeses}>
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '15px', color: '#fff' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '10px' }} />
                        <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} stroke="#444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* PIZZA */}
        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] h-[320px] shadow-2xl flex flex-col items-center overflow-hidden backdrop-blur-md">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-4 text-center font-sans">Mix Categorias</p>
            <div className="flex-1 w-full relative">
                {gastosPorCategoria.length > 0 ? (
                    <>
                    <ResponsiveContainer width="100%" height="70%">
                        <PieChart>
                            <Pie data={gastosPorCategoria} innerRadius={45} outerRadius={60} paddingAngle={8} dataKey="value" stroke="none">
                                {gastosPorCategoria.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '15px', color: '#fff' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                        {gastosPorCategoria.map((entry: any, index: number) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CORES[index % CORES.length] }} />
                                <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-400">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                    </>
                ) : ( <div className="h-full flex items-center justify-center text-zinc-800 text-[8px] font-black uppercase tracking-widest italic font-sans">Sem dados</div> )}
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
            {perfil?.categorias?.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-400 font-black outline-none" value={novoParcelas} onChange={e => setNovoParcelas(Number(e.target.value))}>
            <option value={1}>Único</option><option value={2}>2x</option><option value={6}>6x</option><option value={12}>12x</option>
          </select>
          <input type="text" placeholder="Recibo" className="bg-black/40 p-3 h-12 rounded-2xl border border-white/5 text-xs text-zinc-500 outline-none" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="text" placeholder="Descrição" className="bg-black/40 p-4 h-14 rounded-2xl border border-white/5 text-xs text-white outline-none focus:border-blue-500/30 font-sans" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-black/40 p-4 h-14 rounded-2xl border border-white/5 text-xs text-white outline-none font-mono focus:border-blue-500/30" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 text-white font-black h-14 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all italic active:scale-95">Lançar no Cockpit</button>
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="max-w-7xl mx-auto space-y-3 mb-20">
        {lancamentosDoMes.map((item) => {
          const eConfirmado = item.status === 'confirmado';
          const estaAtrasado = !eConfirmado && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-[2.5rem] border transition-all duration-300 gap-4 shadow-xl ${eConfirmado ? 'bg-black/20 border-white/5 opacity-50' : estaAtrasado ? 'bg-red-500/5 border-red-500/30 animate-pulse-slow' : 'bg-zinc-900/20 border-white/5 hover:bg-zinc-900/40'}`}>
              <div className="flex items-center gap-4 w-full">
                <span className={`text-[10px] font-mono px-4 py-2 rounded-xl font-bold min-w-[65px] text-center ${estaAtrasado ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-500'}`}>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div className="truncate"><p className={`font-bold text-base tracking-tight truncate max-w-[200px] sm:max-w-md ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>{item.descricao}</p><p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mt-1 italic font-sans">{item.categoria}</p></div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-white/5 pt-4 sm:pt-0 sm:border-none">
                <span className={`font-black text-lg tracking-tighter ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>{item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}</span>
                <div className="flex gap-4">
                    {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all font-sans">Pagar</button>}
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