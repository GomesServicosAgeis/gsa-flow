'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

export default function GSAFlowSaaS() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Estados do Sistema
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState({ 
    nome_empresa: 'GSA FLOW', 
    meta_faturamento: 10000, 
    categorias: ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'] 
  });
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<'mes' | 'ano'>('mes');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');

  // Estados de Cadastro de Lançamento
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novaRecorrencia, setNovaRecorrencia] = useState('unico');
  const [novoComprovante, setNovoComprovante] = useState('');

  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) carregarDadosSaaS(session.user.id);
      setLoading(false);
    };
    sessionInit();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
    }
  }, []);

  async function carregarDadosSaaS(userId: string) {
    let { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', userId).single();
    
    if (prof) {
      setPerfil(prof);
    } else {
      // Configuração padrão para NOVOS USUÁRIOS
      const categoriasPadrao = ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'];
      const { data: novoProf } = await supabase.from('perfis_usuarios').insert({ 
        id: userId, 
        nome_empresa: 'Meu Negócio', 
        meta_faturamento: 10000,
        categorias: categoriasPadrao
      }).select().single();
      
      if (novoProf) setPerfil(novoProf);
    }
    carregarLancamentos();
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) {
      setLancamentos(data.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password }) 
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
  };

  const mudarMes = (direcao: number) => {
    const nova = new Date(dataVisualizacao);
    nova.setMonth(nova.getMonth() + direcao);
    setDataVisualizacao(nova);
  };

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const valorNum = Number(novoValor);
    const payload = { 
        descricao: novaDescricao, valor: valorNum, tipo: novoTipo, 
        data_vencimento: novaData, categoria: novaCategoria, 
        comprovante_url: novoComprovante, user_id: user.id 
    };

    if (idEmEdicao) {
      await supabase.from('lancamentos').update(payload).eq('id', idEmEdicao);
      setIdEmEdicao(null);
    } else {
      const registros = [];
      if (novaRecorrencia === 'mensal') {
        for (let i = 0; i < 12; i++) {
          const d = new Date(novaData + 'T00:00:00');
          d.setMonth(d.getMonth() + i);
          registros.push({ ...payload, descricao: `${novaDescricao} (${i + 1}/12)`, data_vencimento: d.toISOString().split('T')[0], recorrencia: 'mensal', status: 'agendado' });
        }
      } else {
        registros.push({ ...payload, status: 'agendado', recorrencia: 'unico' });
      }
      await supabase.from('lancamentos').insert(registros);
    }
    setNovaDescricao(''); setNovoValor(''); setNovoComprovante(''); carregarLancamentos();
  };

  const exportarCSV = () => {
    try {
      const fields = ['data_vencimento', 'descricao', 'valor', 'tipo', 'categoria', 'status'];
      const parser = new Parser({ fields, delimiter: ';' });
      const csv = parser.parse(lancamentosExibidos);
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `RELATORIO_${perfil.nome_empresa}.csv`);
      link.click();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-blue-500 font-black italic animate-pulse text-2xl uppercase">GSA FLOW</div>;

  if (!user) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white font-sans">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md shadow-2xl text-center">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase tracking-tighter leading-none">GSA FLOW</h1>
        <p className="text-zinc-600 text-[9px] font-bold uppercase mb-10 tracking-[0.3em]">SaaS Business Intelligence</p>
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <input type="email" placeholder="Seu E-mail" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-blue-500 transition-all text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Sua Senha" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 outline-none focus:border-blue-500 transition-all text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black p-4 rounded-2xl transition-all uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20">
            {isSignUp ? 'Criar Conta Grátis' : 'Acessar Meu Cockpit'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-500 text-[9px] font-black uppercase hover:text-white transition-all tracking-widest">
          {isSignUp ? 'Já tem uma conta? Login' : 'Não tem conta? Registre-se agora'}
        </button>
      </div>
    </div>
  );

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  
  const itensAtrasadosGeral = lancamentos.filter(i => i.status === 'agendado' && new Date(i.data_vencimento + 'T00:00:00') < hoje);
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });
  const lancamentosExibidos = filtroCategoria === 'Todas' ? lancamentosDoMes : lancamentosDoMes.filter(i => i.categoria === filtroCategoria);

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  const gastosPorCategoria = perfil.categorias.map(cat => ({
    name: cat,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat).reduce((acc, i) => acc + Number(i.valor), 0)
  })).filter(item => item.value > 0);

  const dadosAnuais = Array.from({ length: 12 }, (_, i) => {
    const mesItems = lancamentos.filter(l => new Date(l.data_vencimento + 'T00:00:00').getMonth() === i && new Date(l.data_vencimento + 'T00:00:00').getFullYear() === anoVis);
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(anoVis, i)),
      receita: mesItems.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + Number(l.valor), 0),
      despesa: mesItems.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + Number(l.valor), 0)
    };
  });

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24">
      
      {/* ALERTA DE ATRASO GLOBAL */}
      {itensAtrasadosGeral.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 bg-red-600/10 border border-red-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse-slow">
           <div className="flex items-center gap-3"><span className="text-xl">⚠️</span><p className="text-xs font-bold">Olá {perfil.nome_empresa}! Há {itensAtrasadosGeral.length} pendências fora do prazo.</p></div>
           <button onClick={() => setDataVisualizacao(new Date(itensAtrasadosGeral[0].data_vencimento + 'T00:00:00'))} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-red-600/20">Resolver Atrasos</button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-6xl mx-auto gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic uppercase leading-none">{perfil.nome_empresa}</h1>
            <div className="flex items-center gap-4 mt-2 text-zinc-500">
                <button onClick={() => mudarMes(-1)} className="hover:text-blue-500 transition-colors">◀</button>
                <p className="text-[10px] font-black uppercase tracking-widest min-w-[140px] text-center">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</p>
                <button onClick={() => mudarMes(1)} className="hover:text-blue-500 transition-colors">▶</button>
            </div>
        </div>
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-full border border-zinc-800">
          <button onClick={() => setAbaAtiva('mes')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all ${abaAtiva === 'mes' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Mensal</button>
          <button onClick={() => setAbaAtiva('ano')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all ${abaAtiva === 'ano' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Anual</button>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-zinc-600 hover:text-white text-[9px] font-black uppercase bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 transition-all">Sair</button>
      </header>

      {abaAtiva === 'mes' ? (
        <>
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center sm:text-left">
            <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]"><p className="text-blue-400 text-[8px] font-black uppercase mb-1">Entradas</p><h2 className="text-2xl font-black italic">R$ {totalReceitas.toLocaleString('pt-BR')}</h2></div>
            <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem]"><p className="text-red-400 text-[8px] font-black uppercase mb-1">Saídas</p><h2 className="text-2xl font-black italic">R$ {totalDespesas.toLocaleString('pt-BR')}</h2></div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1">Resultado</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {lucroLiquido.toLocaleString('pt-BR')}</h2></div>
            <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-[2rem] border-dashed"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1">Meta</p><h2 className="text-2xl font-black italic text-zinc-400">R$ {perfil.meta_faturamento}</h2></div>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2rem] flex flex-col justify-center">
                <p className="text-blue-400 text-[10px] font-black uppercase mb-4 tracking-widest text-center">Progresso Faturamento</p>
                <div className="w-full bg-zinc-950 h-5 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${Math.min((totalReceitas / perfil.meta_faturamento) * 100, 100)}%` }} />
                </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[280px] flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, bottom: 20, left: 0, right: 0 }}>
                  <Pie data={gastosPorCategoria} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                    {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#a1a1aa', fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-6xl mx-auto bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2.5rem] mb-10 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosAnuais} margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
              <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className={`max-w-6xl mx-auto p-6 rounded-[2.5rem] border mb-10 transition-all ${idEmEdicao ? 'bg-blue-600/10 border-blue-500' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${novoTipo === 'entrada' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Receita</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${novoTipo === 'saida' ? 'bg-red-600 text-white' : 'text-zinc-600'}`}>Saída</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white uppercase font-black" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {perfil.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs font-bold text-white uppercase" value={novaRecorrencia} onChange={e => setNovaRecorrencia(e.target.value)} disabled={!!idEmEdicao}>
            <option value="unico">Pagamento Único</option>
            <option value="mensal">Recorrência Mensal</option>
          </select>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <input type="text" placeholder="Descrição rápida" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white lg:col-span-1" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor R$" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 outline-none font-mono text-xs text-white" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <input type="text" placeholder="Link do comprovante" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all">
            {idEmEdicao ? 'Confirmar' : 'Lançar'}
          </button>
        </div>
      </div>

      {/* FILTROS E LISTAGEM */}
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-4 gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
              <button onClick={() => setFiltroCategoria('Todas')} className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border transition-all ${filtroCategoria === 'Todas' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}>Todas</button>
              {perfil.categorias.map(cat => (
                <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[8px] font-black uppercase border transition-all ${filtroCategoria === cat ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-800 text-zinc-500'}`}>{cat}</button>
              ))}
            </div>
            <button onClick={exportarCSV} className="text-zinc-500 hover:text-white transition-all text-xl p-2 bg-zinc-900 border border-zinc-800 rounded-xl">📥</button>
        </div>

        {lancamentosExibidos.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/10 border border-zinc-800/50 rounded-[2rem] text-zinc-700 font-black uppercase text-[10px] tracking-[0.4em]">Nenhum registro encontrado</div>
        )}

        {lancamentosExibidos.map((item) => {
          const estaAtrasado = item.status === 'agendado' && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          const eConfirmado = item.status === 'confirmado';
          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-center p-5 rounded-[1.8rem] border transition-all gap-4 ${eConfirmado ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60' : estaAtrasado ? 'bg-red-500/10 border-red-500/40 animate-pulse-slow' : 'bg-zinc-900/10 border-zinc-800/40 hover:bg-zinc-900/20'}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className={`text-[9px] font-mono px-3 py-1.5 rounded-lg ${eConfirmado ? 'bg-zinc-800 text-zinc-600' : estaAtrasado ? 'bg-red-600 text-white' : 'bg-zinc-800/50 text-zinc-500'}`}>
                    {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                </span>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate max-w-[200px] sm:max-w-[300px] ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.descricao}</p>
                    {item.comprovante_url && <a href={item.comprovante_url} target="_blank" className="text-[10px] hover:scale-125 transition-transform">📎</a>}
                  </div>
                  <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{item.categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-zinc-800/50 w-full">
                <span className={`font-black text-lg tracking-tighter ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>
                    {item.tipo === 'entrada' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR')}
                </span>
                <div className="flex gap-2">
                  {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[8px] font-black px-4 py-2 rounded-full hover:bg-blue-500 hover:text-white transition-all uppercase leading-none h-8 shadow-md">Confirmar</button>}
                  <button onClick={() => { setIdEmEdicao(item.id); setNovaDescricao(item.descricao); setNovoValor(item.valor.toString()); setNovaData(item.data_vencimento); setNovoTipo(item.tipo); setNovaCategoria(item.categoria); setNovoComprovante(item.comprovante_url || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-zinc-600 hover:text-white p-2">✏️</button>
                  <button onClick={async () => { if(confirm('Remover?')) { await supabase.from('lancamentos').delete().eq('id', item.id); carregarLancamentos(); } }} className="text-zinc-800 hover:text-red-500 p-2">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{` @keyframes pulse-slow { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); } 50% { border-color: rgba(239, 68, 68, 0.8); } } .animate-pulse-slow { animation: pulse-slow 3s infinite; } `}</style>
    </div>
  );
}