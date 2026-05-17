'use client'

import { useEffect, useState } from 'react'
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

  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  useEffect(() => {
    loadData()
  }, [filterDate])

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

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name')
      .eq('company_id', profile.company_id)

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)

    const { data: appointmentsData } = await supabase
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
      .eq('appointment_date', filterDate)
      .order('appointment_time', { ascending: true })

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
        {appointments.length === 0 && (
          <p className="rounded-xl bg-zinc-900 p-4 text-zinc-500">
            Nenhum agendamento para esta data.
          </p>
        )}

        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-xl bg-zinc-900 p-4">
            <p className="font-bold">
              {appointment.clients?.name} — {appointment.services?.name}
            </p>

            <p className="text-zinc-400">
              Profissional: {appointment.professionals?.name}
            </p>

            <p className="text-zinc-400">
              {appointment.appointment_date} às {appointment.appointment_time}
            </p>

            {appointment.notes && (
              <p className="mt-2 text-sm text-zinc-500">
                Obs: {appointment.notes}
              </p>
            )}

            <p className="mt-2 text-zinc-500">
              Status:{' '}
              <span
                className={
                  appointment.status === 'completed'
                    ? 'text-green-400'
                    : appointment.status === 'cancelled'
                      ? 'text-red-400'
                      : appointment.status === 'no_show'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                }
              >
                {getStatusLabel(appointment.status)}
              </span>
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  updateAppointmentStatus(appointment.id, 'completed')
                }
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold"
              >
                Concluído
              </button>

              <button
                onClick={() =>
                  updateAppointmentStatus(appointment.id, 'cancelled')
                }
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold"
              >
                Cancelar
              </button>

              <button
                onClick={() =>
                  updateAppointmentStatus(appointment.id, 'no_show')
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