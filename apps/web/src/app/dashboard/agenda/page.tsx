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
  const [search, setSearch] = useState('')

  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    loadData()
  }, [filterDate])

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const clientName =
        appointment.clients?.name?.toLowerCase() || ''

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
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

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
        alert(
          'Este profissional já possui um agendamento neste dia e horário.'
        )
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
          onChange={(e) => setServiceId(e.target.value)}
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
          onChange={(e) => setProfessionalId(e.target.value)}
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
          className="rounded-lg bg-zinc-800 p-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          type="time"
          className="rounded-lg bg-zinc-800 p-3"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

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

        {filteredAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg"
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

            <div className="mt-4">
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
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  updateAppointmentStatus(
                    appointment.id,
                    'completed'
                  )
                }
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold"
              >
                Concluído
              </button>

              <button
                onClick={() =>
                  updateAppointmentStatus(
                    appointment.id,
                    'cancelled'
                  )
                }
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold"
              >
                Cancelar
              </button>

              <button
                onClick={() =>
                  updateAppointmentStatus(
                    appointment.id,
                    'no_show'
                  )
                }
                className="rounded-lg bg-yellow-600 px-3 py-2 text-sm font-bold text-black"
              >
                Não compareceu
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}