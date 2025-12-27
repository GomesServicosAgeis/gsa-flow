'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORIAS_OPCOES = [
  { label: '🏷️ Geral', value: 'Geral' },
  { label: '🚀 Marketing', value: 'Marketing' },
  { label: '💻 Software/SaaS', value: 'Software' },
  { label: '🏠 Infraestrutura', value: 'Infra' },
  { label: '👤 Pessoal/Pró-labore', value: 'Pessoal' },
  { label: '🛡️ Impostos', value: 'Impostos' },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [metaMensal, setMetaMensal] = useState(10000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Geral');
  const [novaRecorrencia, setNovaRecorrencia] = useState('unico');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) carregarDados();
    };
    checkUser();
    const metaSalva = localStorage.getItem('gsa_flow_meta');
    if (metaSalva) setMetaMensal(Number(metaSalva));
  }, []);

  const salvarMeta = (valor: string) => {
    const num = Number(valor);
    setMetaMensal(num);
    localStorage.setItem('gsa_flow_meta', valor);
  };

  async function carregarDados() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) {
      const ordenados = data.sort((a, b) => {
        const hojeSort = new Date();
        hojeSort.setHours(0, 0, 0, 0);
        const dataA = new Date(a.data_vencimento);
        const dataB = new Date(b.data_vencimento);
        if (a.status === 'confirmado' && b.status !== 'confirmado') return 1;
        if (a.status !== 'confirmado' && b.status === 'confirmado') return -1;
        return dataA.getTime() - dataB.getTime();
      });
      setLancamentos(ordenados);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erro no login: " + error.message);
    else window.location.reload();
  };

  const adicionarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;

    const valorNum = Number(novoValor);
    const registros = [];

    if (novaRecorrencia === 'mensal') {
      // Gera para os próximos 12 meses
      for (let i = 0; i < 12; i++) {
        const dataBase = new Date(novaData + 'T00:00:00');
        dataBase.setMonth(dataBase.getMonth() + i);
        registros.push({
          descricao: `${novaDescricao} (${i + 1}/12)`,
          valor: valorNum,
          tipo: novoTipo,
          status: 'agendado',
          data_vencimento: dataBase.toISOString().split('T')[0],
          categoria: novaCategoria,
          recorrencia: 'mensal'
        });
      }
    } else {
      registros.push({
        descricao: novaDescricao,
        valor: valorNum,
        tipo: novoTipo,
        status: 'agendado',
        data_vencimento: novaData,
        categoria: novaCategoria,
        recorrencia: 'unico'
      });
    }

    const { error } = await supabase.from('lancamentos').insert(registros);
    if (!error) {
      setNovaDescricao('');
      setNovoValor('');
      carregarDados();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 font-sans">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-black text-blue-500 mb-2 italic tracking-tighter text-center uppercase">GSA FLOW</h1>
          <p className="text-zinc-500 text-[9px] mb-8 uppercase font-black tracking-[0.3em] text-center">Gestão de Fluxo • GSA</p>
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4 outline-none text-white" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 outline-none text-white" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-xl hover:bg-blue-500 transition-all uppercase text-xs">Entrar</button>
        </form>
      </div>
    );
  }

  const mesAtual = new Date().getUTCMonth();
  const anoAtual = new Date().getUTCFullYear();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento);
    return d.getUTCMonth() === mesAtual && d.getUTCFullYear() === anoAtual;
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const saldoCaixaGeral = lancamentos.reduce((acc, item) => item.status === 'agendado' ? acc : (item.tipo === 'entrada' ? acc + Number(item.valor) : acc - Number(item.valor)), 0);
  const progressoMeta = Math.min((totalReceitas / metaMensal) * 100, 100);

  const gastosPorCategoria = CATEGORIAS_OPCOES.map(cat => ({
    name: cat.label,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat.value).reduce((acc, i) => acc + Number(i.valor), 0)
  })).filter(item => item.value > 0);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <div>
            <h1 className="text-2xl sm:text-3xl font-black text-blue-500 tracking-tighter italic uppercase">GSA FLOW</h1>
            <p className="text-[8px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-zinc-600 hover:text-white transition-all text-[9px] font-black uppercase bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">Sair</button>
      </header>

      {/* CARDS RESUMO */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-blue-600/10 border border-blue-500/20 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
          <p className="text-blue-400 text-[8px] font-black mb-1 tracking-widest uppercase">Receita</p>
          <h2 className="text-xl sm:text-3xl font-black tracking-tighter truncate">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
        <div className="bg-red-600/10 border border-red-500/20 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
          <p className="text-red-400 text-[8px] font-black mb-1 tracking-widest uppercase">Despesa</p>
          <h2 className="text-xl sm:text-3xl font-black tracking-tighter truncate">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
          <p className="text-zinc-500 text-[8px] font-black mb-1 tracking-widest uppercase">Lucro</p>
          <h2 className={`text-xl sm:text-3xl font-black tracking-tighter truncate ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h2>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/50 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-dashed">
          <p className="text-zinc-600 text-[8px] font-black mb-1 tracking-widest uppercase">Saldo Total</p>
          <h2 className="text-xl sm:text-3xl font-black tracking-tighter text-zinc-400 truncate">{saldoCaixaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
      </div>

      {/* META E GRÁFICO */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-6 sm:p-8 rounded-[2rem] flex flex-col justify-center">
            <div className="flex justify-between items-end mb-4">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Objetivo do Mês</p>
                {editandoMeta ? (
                    <input autoFocus type="number" className="bg-zinc-950 border border-blue-500 p-1 rounded text-right w-24 outline-none font-mono text-xs text-white" onBlur={() => setEditandoMeta(false)} onChange={(e) => salvarMeta(e.target.value)} value={metaMensal}/>
                ) : (
                    <button onClick={() => setEditandoMeta(true)} className="text-[10px] font-black text-zinc-400 flex items-center gap-2">
                        {metaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ✏️
                    </button>
                )}
            </div>
            <div className="w-full bg-zinc-950 h-5 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${progressoMeta}%` }} />
            </div>
            <p className="mt-2 text-right text-[9px] font-bold text-zinc-500 italic uppercase tracking-tighter">{progressoMeta.toFixed(1)}% alcançado</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[280px] flex flex-col items-center">
          <p className="text-zinc-500 text-[9px] font-black uppercase mb-4">Gastos por Setor</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie data={gastosPorCategoria} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                {gastosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMULÁRIO COM RECORRÊNCIA */}
      <div className="max-w-6xl mx-auto bg-zinc-900/40 p-4 sm:p-6 rounded-[2rem] border border-zinc-800/50 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black transition-all ${novoTipo === 'entrada' ? 'bg-blue-600' : 'text-zinc-600'}`}>RECEITA</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black transition-all ${novoTipo === 'saida' ? 'bg-red-600' : 'text-zinc-600'}`}>DESPESA</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-zinc-300 text-xs" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-zinc-300 text-xs" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {CATEGORIAS_OPCOES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-zinc-300 text-xs font-bold" value={novaRecorrencia} onChange={e => setNovaRecorrencia(e.target.value)}>
            <option value="unico">ÚNICO</option>
            <option value="mensal">MENSAL (12x)</option>
          </select>
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-zinc-300 text-xs" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 outline-none text-zinc-300 font-mono text-xs" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={adicionarLancamento} className="bg-blue-600 text-white font-black h-12 rounded-xl hover:bg-blue-500 transition-all text-[10px] uppercase tracking-widest">Lançar</button>
        </div>
      </div>

      {/* LISTA PRIORIZADA */}
      <div className="max-w-6xl mx-auto space-y-2 pb-20">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 ml-2 italic">Histórico de Fluxo</p>
        {lancamentos.map((item) => {
          const dataVenc = new Date(item.data_vencimento + 'T00:00:00');
          const estaAtrasado = item.status === 'agendado' && dataVenc < hoje;
          const eConfirmado = item.status === 'confirmado';

          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition-all gap-3 sm:gap-0 
              ${eConfirmado 
                ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60 grayscale-[0.5]' 
                : estaAtrasado 
                  ? 'bg-red-500/5 border-red-500/40 animate-pulse-slow' 
                  : 'bg-zinc-900/10 border-zinc-800/40 hover:bg-zinc-900/40'}`}>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className={`text-[9px] font-mono px-2 py-1 rounded ${eConfirmado ? 'bg-zinc-800 text-zinc-500' : estaAtrasado ? 'bg-red-500 text-white' : 'bg-zinc-800/30 text-zinc-500'}`}>
                  {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                </span>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate max-w-[200px] sm:max-w-[300px] ${eConfirmado ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{item.descricao}</p>
                    {item.recorrencia === 'mensal' && <span className="text-[7px] border border-blue-500/30 text-blue-500 px-1 rounded uppercase">Fixo</span>}
                    {estaAtrasado && <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Atrasado</span>}
                  </div>
                  <div className="flex gap-2 items-center text-[8px] font-black uppercase tracking-widest text-zinc-600">
                    <span className={eConfirmado ? 'text-zinc-700' : 'text-blue-500/70'}>{item.categoria}</span>
                    <span>•</span>
                    <span>{item.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t border-zinc-800/30 sm:border-none pt-2 sm:pt-0">
                <span className={`font-black text-base sm:text-lg tracking-tighter ${eConfirmado ? 'text-zinc-600' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>
                  {item.tipo === 'entrada' ? '+' : '-'} {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <div className="flex gap-2">
                  {!eConfirmado && (
                    <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarDados(); }} className="bg-zinc-100 text-black text-[8px] font-black px-3 py-1 rounded-full hover:bg-blue-500 hover:text-white transition-all">OK</button>
                  )}
                  <button onClick={async () => { await supabase.from('lancamentos').delete().eq('id', item.id); carregarDados(); }} className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all text-xs p-1">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 0.8); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}