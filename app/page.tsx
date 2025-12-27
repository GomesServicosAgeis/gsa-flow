'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

const CATEGORIAS_OPCOES = [
  { label: '💰 Recebimentos (Freelancer)', value: 'Freelancer' },
  { label: '👤 Pessoal (Lazer/Saúde)', value: 'Pessoal' },
  { label: '🚗 Transporte (Combustível)', value: 'Transporte' },
  { label: '🏠 Gastos Fixos (Contas)', value: 'Fixos' },
  { label: '📄 Contas a Pagar', value: 'Contas' },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [metaMensal, setMetaMensal] = useState(10000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<'mes' | 'ano'>('mes');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');

  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novaRecorrencia, setNovaRecorrencia] = useState('unico');
  const [novoComprovante, setNovoComprovante] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) carregarDados();
    };
    checkUser();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
    }
    const metaSalva = localStorage.getItem('gsa_flow_meta');
    if (metaSalva) setMetaMensal(Number(metaSalva));
  }, []);

  const solicitarNotificacao = async () => {
    if (!('Notification' in window)) return;
    const permissao = await Notification.requestPermission();
    if (permissao === 'granted') {
      new Notification('GSA FLOW Ativado!', { body: 'Sistema de alertas pronto para uso.', icon: 'https://supabase.com/favicons/favicon-32x32.png' });
    }
  };

  const mudarMes = (direcao: number) => {
    const nova = new Date(dataVisualizacao);
    nova.setMonth(nova.getMonth() + direcao);
    setDataVisualizacao(nova);
  };

  async function carregarDados() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) {
      setLancamentos(data.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
    }
  }

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const valorNum = Number(novoValor);
    const payload = { descricao: novaDescricao, valor: valorNum, tipo: novoTipo, data_vencimento: novaData, categoria: novaCategoria, comprovante_url: novoComprovante };

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
    setNovaDescricao(''); setNovoValor(''); setNovoComprovante(''); carregarDados();
  };

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  
  const itensAtrasadosGeral = lancamentos.filter(i => i.status === 'agendado' && new Date(i.data_vencimento + 'T00:00:00') < hoje);
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });

  const lancamentosExibidos = filtroCategoria === 'Todas' ? lancamentosDoMes : lancamentosDoMes.filter(i => i.categoria === filtroCategoria);

  // Dash Anual
  const dadosAnuais = Array.from({ length: 12 }, (_, i) => {
    const mesItems = lancamentos.filter(l => new Date(l.data_vencimento + 'T00:00:00').getMonth() === i && new Date(l.data_vencimento + 'T00:00:00').getFullYear() === anoVis);
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(anoVis, i)),
      receita: mesItems.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + Number(l.valor), 0),
      despesa: mesItems.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + Number(l.valor), 0)
    };
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const saldoCaixaGeral = lancamentos.reduce((acc, item) => item.status === 'agendado' ? acc : (item.tipo === 'entrada' ? acc + Number(item.valor) : acc - Number(item.valor)), 0);

  const gastosPorCategoria = CATEGORIAS_OPCOES.map(cat => ({
    name: cat.label.split('(')[0].trim(),
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat.value).reduce((acc, i) => acc + Number(i.valor), 0)
  })).filter(item => item.value > 0);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  if (!user) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white">
      <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert(error.message); else window.location.reload(); }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md">
        <h1 className="text-3xl font-black text-blue-500 mb-6 italic text-center uppercase">GSA FLOW</h1>
        <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4 outline-none text-white focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 outline-none text-white focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-xl hover:bg-blue-500 uppercase text-xs">Acessar Cockpit</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24">
      
      {/* HEADER DINÂMICO */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-6xl mx-auto gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-blue-500 tracking-tighter italic uppercase leading-none">GSA FLOW</h1>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-zinc-500">
                <button onClick={() => mudarMes(-1)} className="hover:text-blue-500">◀</button>
                <p className="text-[10px] font-black uppercase tracking-widest min-w-[140px] text-center">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</p>
                <button onClick={() => mudarMes(1)} className="hover:text-blue-500">▶</button>
            </div>
        </div>
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-full border border-zinc-800">
          <button onClick={() => setAbaAtiva('mes')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${abaAtiva === 'mes' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Mensal</button>
          <button onClick={() => setAbaAtiva('ano')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${abaAtiva === 'ano' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Anual {anoVis}</button>
        </div>
        <div className="flex gap-2">
          <button onClick={solicitarNotificacao} className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-blue-500">🔔</button>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-zinc-600 hover:text-white text-[9px] font-black uppercase bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">Sair</button>
        </div>
      </header>

      {abaAtiva === 'mes' ? (
        <>
          {/* CARDS RESUMO MENSAL */}
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 sm:p-6 rounded-[2rem]">
              <p className="text-blue-400 text-[8px] font-black mb-1 uppercase">Entradas</p>
              <h2 className="text-xl sm:text-3xl font-black tracking-tighter">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
            </div>
            <div className="bg-red-600/10 border border-red-500/20 p-4 sm:p-6 rounded-[2rem]">
              <p className="text-red-400 text-[8px] font-black mb-1 uppercase">Saídas</p>
              <h2 className="text-xl sm:text-3xl font-black tracking-tighter">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-6 rounded-[2rem]">
              <p className="text-zinc-500 text-[8px] font-black mb-1 uppercase">Resultado</p>
              <h2 className={`text-xl sm:text-3xl font-black tracking-tighter ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>{lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
            </div>
            <div className="bg-zinc-900 border border-zinc-800/50 p-4 sm:p-6 rounded-[2rem] border-dashed">
              <p className="text-zinc-600 text-[8px] font-black mb-1 uppercase">Caixa Total</p>
              <h2 className="text-xl sm:text-3xl font-black tracking-tighter text-zinc-400">{saldoCaixaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
            </div>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-center">
                <div className="flex justify-between items-end mb-4">
                    <p className="text-blue-400 text-[10px] font-black uppercase">Progresso da Meta</p>
                    <button onClick={() => setEditandoMeta(true)} className="text-[10px] font-black text-zinc-400"> {metaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ✏️ </button>
                </div>
                <div className="w-full bg-zinc-950 h-4 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.min((totalReceitas / metaMensal) * 100, 100)}%` }} />
                </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[250px] flex flex-col items-center">
              <p className="text-zinc-500 text-[9px] font-black uppercase mb-2">Despesas por Categoria</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gastosPorCategoria} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                    {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#a1a1aa', fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        /* DASHBOARD ANUAL */
        <div className="max-w-6xl mx-auto bg-zinc-900/20 border border-zinc-800 p-6 rounded-[2rem] mb-10 h-[400px]">
          <p className="text-blue-400 text-[10px] font-black uppercase mb-6 text-center">Desempenho Anual {anoVis}</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosAnuais}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
              <Legend wrapperStyle={{fontSize: '10px', paddingTop: '20px'}} />
              <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FORMULÁRIO ULTIMATE */}
      <div className={`max-w-6xl mx-auto p-4 sm:p-6 rounded-[2rem] border transition-all mb-10 ${idEmEdicao ? 'bg-blue-600/10 border-blue-500' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black ${novoTipo === 'entrada' ? 'bg-blue-600' : 'text-zinc-600'}`}>RECEITA</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black ${novoTipo === 'saida' ? 'bg-red-600' : 'text-zinc-600'}`}>DESPESA</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {CATEGORIAS_OPCOES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs font-bold text-white" value={novaRecorrencia} onChange={e => setNovaRecorrencia(e.target.value)} disabled={!!idEmEdicao}>
            <option value="unico">PAGAMENTO ÚNICO</option>
            <option value="mensal">RECORRÊNCIA MENSAL</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <input type="text" placeholder="O que é esse lançamento?" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white lg:col-span-1" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor R$" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none font-mono text-xs text-white" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <input type="text" placeholder="Link do Comprovante / Notas" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-xs text-white lg:col-span-1" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
          <button onClick={salvarLancamento} className={`font-black h-12 rounded-xl text-[10px] uppercase text-white transition-all ${idEmEdicao ? 'bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}>{idEmEdicao ? 'Confirmar Edição' : 'Lançar no Fluxo'}</button>
        </div>
      </div>

      {/* FILTROS E LISTA */}
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
              <button onClick={() => setFiltroCategoria('Todas')} className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase border transition-all ${filtroCategoria === 'Todas' ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}>Todas</button>
              {CATEGORIAS_OPCOES.map(cat => (
                <button key={cat.value} onClick={() => setFiltroCategoria(cat.value)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[8px] font-black uppercase border transition-all ${filtroCategoria === cat.value ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-800 text-zinc-500'}`}>{cat.label.split('(')[0]}</button>
              ))}
            </div>
        </div>

        {lancamentosExibidos.map((item) => {
          const estaAtrasado = item.status === 'agendado' && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          const eConfirmado = item.status === 'confirmado';
          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition-all gap-3 ${eConfirmado ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60' : estaAtrasado ? 'bg-red-500/10 border-red-500/40 animate-pulse-slow' : 'bg-zinc-900/10 border-zinc-800/40'}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className={`text-[9px] font-mono px-2 py-1 rounded ${eConfirmado ? 'bg-zinc-800' : estaAtrasado ? 'bg-red-500 text-white' : 'bg-zinc-800/30'}`}>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate max-w-[200px] sm:max-w-[300px] ${eConfirmado ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{item.descricao}</p>
                    {item.comprovante_url && <a href={item.comprovante_url} target="_blank" className="text-[10px] grayscale hover:grayscale-0 transition-all">📎</a>}
                  </div>
                  <div className="flex gap-2 items-center text-[8px] font-black uppercase tracking-widest text-zinc-600"><span>{item.categoria}</span><span>•</span><span>{item.status}</span></div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0">
                <span className={`font-black text-base sm:text-lg tracking-tighter ${eConfirmado ? 'text-zinc-600' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>{item.tipo === 'entrada' ? '+' : '-'} {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <div className="flex gap-2">
                  {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarDados(); }} className="bg-white text-black text-[8px] font-black px-4 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all uppercase">Confirmar</button>}
                  <button onClick={() => { setIdEmEdicao(item.id); setNovaDescricao(item.descricao); setNovoValor(item.valor.toString()); setNovaData(item.data_vencimento); setNovoTipo(item.tipo); setNovaCategoria(item.categoria); setNovoComprovante(item.comprovante_url || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-zinc-600 hover:text-blue-400 p-1">✏️</button>
                  <button onClick={async () => { if(confirm('Excluir?')) { await supabase.from('lancamentos').delete().eq('id', item.id); carregarDados(); } }} className="text-zinc-700 hover:text-red-500 p-1 text-xs">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}