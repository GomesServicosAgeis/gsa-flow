'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Home() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');

  async function carregarDados() {
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .order('data_vencimento', { ascending: false });
    
    if (data) setLancamentos(data);
  }

  useEffect(() => { carregarDados(); }, []);

  const adicionarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const { error } = await supabase.from('lancamentos').insert([{ 
      descricao: novaDescricao, valor: Number(novoValor), tipo: novoTipo, status: 'agendado', data_vencimento: novaData
    }]);
    if (!error) { setNovaDescricao(''); setNovoValor(''); carregarDados(); }
  }

  const confirmarItem = async (id: string) => {
    await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', id);
    carregarDados();
  }

  const deletarItem = async (id: string) => {
    await supabase.from('lancamentos').delete().eq('id', id);
    carregarDados();
  }

  const totalReceitas = lancamentos.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentos.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const saldoPrevisto = totalReceitas - totalDespesas;
  const saldoCaixa = lancamentos.reduce((acc, item) => item.status === 'agendado' ? acc : (item.tipo === 'entrada' ? acc + Number(item.valor) : acc - Number(item.valor)), 0);

  const dadosGrafico = [
    { name: 'Receitas', value: totalReceitas },
    { name: 'Despesas', value: totalDespesas },
  ];
  const CORES = ['#3b82f6', '#ef4444'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic">GSA FLOW</h1>
        <div className="bg-zinc-900 px-4 py-1.5 rounded-full text-[10px] border border-zinc-800 uppercase font-bold tracking-widest text-zinc-400">
          PRO - Danilo Gomes
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2rem]">
            <p className="text-blue-400 text-[10px] font-black uppercase mb-2 tracking-widest">Previsão Faturamento</p>
            <h2 className="text-5xl font-black tracking-tighter">{saldoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem]">
            <p className="text-zinc-500 text-[10px] font-black uppercase mb-2 tracking-widest">Saldo em Caixa</p>
            <h2 className={`text-5xl font-black tracking-tighter ${saldoCaixa >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {saldoCaixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h2>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[250px] flex flex-col items-center">
          <p className="text-zinc-500 text-[10px] font-black uppercase mb-2">Saúde Financeira</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dadosGrafico} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                {dadosGrafico.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800/50 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex bg-zinc-950 rounded-xl p-1">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[10px] font-black ${novoTipo === 'entrada' ? 'bg-blue-600' : 'text-zinc-600 hover:text-zinc-400'}`}>RECEITA</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[10px] font-black ${novoTipo === 'saida' ? 'bg-red-600' : 'text-zinc-600 hover:text-zinc-400'}`}>DESPESA</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-zinc-300 focus:border-blue-500" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-zinc-300 md:col-span-1 focus:border-blue-500" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-zinc-300 focus:border-blue-500 font-mono" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={adicionarLancamento} className="bg-blue-600 text-white font-black p-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 uppercase text-xs">Lançar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-3 pb-20">
        <h3 className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Agenda do Mês</h3>
        {lancamentos.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-zinc-900/20 p-5 rounded-2xl border border-zinc-800 group hover:bg-zinc-900/50 transition-all">
            <div className="flex items-center gap-6">
              {/* DATA COM COR ZINC-400 (Cinza Médio Legível) */}
              <span className="text-[11px] font-bold text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/30 tracking-tight">
                {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
              <div>
                <p className="font-semibold text-zinc-200">{item.descricao}</p>
                <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{item.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`font-black text-xl tracking-tighter ${item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>
                {item.tipo === 'entrada' ? '+' : '-'} {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="flex gap-2">
                {item.status === 'agendado' && (
                  <button onClick={() => confirmarItem(item.id)} className="bg-zinc-100 text-black text-[9px] font-black px-4 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all">CONFIRMAR</button>
                )}
                <button onClick={() => deletarItem(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}