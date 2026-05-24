'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
}

type Service = {
  id: string
  name: string
}

type Professional = {
  id: string
  name: string
}

type Appointment = {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  notes: string | null
  clients: { name: string } | null
  services: { name: string } | null
  professionals: { name: string } | null
}

export default function AgendaPage() {
  const [companyId, setCompanyId] = useState('')

  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([])

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)

  const [search, setSearch] = useState('')

  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const [filterDate, setFilterDate] = useState('')

  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])

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
  }, [filterDate])

  useEffect(() => {
    generateAvailableTimes(openingTime, closingTime, intervalMinutes)
  }, [openingTime, closingTime, intervalMinutes])

  useEffect(() => {
    loadOccupiedTimes()
  }, [date, professionalId, serviceId])

  function generateAvailableTimes(
    opening: string,
    closing: string,
    interval: number
  ) {
    const times: string[] = []

    const [openingHour, openingMinute] = opening.split(':').map(Number)
    const [closingHour, closingMinute] = closing.split(':').map(Number)

    const start = openingHour * 60 + openingMinute
    const end = closingHour * 60 + closingMinute

    for (let minutes = start; minutes <= end; minutes += interval) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60

      const formattedTime = `${String(hour).padStart(2, '0')}:${String(
        minute
      ).padStart(2, '0')}`

      times.push(formattedTime)
    }

    setAvailableTimes(times)
  }

  function isExpiredAppointment(
    appointmentDate: string,
    appointmentTime: string,
    status: string
  ) {
    if (status !== 'scheduled') {
      return false
    }

    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
    )

    return appointmentDateTime < new Date()
  }

  async function loadOccupiedTimes() {
    if (!date || !professionalId) {
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
      .eq('professional_id', professionalId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')

    const blockedTimes: string[] = []

    data?.forEach((appointment: any) => {
      const appointmentTime = appointment.appointment_time.slice(0, 5)
      const duration = appointment.services?.duration_minutes || 0
      const totalBlockMinutes = duration + intervalMinutes

      const [hour, minute] = appointmentTime.split(':').map(Number)
      const startMinutes = hour * 60 + minute

      for (
        let current = startMinutes;
        current < startMinutes + totalBlockMinutes;
        current += intervalMinutes
      ) {
        const currentHour = Math.floor(current / 60)
        const currentMinute = current % 60

        const formattedTime = `${String(currentHour).padStart(
          2,
          '0'
        )}:${String(currentMinute).padStart(2, '0')}`

        blockedTimes.push(formattedTime)
      }
    })

    setOccupiedTimes(blockedTimes)
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const clientName = appointment.clients?.name?.toLowerCase() || ''
      const professionalName =
        appointment.professionals?.name?.toLowerCase() || ''

      return (
        clientName.includes(search.toLowerCase()) ||
        professionalName.includes(search.toLowerCase())
      )
    })
  }, [appointments, search])

  function getStatusLabel(status: string) {
    switch (status) {
      case 'scheduled':
        return 'Agendado'
      case 'completed':
        return 'Concluído'
      case 'cancelled':
        return 'Cancelado'
      case 'no_show':
        return 'Não compareceu'
      default:
        return status
    }
  }

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data: settings } = await supabase
      .from('company_settings')
      .select('opening_time, closing_time, interval_minutes')
      .eq('company_id', profile.company_id)
      .single()

    if (settings) {
      setOpeningTime(settings.opening_time || '08:00')
      setClosingTime(settings.closing_time || '20:00')
      setIntervalMinutes(settings.interval_minutes || 30)
    }

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)

    const query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        clients ( name ),
        services ( name ),
        professionals ( name )
      `)
      .eq('company_id', profile.company_id)
      .order('appointment_date', {
        ascending: true,
      })
      .order('appointment_time', {
        ascending: true,
      })

    if (filterDate) {
      query.eq('appointment_date', filterDate)
    }

    const { data: appointmentsData } = await query

    setClients(clientsData || [])
    setServices(servicesData || [])
    setProfessionals(professionalsData || [])
    setAppointments((appointmentsData || []) as Appointment[])
  }

  async function createAppointment() {
    if (!clientId || !serviceId || !professionalId || !date || !time) {
      alert('Preencha cliente, serviço, profissional, data e horário.')
      return
    }

    if (date < today) {
      alert('Não é possível criar agendamento em data passada.')
      return
    }

    if (date === today && time < currentTime) {
      alert('Não é possível criar agendamento em horário passado.')
      return
    }

    if (occupiedTimes.includes(time)) {
      alert('Este horário já está ocupado.')
      return
    }

    const { error } = await supabase.from('appointments').insert({
      company_id: companyId,
      client_id: clientId,
      service_id: serviceId,
      professional_id: professionalId,
      appointment_date: date,
      appointment_time: time,
      notes,
      status: 'scheduled',
    })

    if (error) {
      if (error.code === '23505') {
        alert('Este profissional já possui um agendamento neste dia e horário.')
        return
      }

      alert(error.message)
      return
    }

    setClientId('')
    setServiceId('')
    setProfessionalId('')
    setDate('')
    setTime('')
    setNotes('')
    setOccupiedTimes([])

    setFilterDate(date)

    loadData()
  }

  async function updateAppointmentStatus(
    appointmentId: string,
    status: string
  ) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)

    if (error) {
      alert(error.message)
      return
    }

    if (selectedAppointment?.id === appointmentId) {
      setSelectedAppointment({
        ...selectedAppointment,
        status,
      })
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Agenda</h1>

      <div className="mt-6 rounded-2xl bg-zinc-900 p-6">
        <label className="text-sm text-zinc-400">
          Filtrar por data
        </label>

        <input
          type="date"
          min={today}
          className="mt-2 w-full rounded-lg bg-zinc-800 p-3"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <input
          placeholder="Pesquisar cliente ou profissional..."
          className="w-full rounded-xl bg-zinc-900 p-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <select
          className="rounded-lg bg-zinc-800 p-3"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Selecione um cliente</option>

          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg bg-zinc-800 p-3"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value)
            setTime('')
          }}
        >
          <option value="">Selecione um serviço</option>

          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg bg-zinc-800 p-3"
          value={professionalId}
          onChange={(e) => {
            setProfessionalId(e.target.value)
            setTime('')
          }}
        >
          <option value="">Selecione um profissional</option>

          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          min={today}
          className="rounded-lg bg-zinc-800 p-3"
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
            {availableTimes.map((availableTime) => {
              const isOccupied = occupiedTimes.includes(availableTime)
              const isPastTime =
                date === today && availableTime < currentTime

              return (
                <button
                  key={availableTime}
                  type="button"
                  disabled={isOccupied || isPastTime}
                  onClick={() => setTime(availableTime)}
                  className={`rounded-xl p-3 text-sm font-medium transition ${
                    isOccupied
                      ? 'cursor-not-allowed bg-red-900 text-red-300 opacity-60'
                      : isPastTime
                        ? 'cursor-not-allowed bg-zinc-950 text-zinc-600 opacity-50'
                        : time === availableTime
                          ? 'bg-white text-black'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {availableTime}
                </button>
              )
            })}
          </div>
        </div>

        <textarea
          placeholder="Observações do agendamento"
          className="rounded-lg bg-zinc-800 p-3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          onClick={createAppointment}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Criar agendamento
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {filteredAppointments.length === 0 && (
          <p className="rounded-xl bg-zinc-900 p-4 text-zinc-500">
            Nenhum agendamento encontrado.
          </p>
        )}

        {filteredAppointments.map((appointment) => {
          const expired = isExpiredAppointment(
            appointment.appointment_date,
            appointment.appointment_time,
            appointment.status
          )

          return (
            <div
              key={appointment.id}
              onClick={() => setSelectedAppointment(appointment)}
              className="cursor-pointer rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg transition hover:border-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-bold">
                    {appointment.clients?.name}
                  </p>

                  <p className="mt-1 text-zinc-300">
                    {appointment.services?.name}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Profissional: {appointment.professionals?.name}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold">
                    {appointment.appointment_time.slice(0, 5)}
                  </p>

                  <p className="text-sm text-zinc-500">
                    {appointment.appointment_date}
                  </p>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-4 rounded-xl bg-zinc-800 p-3">
                  <p className="text-sm text-zinc-400">
                    {appointment.notes}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    appointment.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : appointment.status === 'cancelled'
                        ? 'bg-red-900 text-red-300'
                        : appointment.status === 'no_show'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-blue-900 text-blue-300'
                  }`}
                >
                  {getStatusLabel(appointment.status)}
                </span>

                {expired && (
                  <span className="rounded-full bg-orange-900 px-3 py-1 text-sm font-bold text-orange-300">
                    Vencido
                  </span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAppointmentStatus(appointment.id, 'completed')
                  }}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold"
                >
                  Concluído
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAppointmentStatus(appointment.id, 'cancelled')
                  }}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold"
                >
                  Cancelar
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAppointmentStatus(appointment.id, 'no_show')
                  }}
                  className="rounded-lg bg-yellow-600 px-3 py-2 text-sm font-bold text-black"
                >
                  Não compareceu
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Detalhes do agendamento
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {selectedAppointment.clients?.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedAppointment(null)}
                className="rounded-xl bg-zinc-800 px-4 py-2"
              >
                Fechar
              </button>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-zinc-800 p-4">
                <p className="text-sm text-zinc-500">Serviço</p>

                <p className="mt-1 text-lg font-bold">
                  {selectedAppointment.services?.name}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-800 p-4">
                <p className="text-sm text-zinc-500">
                  Profissional
                </p>

                <p className="mt-1 text-lg font-bold">
                  {selectedAppointment.professionals?.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-500">Data</p>

                  <p className="mt-1 text-lg font-bold">
                    {selectedAppointment.appointment_date}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-500">
                    Horário
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {selectedAppointment.appointment_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-800 p-4">
                <p className="text-sm text-zinc-500">Status</p>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      selectedAppointment.status === 'completed'
                        ? 'bg-green-900 text-green-300'
                        : selectedAppointment.status === 'cancelled'
                          ? 'bg-red-900 text-red-300'
                          : selectedAppointment.status === 'no_show'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-blue-900 text-blue-300'
                    }`}
                  >
                    {getStatusLabel(selectedAppointment.status)}
                  </span>

                  {isExpiredAppointment(
                    selectedAppointment.appointment_date,
                    selectedAppointment.appointment_time,
                    selectedAppointment.status
                  ) && (
                    <span className="rounded-full bg-orange-900 px-3 py-1 text-sm font-bold text-orange-300">
                      Vencido
                    </span>
                  )}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="rounded-2xl bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-500">
                    Observações
                  </p>

                  <p className="mt-2 text-zinc-300">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}