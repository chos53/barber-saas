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

type Appointment = {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  clients: {
    name: string
  } | null
  services: {
    name: string
  } | null
}

export default function AgendaPage() {
  const [companyId, setCompanyId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    loadData()
  }, [])

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

    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        clients (
          name
        ),
        services (
          name
        )
      `)
      .eq('company_id', profile.company_id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    setClients(clientsData || [])
    setServices(servicesData || [])
    setAppointments((appointmentsData || []) as Appointment[])
  }

  async function createAppointment() {
    if (!clientId || !serviceId || !date || !time) {
      alert('Preencha cliente, serviço, data e horário.')
      return
    }

    const { error } = await supabase.from('appointments').insert({
      company_id: companyId,
      client_id: clientId,
      service_id: serviceId,
      appointment_date: date,
      appointment_time: time,
      status: 'scheduled',
    })

    if (error) {
      alert(error.message)
      return
    }

    setClientId('')
    setServiceId('')
    setDate('')
    setTime('')
    loadData()
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold">Agenda</h1>

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

        <button
          onClick={createAppointment}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Criar agendamento
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-xl bg-zinc-900 p-4">
            <p className="font-bold">
              {appointment.clients?.name} — {appointment.services?.name}
            </p>

            <p className="text-zinc-400">
              {appointment.appointment_date} às {appointment.appointment_time}
            </p>

            <p className="text-zinc-500">
              Status: {appointment.status}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}