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

  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] =
    useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  const [occupiedTimes, setOccupiedTimes] = useState<
    string[]
  >([])

  const [loading, setLoading] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [successDetails, setSuccessDetails] =
    useState('')

  const availableTimes = [
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
  ]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadOccupiedTimes()
  }, [date, selectedProfessionalId])

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
      .select(
        'company_id, company_name, phone, address, logo_url'
      )
      .limit(1)
      .single()

    if (!settings?.company_id) return

    setCompanyId(settings.company_id)
    setCompanyName(settings.company_name || '')
    setCompanyPhone(settings.phone || '')
    setCompanyAddress(settings.address || '')
    setCompanyLogo(settings.logo_url || '')

    const { data: servicesData } = await supabase
      .from('services')
      .select(
        'id, name, price, duration_minutes'
      )
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalsData } =
      await supabase
        .from('professionals')
        .select(
          'id, name, role, photo_url'
        )
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
      .select('appointment_time')
      .eq(
        'professional_id',
        selectedProfessionalId
      )
      .eq('appointment_date', date)
      .neq('status', 'cancelled')

    const times =
      data?.map((item) =>
        item.appointment_time.slice(0, 5)
      ) || []

    setOccupiedTimes(times)
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
      alert(
        'Escolha um horário entre 08:00 e 20:00.'
      )
      return
    }

    const today = new Date()
      .toISOString()
      .split('T')[0]

    if (date < today) {
      alert(
        'Não é possível agendar em uma data passada.'
      )
      return
    }

    if (occupiedTimes.includes(time)) {
      alert('Este horário já está ocupado.')
      return
    }

    const selectedService = services.find(
      (service) =>
        service.id === selectedServiceId
    )

    const selectedProfessional =
      professionals.find(
        (professional) =>
          professional.id ===
          selectedProfessionalId
      )

    setLoading(true)

    const { data: existingClient } =
      await supabase
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
            {companyLogo && (
              <img
                src={companyLogo}
                alt={companyName}
                className="mx-auto mb-6 h-24 w-24 rounded-3xl object-cover ring-4 ring-green-800"
              />
            )}

            <p className="text-sm font-medium uppercase tracking-[0.3em] text-green-400">
              Agendamento confirmado
            </p>

            <p className="mt-4 text-3xl font-bold text-green-300">
              {successMessage}
            </p>

            <p className="mt-4 text-green-200">
              {successDetails}
            </p>

            <div className="mt-8 rounded-2xl border border-green-800 bg-black/20 p-6 text-green-100">
              <p className="text-lg font-bold">
                {companyName}
              </p>

              {companyAddress && (
                <p className="mt-3">
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
              className="mt-6 w-full rounded-xl bg-white p-4 font-bold text-black transition hover:bg-zinc-200"
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
                      setSelectedServiceId(
                        service.id
                      )
                    }
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selectedServiceId ===
                      service.id
                        ? 'border-white bg-zinc-700'
                        : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold">
                          {service.name}
                        </p>

                        <p className="text-sm text-zinc-400">
                          {
                            service.duration_minutes
                          }{' '}
                          min
                        </p>
                      </div>

                      <strong className="text-lg">
                        R${' '}
                        {Number(
                          service.price
                        ).toFixed(2)}
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
                {professionals.map(
                  (professional) => (
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
                            src={
                              professional.photo_url
                            }
                            alt={
                              professional.name
                            }
                            className="h-20 w-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold">
                            {professional.name.charAt(
                              0
                            )}
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
                  )
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl">
              <h2 className="text-2xl font-bold">
                Seus dados
              </h2>

              <input
                type="date"
                min={
                  new Date()
                    .toISOString()
                    .split('T')[0]
                }
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
                className="rounded-xl bg-white p-4 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-60"
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