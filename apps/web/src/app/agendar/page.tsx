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
  photo_url: string | null
}

export default function PublicBookingPage() {
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

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([])

  const [loading, setLoading] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [successDetails, setSuccessDetails] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    generateAvailableTimes(
      openingTime,
      closingTime,
      intervalMinutes
    )
  }, [
    openingTime,
    closingTime,
    intervalMinutes,
  ])

  useEffect(() => {
    loadOccupiedTimes()
  }, [
    date,
    selectedProfessionalId,
    selectedServiceId,
  ])

  function generateAvailableTimes(
    opening: string,
    closing: string,
    interval: number
  ) {
    const times: string[] = []

    const [openingHour, openingMinute] =
      opening.split(':').map(Number)

    const [closingHour, closingMinute] =
      closing.split(':').map(Number)

    const start =
      openingHour * 60 + openingMinute

    const end =
      closingHour * 60 + closingMinute

    for (
      let minutes = start;
      minutes <= end;
      minutes += interval
    ) {
      const hour = Math.floor(minutes / 60)

      const minute = minutes % 60

      const formattedTime = `${String(hour).padStart(
        2,
        '0'
      )}:${String(minute).padStart(2, '0')}`

      times.push(formattedTime)
    }

    setAvailableTimes(times)
  }

  function resetBooking() {
    setSelectedServiceId('')
    setSelectedProfessionalId('')
    setDate('')
    setTime('')
    setClientName('')
    setClientPhone('')
    setOccupiedTimes([])
    setSuccessMessage('')
    setSuccessDetails('')
  }

  async function loadData() {
    const { data: settings } = await supabase
      .from('company_settings')
      .select(`
        company_id,
        company_name,
        phone,
        address,
        logo_url,
        opening_time,
        closing_time,
        interval_minutes
      `)
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
      .select(`
        id,
        name,
        price,
        duration_minutes
      `)
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select(`
        id,
        name,
        role,
        photo_url
      `)
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    setServices(servicesData || [])
    setProfessionals(professionalsData || [])
  }

  async function loadOccupiedTimes() {
    if (!date || !selectedProfessionalId) {
      setOccupiedTimes([])
      return
    }

    const { data } = await supabase
      .from('appointments')
      .select(`
        appointment_time,
        services (
          duration_minutes
        )
      `)
      .eq('professional_id', selectedProfessionalId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')

    const blockedTimes: string[] = []

    data?.forEach((appointment: any) => {
      const appointmentTime =
        appointment.appointment_time.slice(0, 5)

      const duration =
        appointment.services?.duration_minutes || 0

      const totalBlockMinutes =
        duration + intervalMinutes

      const [hour, minute] =
        appointmentTime.split(':').map(Number)

      const startMinutes =
        hour * 60 + minute

      for (
        let current = startMinutes;
        current < startMinutes + totalBlockMinutes;
        current += intervalMinutes
      ) {
        const currentHour =
          Math.floor(current / 60)

        const currentMinute =
          current % 60

        const formattedTime = `${String(
          currentHour
        ).padStart(2, '0')}:${String(
          currentMinute
        ).padStart(2, '0')}`

        blockedTimes.push(formattedTime)
      }
    })

    setOccupiedTimes(blockedTimes)
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

    if (occupiedTimes.includes(time)) {
      alert('Este horário já está ocupado.')
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
      const {
        data: newClient,
        error: clientError,
      } = await supabase
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

        alert(
          clientError?.message ||
            'Erro ao criar cliente.'
        )

        return
      }

      clientId = newClient.id
    }

    const { error: appointmentError } =
      await supabase
        .from('appointments')
        .insert({
          company_id: companyId,
          client_id: clientId,
          service_id: selectedServiceId,
          professional_id:
            selectedProfessionalId,
          appointment_date: date,
          appointment_time: time,
          status: 'scheduled',
        })

    setLoading(false)

    if (appointmentError) {
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
    setOccupiedTimes([])
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-2xl">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={companyName}
              className="mx-auto mb-5 h-28 w-28 rounded-3xl object-cover ring-4 ring-zinc-800"
            />
          )}

          <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
            Agendamento online
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Agende seu horário
          </h1>

          <p className="mt-3 text-lg text-zinc-400">
            {companyName}
          </p>
        </div>

        {successMessage ? (
          <div className="mt-6 rounded-3xl border border-green-800 bg-green-950 p-8 text-center shadow-2xl">
            <p className="text-3xl font-bold text-green-300">
              {successMessage}
            </p>

            <p className="mt-4 text-green-200">
              {successDetails}
            </p>

            <button
              onClick={resetBooking}
              className="mt-6 w-full rounded-xl bg-white p-4 font-bold text-black"
            >
              Novo agendamento
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl">
              <h2 className="text-2xl font-bold">
                Escolha um serviço
              </h2>

              <div className="mt-6 space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() =>
                      setSelectedServiceId(service.id)
                    }
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selectedServiceId === service.id
                        ? 'border-white bg-zinc-700'
                        : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">
                          {service.name}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {service.duration_minutes} min
                        </p>
                      </div>

                      <strong>
                        R$ {Number(service.price).toFixed(2)}
                      </strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl">
              <h2 className="text-2xl font-bold">
                Escolha um profissional
              </h2>

              <div className="mt-6 space-y-3">
                {professionals.map((professional) => (
                  <button
                    key={professional.id}
                    onClick={() =>
                      setSelectedProfessionalId(
                        professional.id
                      )
                    }
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selectedProfessionalId ===
                      professional.id
                        ? 'border-white bg-zinc-700'
                        : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {professional.photo_url ? (
                        <img
                          src={professional.photo_url}
                          alt={professional.name}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold">
                          {professional.name.charAt(0)}
                        </div>
                      )}

                      <div>
                        <p className="text-lg font-bold">
                          {professional.name}
                        </p>

                        <p className="text-zinc-400">
                          {professional.role}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl">
              <input
                type="date"
                className="rounded-xl bg-zinc-800 p-4"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setTime('')
                }}
              />

              <div>
                <p className="mb-3 text-sm text-zinc-400">
                  Escolha um horário
                </p>

                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {availableTimes.map(
                    (availableTime) => {
                      const isOccupied =
                        occupiedTimes.includes(
                          availableTime
                        )

                      return (
                        <button
                          key={availableTime}
                          type="button"
                          disabled={isOccupied}
                          onClick={() =>
                            setTime(
                              availableTime
                            )
                          }
                          className={`rounded-xl p-3 text-sm font-medium transition ${
                            isOccupied
                              ? 'cursor-not-allowed bg-red-900 text-red-300 opacity-60'
                              : time ===
                                  availableTime
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                        >
                          {availableTime}
                        </button>
                      )
                    }
                  )}
                </div>
              </div>

              <input
                placeholder="Seu nome"
                className="rounded-xl bg-zinc-800 p-4"
                value={clientName}
                onChange={(e) =>
                  setClientName(
                    e.target.value
                  )
                }
              />

              <input
                placeholder="Seu telefone"
                className="rounded-xl bg-zinc-800 p-4"
                value={clientPhone}
                onChange={(e) =>
                  setClientPhone(
                    e.target.value
                  )
                }
              />

              <button
                onClick={createBooking}
                disabled={loading}
                className="rounded-xl bg-white p-4 font-bold text-black"
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