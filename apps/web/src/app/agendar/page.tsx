'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, User, CheckCircle2, Scissors, ChevronRight, ChevronLeft } from 'lucide-react'

type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
}

type Professional = {
  id: string
  name: string
  role: string | null
  photo_url: string | null
}

type ProfessionalBlock = {
  id: string
  start_date: string
  end_date: string
  reason: string | null
  block_type: string
}

type ProfessionalService = {
  professional_id: string
  service_id: string
}

export default function PublicBookingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')

  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [intervalMinutes, setIntervalMinutes] = useState(30)

  const [availableTimes, setAvailableTimes] = useState<string[]>([])

  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [professionalServices, setProfessionalServices] = useState<ProfessionalService[]>([])

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([])
  const [professionalBlock, setProfessionalBlock] = useState<ProfessionalBlock | null>(null)

  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [successDetails, setSuccessDetails] = useState('')

  const [today, setToday] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    loadData()
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setToday(currentDate)
    setCurrentTime(`${hours}:${minutes}`)
  }, [])

  useEffect(() => {
    generateAvailableTimes(openingTime, closingTime, intervalMinutes)
  }, [openingTime, closingTime, intervalMinutes])

  useEffect(() => {
    loadOccupiedTimes()
  }, [date, selectedProfessionalId, selectedServiceIds])

  function generateAvailableTimes(opening: string, closing: string, interval: number) {
    const times: string[] = []
    const [openingHour, openingMinute] = opening.split(':').map(Number)
    const [closingHour, closingMinute] = closing.split(':').map(Number)

    const start = openingHour * 60 + openingMinute
    const end = closingHour * 60 + closingMinute

    for (let minutes = start; minutes <= end; minutes += interval) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      times.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    }
    setAvailableTimes(times)
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((currentIds) =>
      currentIds.includes(serviceId)
        ? currentIds.filter((id) => id !== serviceId)
        : [...currentIds, serviceId]
    )
    setSelectedProfessionalId('')
    setDate('')
    setTime('')
    setOccupiedTimes([])
    setProfessionalBlock(null)
  }

  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id))
  const totalDurationMinutes = selectedServices.reduce((sum, service) => sum + Number(service.duration_minutes || 0), 0)
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)

  function hasEnoughTimeForSelectedServices(availableTime: string) {
    if (selectedServiceIds.length === 0) return false
    const [hour, minute] = availableTime.split(':').map(Number)
    const startMinutes = hour * 60 + minute
    const endMinutes = startMinutes + totalDurationMinutes
    const [closingHour, closingMinute] = closingTime.split(':').map(Number)
    const closingMinutes = closingHour * 60 + closingMinute

    if (endMinutes > closingMinutes) return false

    return !Array.from(
      { length: Math.ceil(totalDurationMinutes / intervalMinutes) },
      (_, index) => startMinutes + index * intervalMinutes
    ).some((minutes) => {
      const currentHour = Math.floor(minutes / 60)
      const currentMinute = minutes % 60
      return occupiedTimes.includes(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`)
    })
  }

  function resetBooking() {
    setSelectedServiceIds([])
    setSelectedProfessionalId('')
    setDate('')
    setTime('')
    setClientName('')
    setClientPhone('')
    setNotes('')
    setOccupiedTimes([])
    setSuccessMessage('')
    setSuccessDetails('')
    setCurrentStep(1)
  }

  async function loadData() {
    const { data: settings } = await supabase
      .from('company_settings')
      .select(`company_id, company_name, phone, address, logo_url, opening_time, closing_time, interval_minutes`)
      .limit(1)
      .single()

    if (!settings?.company_id) return

    setCompanyId(settings.company_id)
    setCompanyName(settings.company_name || '')
    setCompanyPhone(settings.phone || '')
    setCompanyAddress(settings.address || '')
    setCompanyLogo(settings.logo_url || '')
    setOpeningTime(settings.opening_time || '08:00')
    setClosingTime(settings.closing_time || '20:00')
    setIntervalMinutes(settings.interval_minutes || 30)

    const { data: servicesData } = await supabase
      .from('services')
      .select(`id, name, price, duration_minutes`)
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select(`id, name, role, photo_url`)
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalServicesData } = await supabase
      .from('professional_services')
      .select('professional_id, service_id')
      .eq('company_id', settings.company_id)

    setServices(servicesData || [])
    setProfessionals(professionalsData || [])
    setProfessionalServices((professionalServicesData || []) as ProfessionalService[])
  }

  async function loadOccupiedTimes() {
    if (!date || !selectedProfessionalId) {
      setOccupiedTimes([])
      setProfessionalBlock(null)
      return
    }

    const { data: block } = await supabase
      .from('professional_time_blocks')
      .select('id,start_date,end_date,reason,block_type')
      .eq('professional_id', selectedProfessionalId)
      .lte('start_date', date)
      .gte('end_date', date)
      .maybeSingle()

    if (block) {
      setProfessionalBlock(block as ProfessionalBlock)
      setOccupiedTimes(availableTimes)
      return
    }

    setProfessionalBlock(null)

    const { data } = await supabase
      .from('appointments')
      .select(`appointment_time, services ( duration_minutes )`)
      .eq('professional_id', selectedProfessionalId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')

    const blockedTimes: string[] = []

    data?.forEach((appointment: any) => {
      const appointmentTime = appointment.appointment_time.slice(0, 5)
      const duration = appointment.services?.duration_minutes || 0
      const totalBlockMinutes = duration + intervalMinutes
      const [hour, minute] = appointmentTime.split(':').map(Number)
      const startMinutes = hour * 60 + minute

      for (let current = startMinutes; current < startMinutes + totalBlockMinutes; current += intervalMinutes) {
        const currentHour = Math.floor(current / 60)
        const currentMinute = current % 60
        blockedTimes.push(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`)
      }
    })

    setOccupiedTimes(blockedTimes)
  }

  async function createBooking() {
    if (!clientName.trim() || !clientPhone.trim()) return alert('Preencha seu nome e telefone.')
    setLoading(true)

    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .eq('phone', clientPhone.trim())
      .maybeSingle()

    let clientId = existingClient?.id

    if (!clientId) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ company_id: companyId, name: clientName.trim(), phone: clientPhone.trim(), active: true })
        .select('id')
        .single()

      if (clientError || !newClient) {
        setLoading(false)
        alert(clientError?.message || 'Erro ao criar cliente.')
        return
      }
      clientId = newClient.id
    }

    const [startHour, startMinute] = time.split(':').map(Number)
    const startMinutes = startHour * 60 + startMinute
    let accumulatedMinutes = 0

    const appointmentsToInsert = selectedServices.map((service) => {
      const serviceStartMinutes = startMinutes + accumulatedMinutes
      const serviceHour = Math.floor(serviceStartMinutes / 60)
      const serviceMinute = serviceStartMinutes % 60
      accumulatedMinutes += Number(service.duration_minutes || 0)

      return {
        company_id: companyId,
        client_id: clientId,
        service_id: service.id,
        professional_id: selectedProfessionalId,
        appointment_date: date,
        appointment_time: `${String(serviceHour).padStart(2, '0')}:${String(serviceMinute).padStart(2, '0')}`,
        status: 'scheduled',
        notes: notes.trim(),
      }
    })

    const { error: appointmentError } = await supabase.from('appointments').insert(appointmentsToInsert)
    setLoading(false)

    if (appointmentError) return alert(appointmentError.message)

    const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId)
    setSuccessMessage('Agendamento realizado com sucesso!')
    setSuccessDetails(`${selectedServices.map((s) => s.name).join(', ')} com ${selectedProfessional?.name} em ${date.split('-').reverse().join('/')} às ${time}`)
  }

  const filteredProfessionals = selectedServiceIds.length > 0
    ? professionals.filter((p) => selectedServiceIds.every((id) => professionalServices.some((ps) => ps.professional_id === p.id && ps.service_id === id)))
    : []

  const canSubmit = selectedServiceIds.length > 0 && selectedProfessionalId && date && time && clientName.trim() && clientPhone.trim()

  return (
    <main className="min-h-screen bg-black text-white pb-24 font-sans selection:bg-zinc-800 selection:text-white">
      <div className="mx-auto max-w-xl px-4 pt-6">
        
        {/* CABEÇALHO COMPACTO ESTILO APP */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center backdrop-blur-sm shadow-xl">
          {companyLogo && (
            <img src={companyLogo} alt={companyName} className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover ring-2 ring-zinc-800" />
          )}
          <h1 className="text-xl font-bold tracking-tight text-white">{companyName}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{companyAddress || 'Agendamento Prático e Rápido'}</p>
        </div>

        {/* INDICADOR DE ETAPAS */}
        {!successMessage && (
          <div className="mt-6 flex justify-between items-center bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-400">
            <span className={currentStep === 1 ? 'text-white font-bold' : ''}>1. Serviços</span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className={currentStep === 2 ? 'text-white font-bold' : selectedProfessionalId ? 'text-zinc-300' : ''}>2. Profissional</span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className={currentStep === 3 ? 'text-white font-bold' : date && time ? 'text-zinc-300' : ''}>3. Horário</span>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className={currentStep === 4 ? 'text-white font-bold' : ''}>4. Confirmação</span>
          </div>
        )}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-950 bg-emerald-950/20 p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-2xl font-bold text-white mt-4">{successMessage}</p>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">{successDetails}</p>
            <button onClick={resetBooking} className="mt-6 w-full rounded-xl bg-white p-3.5 text-sm font-bold text-black transition active:scale-95">
              Novo agendamento
            </button>
          </div>
        ) : (
          <div className="mt-4">
            
            {/* PASSO 1: SELEÇÃO DE SERVIÇOS */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium pl-1">
                  <Scissors className="h-4 w-4" /> <h2>Selecione os serviços desejados:</h2>
                </div>
                <div className="space-y-2.5">
                  {services.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id)
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected ? 'border-white bg-zinc-900 shadow-md ring-1 ring-white/10' : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-white">{service.name}</p>
                            <p className="text-xs text-zinc-500 mt-1">{service.duration_minutes} min</p>
                          </div>
                          <strong className="text-sm font-bold text-zinc-200">R$ {Number(service.price).toFixed(2)}</strong>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedServiceIds.length > 0 && (
                  <button onClick={() => setCurrentStep(2)} className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-white p-3.5 text-sm font-bold text-black transition active:scale-95">
                    Avançar para Profissional <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* PASSO 2: SELEÇÃO DE PROFISSIONAL */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium pl-1">
                  <User className="h-4 w-4" /> <h2>Com quem deseja agendar?</h2>
                </div>
                <div className="space-y-2.5">
                  {filteredProfessionals.map((professional) => {
                    const isSelected = selectedProfessionalId === professional.id
                    return (
                      <button
                        key={professional.id}
                        onClick={() => { setSelectedProfessionalId(professional.id); setTime('') }}
                        className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected ? 'border-white bg-zinc-900 shadow-md ring-1 ring-white/10' : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {professional.photo_url ? (
                            <img src={professional.photo_url} alt={professional.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-700" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">{professional.name.charAt(0)}</div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-white">{professional.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{professional.role || 'Especialista'}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button onClick={() => setCurrentStep(1)} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-sm font-bold text-white transition hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Voltar</button>
                  {selectedProfessionalId && (
                    <button onClick={() => setCurrentStep(3)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white p-3.5 text-sm font-bold text-black transition active:scale-95">Avançar para Horário <ChevronRight className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 3: DATA E HORÁRIO */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium pl-1">
                  <Calendar className="h-4 w-4" /> <h2>Escolha o melhor dia e horário:</h2>
                </div>
                <input type="date" min={today} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm text-white outline-none focus:border-zinc-600" value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} />
                
                {date && (
                  <div className="mt-4">
                    <p className="mb-3 text-xs text-zinc-500 font-medium pl-1 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Horários livres para o dia selecionado:</p>
                    
                    {professionalBlock && (
                      <div className="rounded-xl border border-amber-950 bg-amber-950/20 p-4 text-xs text-amber-400 mb-4">{professionalBlock.reason || 'Profissional indisponível nesta data.'}</div>
                    )}

                    {availableTimes.filter(t => !occupiedTimes.includes(t) && !(date === today && t < currentTime) && hasEnoughTimeForSelectedServices(t)).length === 0 && (
                      <div className="rounded-xl border border-red-950 bg-red-950/20 p-4 text-xs text-red-400 mb-4">Nenhum horário vago para este dia. Experimente outra data!</div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.map((availableTime) => {
                        const isOccupied = occupiedTimes.includes(availableTime)
                        const isPastTime = date === today && availableTime < currentTime
                        const hasEnoughTime = hasEnoughTimeForSelectedServices(availableTime)
                        const isSelected = time === availableTime

                        return (
                          <button
                            key={availableTime}
                            type="button"
                            disabled={isOccupied || isPastTime || !hasEnoughTime}
                            onClick={() => setTime(availableTime)}
                            className={`rounded-xl border p-3 text-xs font-bold transition-all ${
                              isOccupied ? 'hidden' : isPastTime ? 'hidden' : !hasEnoughTime ? 'hidden' : isSelected ? 'border-white bg-white text-black shadow-lg shadow-white/10' : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-600'
                            }`}
                          >
                            {availableTime}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2.5 mt-4">
                  <button onClick={() => setCurrentStep(2)} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-sm font-bold text-white transition hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Voltar</button>
                  {date && time && (
                    <button onClick={() => setCurrentStep(4)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white p-3.5 text-sm font-bold text-black transition active:scale-95">Identificação <ChevronRight className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 4: IDENTIFICAÇÃO E REVISÃO FINAL */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3 text-xs">
                  <h3 className="font-bold text-sm border-b border-zinc-800 pb-2 text-white">Resumo Final do Agendamento</h3>
                  <p className="text-zinc-400"><span className="text-zinc-500 font-medium">Serviços:</span> {selectedServices.map(s => s.name).join(', ')}</p>
                  <p className="text-zinc-400"><span className="text-zinc-500 font-medium">Profissional:</span> {professionals.find(p => p.id === selectedProfessionalId)?.name}</p>
                  <p className="text-zinc-400"><span className="text-zinc-500 font-medium">Data e Hora:</span> {date.split('-').reverse().join('/')} às {time}</p>
                  <p className="text-zinc-400"><span className="text-zinc-500 font-medium">Preço Total:</span> <span className="font-bold text-emerald-400">R$ {totalPrice.toFixed(2)}</span> ({totalDurationMinutes} min)</p>
                </div>

                <div className="space-y-2.5 mt-2">
                  <input placeholder="Digite seu nome completo" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm text-white outline-none focus:border-zinc-600" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  <input placeholder="Seu WhatsApp com DDD" className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm text-white outline-none focus:border-zinc-600" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                  <textarea placeholder="Alguma observação ou aviso importante? (Opcional)" className="w-full min-h-[80px] rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm text-white outline-none focus:border-zinc-600 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="flex gap-2.5 mt-4">
                  <button onClick={() => setCurrentStep(3)} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-sm font-bold text-white transition hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /> Voltar</button>
                  <button onClick={createBooking} disabled={loading || !canSubmit} className="flex-1 rounded-xl bg-emerald-500 p-3.5 text-sm font-bold text-black transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* BOTTOM FLOATING SUMMARY BAR (APENAS MOBILE ENQUANTO NÃO SUCESSO) */}
        {!successMessage && selectedServiceIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-md flex items-center justify-between px-6 z-40 max-w-xl mx-auto rounded-t-2xl">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Resumo parcial</p>
              <p className="text-sm font-bold text-white mt-0.5">{selectedServiceIds.length} selecionado(s) · <span className="text-emerald-400">R$ {totalPrice.toFixed(2)}</span></p>
            </div>
            <div className="text-xs text-zinc-500 font-medium">Etapa {currentStep}/4</div>
          </div>
        )}

      </div>
    </main>
  )
}