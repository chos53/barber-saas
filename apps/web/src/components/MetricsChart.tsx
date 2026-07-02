"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MetricsChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { month: 'short' })} />
        <YAxis />
        <Tooltip formatter={(value) => `R$ ${value}`} />
        <Legend />
        <Bar dataKey="mrr_real" name="MRR Real" fill="#10b981" stackId="a" />
        <Bar dataKey="mrr_potencial" name="MRR Potencial" fill="#94a3b8" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}