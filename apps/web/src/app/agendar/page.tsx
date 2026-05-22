'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
}

export default function PublicBookingPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [successDetails, setSuccessDetails] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  function resetBooking() {
    setSelectedServiceId('')
    setSelectedProfessionalId('')
    setDate('')
    setTime('')
    setClientName('')
    setClientPhone('')
    setSuccessMessage('')
    setSuccessDetails('')
  }

  async function loadData() {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_id, company_name, phone, address')
      .limit(1)
      .single()

    if (!settings?.company_id) return

    setCompanyId(settings.company_id)
    setCompanyName(settings.company_name || '')
    setCompanyPhone(settings.phone || '')
    setCompanyAddress(settings.address || '')

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name, role')
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    setServices(servicesData || [])
    setProfessionals(professionalsData || [])
  }

  async function createBooking() {
    setSuccessMessage('')

    if (
      !selectedServiceId ||
      !selectedProfessionalId ||
      !date ||
      !time ||
      !clientName.trim() ||
      !clientPhone.trim()
    ) {
      alert('Preencha todos os campos.')
      return
    }
    if (time < '08:00' || time > '20:00') {
        alert('Escolha um horário entre 08:00 e 20:00.')
        return
      }
      
      const today = new Date().toISOString().split('T')[0]
      
      if (date < today) {
        alert('Não é possível agendar em uma data passada.')
        return
      }
    const selectedService = services.find(
      (service) => service.id === selectedServiceId
    )

    const selectedProfessional = professionals.find(
      (professional) =>
        professional.id === selectedProfessionalId
    )

    setLoading(true)

    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('company_id', companyId)
      .eq('phone', clientPhone.trim())
      .maybeSingle()

    let clientId = existingClient?.id

    if (!clientId) {
      const { data: newClient, error: clientError } =
        await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: clientName.trim(),
            phone: clientPhone.trim(),
            active: true,
          })
          .select('id')
          .single()

      if (clientError || !newClient) {
        setLoading(false)
        alert(clientError?.message || 'Erro ao criar cliente.')
        return
      }

      clientId = newClient.id
    }

    const { error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        company_id: companyId,
        client_id: clientId,
        service_id: selectedServiceId,
        professional_id: selectedProfessionalId,
        appointment_date: date,
        appointment_time: time,
        status: 'scheduled',
      })

    setLoading(false)

    if (appointmentError) {
      if (appointmentError.code === '23505') {
        alert(
          'Este horário já está ocupado para este profissional.'
        )
        return
      }

      alert(appointmentError.message)
      return
    }

    setSuccessMessage(
      'Agendamento realizado com sucesso!'
    )

    setSuccessDetails(
      `${selectedService?.name} com ${selectedProfessional?.name} em ${date} às ${time}`
    )

    setSelectedServiceId('')
    setSelectedProfessionalId('')
    setDate('')
    setTime('')
    setClientName('')
    setClientPhone('')
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-zinc-900 p-8">
          <h1 className="text-4xl font-bold">
            Agendar horário
          </h1>

          <p className="mt-2 text-zinc-400">
            {companyName}
          </p>
        </div>

        {successMessage ? (
          <div className="mt-6 rounded-2xl bg-green-900 p-8">
            <p className="text-2xl font-bold text-green-300">
              {successMessage}
            </p>

            <p className="mt-3 text-green-200">
              {successDetails}
            </p>

            <div className="mt-6 border-t border-green-800 pt-6 text-green-100">
              <p className="font-bold">
                {companyName}
              </p>

              {companyAddress && (
                <p className="mt-2">
                  {companyAddress}
                </p>
              )}

              {companyPhone && (
                <p className="mt-2">
                  {companyPhone}
                </p>
              )}
            </div>

            <button
              onClick={resetBooking}
              className="mt-6 w-full rounded-lg bg-white p-3 font-bold text-black"
            >
              Novo agendamento
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl bg-zinc-900 p-8">
              <h2 className="text-2xl font-bold">
                Escolha um serviço
              </h2>

              <div className="mt-6 space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedServiceId === service.id
                        ? 'border-white bg-zinc-700'
                        : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">
                          {service.name}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {service.duration_minutes} min
                        </p>
                      </div>

                      <strong className="text-lg">
                        R$ {Number(service.price).toFixed(2)}
                      </strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-900 p-8">
              <h2 className="text-2xl font-bold">
                Escolha um profissional
              </h2>

              <div className="mt-6 space-y-3">
                {professionals.map((professional) => (
                  <button
                    key={professional.id}
                    onClick={() =>
                      setSelectedProfessionalId(professional.id)
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedProfessionalId === professional.id
                        ? 'border-white bg-zinc-700'
                        : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <p className="font-bold">
                      {professional.name}
                    </p>

                    <p className="text-sm text-zinc-400">
                      {professional.role}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-zinc-900 p-8">
              <h2 className="text-2xl font-bold">
                Seus dados
              </h2>

              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="rounded-lg bg-zinc-800 p-3"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
        

              <input
                type="time"
                min="08:00"
                max="20:00"
                className="rounded-lg bg-zinc-800 p-3"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
        

              <input
                placeholder="Seu nome"
                className="rounded-lg bg-zinc-800 p-3"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              <input
                placeholder="Seu telefone"
                className="rounded-lg bg-zinc-800 p-3"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />

              <button
                onClick={createBooking}
                disabled={loading}
                className="rounded-lg bg-white p-3 font-bold text-black disabled:opacity-60"
              >
                {loading
                  ? 'Agendando...'
                  : 'Confirmar agendamento'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}