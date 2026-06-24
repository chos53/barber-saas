"use client";

import { useState, useRef } from "react";
import { Save, Image as ImageIcon, MessageSquare, Star, Link as LinkIcon, Settings, Smartphone, Plus, Trash2, Upload } from "lucide-react";

export default function LandingPageEditor() {
  // Referências para os inputs de arquivo abrirem a janela do Windows
  const heroImageRef = useRef<HTMLInputElement>(null);

  // Estados dos formulários
  const [hero, setHero] = useState({ title: "", subtitle: "", image: null as File | null });
  const [cta, setCta] = useState({ text: "", link: "" });
  
  // Lista dinâmica de benefícios
  const [benefits, setBenefits] = useState([{ title: "", description: "" }]);
  
  // Lista dinâmica de prova social (depoimentos)
  const [testimonials, setTestimonials] = useState([{ name: "", role: "", text: "", photo: null as File | null }]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Dados prontos para salvar no banco de dados!");
    console.log({ hero, benefits, testimonials, cta });
  };

  // Funções para adicionar e remover itens das listas
  const addBenefit = () => setBenefits([...benefits, { title: "", description: "" }]);
  const removeBenefit = (index: number) => setBenefits(benefits.filter((_, i) => i !== index));

  const addTestimonial = () => setTestimonials([...testimonials, { name: "", role: "", text: "", photo: null }]);
  const removeTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index));

  return (
    <div className="p-6 max-w-5xl mx-auto bg-zinc-950 min-h-screen rounded-lg text-zinc-100">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Construtor da Landing Page</h1>
          <p className="text-zinc-400 mt-1">Gerencie os textos, imagens e ofertas da sua vitrine do Salonix.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors">
            <Smartphone className="h-4 w-4" />
            Ver Mobile
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 font-bold rounded-md hover:bg-amber-600 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            <Save className="h-4 w-4" />
            Salvar e Publicar
          </button>
        </div>
      </div>

      <form className="space-y-8" onSubmit={handleSave}>
        
        {/* SEÇÃO 1: TÍTULO E SUBTÍTULO */}
        <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
            <Settings className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">1. Textos Principais (Proposta de Valor)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Título Principal</label>
              <input 
                type="text" 
                placeholder="Ex: Gestão premium para Salões e Barbearias"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={hero.title}
                onChange={(e) => setHero({...hero, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Subtítulo</label>
              <textarea 
                rows={3}
                placeholder="Ex: Eleve o nível do seu negócio..."
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={hero.subtitle}
                onChange={(e) => setHero({...hero, subtitle: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Imagem Principal do Sistema (Mockup)</label>
              <input type="file" className="hidden" ref={heroImageRef} accept="image/*" onChange={(e) => setHero({...hero, image: e.target.files?.[0] || null})} />
              <div 
                onClick={() => heroImageRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 bg-zinc-950 rounded-md p-8 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:border-amber-500/50 cursor-pointer transition-colors"
              >
                <ImageIcon className="h-8 w-8 mb-2 text-zinc-400" />
                <span className="text-sm text-zinc-300">{hero.image ? hero.image.name : "Clique para alterar a imagem do sistema"}</span>
                <span className="text-xs mt-1">Formatos aceitos: PNG, JPG, WEBP.</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: BENEFÍCIOS */}
        <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">2. Benefícios e Funcionalidades</h2>
          </div>
          
          <div className="space-y-4 mb-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 items-start bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <div className="flex-1 space-y-3">
                  <input 
                    type="text" placeholder="Nome do Benefício (Ex: Agenda Inteligente)"
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-md text-white outline-none focus:border-amber-500"
                    value={benefit.title}
                    onChange={(e) => {
                      const newBenefits = [...benefits];
                      newBenefits[index].title = e.target.value;
                      setBenefits(newBenefits);
                    }}
                  />
                  <textarea 
                    rows={2} placeholder="Descrição curta do benefício..."
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-md text-white outline-none focus:border-amber-500"
                    value={benefit.description}
                    onChange={(e) => {
                      const newBenefits = [...benefits];
                      newBenefits[index].description = e.target.value;
                      setBenefits(newBenefits);
                    }}
                  />
                </div>
                <button type="button" onClick={() => removeBenefit(index)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addBenefit} className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-md text-zinc-400 hover:text-amber-500 hover:border-amber-500 hover:bg-amber-500/5 transition-all">
            <Plus className="h-4 w-4" /> Adicionar Novo Benefício
          </button>
        </section>

        {/* SEÇÃO 3: PROVA SOCIAL COM FOTO */}
        <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">3. Prova Social (Depoimentos)</h2>
          </div>
          
          <div className="space-y-4 mb-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex flex-col md:flex-row gap-4 items-start">
                {/* Upload Foto do Cliente */}
                <div className="w-full md:w-32 flex-shrink-0">
                  <label className="block text-xs font-medium text-zinc-500 mb-1 text-center">Foto</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 bg-zinc-900 rounded-md cursor-pointer hover:border-amber-500 transition-colors">
                    <Upload className="h-6 w-6 text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-400 text-center px-2">
                      {testimonial.photo ? testimonial.photo.name : "Enviar Imagem"}
                    </span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={(e) => {
                        const newTesti = [...testimonials];
                        newTesti[index].photo = e.target.files?.[0] || null;
                        setTestimonials(newTesti);
                      }} 
                    />
                  </label>
                </div>

                {/* Textos do Depoimento */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex gap-3">
                    <input 
                      type="text" placeholder="Nome (Ex: Carlos)"
                      className="w-1/2 p-2 bg-zinc-900 border border-zinc-800 rounded-md text-white outline-none focus:border-amber-500"
                      value={testimonial.name} onChange={(e) => { const nt = [...testimonials]; nt[index].name = e.target.value; setTestimonials(nt); }}
                    />
                    <input 
                      type="text" placeholder="Cargo (Ex: Barbeiro)"
                      className="w-1/2 p-2 bg-zinc-900 border border-zinc-800 rounded-md text-white outline-none focus:border-amber-500"
                      value={testimonial.role} onChange={(e) => { const nt = [...testimonials]; nt[index].role = e.target.value; setTestimonials(nt); }}
                    />
                  </div>
                  <textarea 
                    rows={2} placeholder="O que o cliente disse..."
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-md text-white outline-none focus:border-amber-500"
                    value={testimonial.text} onChange={(e) => { const nt = [...testimonials]; nt[index].text = e.target.value; setTestimonials(nt); }}
                  />
                </div>

                <button type="button" onClick={() => removeTestimonial(index)} className="p-2 mt-6 text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addTestimonial} className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-md text-zinc-400 hover:text-amber-500 hover:border-amber-500 hover:bg-amber-500/5 transition-all">
            <Plus className="h-4 w-4" /> Adicionar Depoimento
          </button>
        </section>

        {/* SEÇÃO 4: CTA */}
        <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
            <LinkIcon className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">4. Ajuste do CTA (Call-to-Action)</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Texto do Botão Principal</label>
              <input 
                type="text" 
                placeholder="Ex: Começar Teste Grátis"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={cta.text}
                onChange={(e) => setCta({...cta, text: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Link de Destino</label>
              <input 
                type="text" 
                placeholder="Ex: /register"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md text-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={cta.link}
                onChange={(e) => setCta({...cta, link: e.target.value})}
              />
            </div>
          </div>
        </section>

      </form>
    </div>
  );
}