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
  price: number | null
  duration_minutes: number | null
}

type Professional = {
  id: string
  name: string
}

type Appointment = {
  id: string
  client_id: string | null
  service_id: string | null
  professional_id: string | null
  appointment_date: string
  appointment_time: string
  status: string
  notes: string | null
  clients: { name: string } | null
  services: { name: string } | null
  professionals: { name: string } | null
}

type ProfessionalTimeBlock = {
  id: string
  professional_id: string
  start_date: string
  end_date: string
  reason: string | null
  block_type: string
}

type ProfessionalAvailability = {
  id: string
  professional_id: string
  weekday: number
  available: boolean
  pause_start_time: string | null
  pause_end_time: string | null
}

export default function AgendaPage() {
  const [companyId, setCompanyId] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])

  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([])
  const [pauseTimes, setPauseTimes] = useState<string[]>([])

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)

  const [search, setSearch] = useState('')

  const [clientId, setClientId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const [filterDate, setFilterDate] = useState('')
  const [visualProfessionalId, setVisualProfessionalId] = useState('')

  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])

  const [today, setToday] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')

  const [professionalAvailability, setProfessionalAvailability] =
    useState<ProfessionalAvailability | null>(null)
  const [availabilityWarning, setAvailabilityWarning] = useState('')
  const [professionalBlock, setProfessionalBlock] = useState<ProfessionalTimeBlock | null>(null)
  const [visualProfessionalBlock, setVisualProfessionalBlock] =
    useState<ProfessionalTimeBlock | null>(null)

  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null)
  const [rescheduleProfessionalId, setRescheduleProfessionalId] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleOccupiedTimes, setRescheduleOccupiedTimes] = useState<string[]>([])
  const [reschedulePauseTimes, setReschedulePauseTimes] = useState<string[]>([])
  const [rescheduleWarning, setRescheduleWarning] = useState('')
  const [rescheduleBlock, setRescheduleBlock] =
    useState<ProfessionalTimeBlock | null>(null)
  const [savingReschedule, setSavingReschedule] = useState(false)
  const [rescheduleSequence, setRescheduleSequence] = useState<Appointment[]>([])
  const [rescheduleSequenceLoading, setRescheduleSequenceLoading] = useState(false)

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
    loadProfessionalAvailability()
  }, [date, professionalId, serviceIds, intervalMinutes])

  useEffect(() => {
    loadVisualProfessionalBlock()
  }, [companyId, visualProfessionalId, filterDate, today])

  useEffect(() => {
    loadRescheduleAvailability()
  }, [rescheduleAppointment, rescheduleProfessionalId, rescheduleDate, rescheduleSequence])

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

  function getWeekdayFromDate(dateValue: string) {
    const [year, month, day] = dateValue.split('-').map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return parsedDate.getDay()
  }

  function timeToMinutes(timeValue: string) {
    const [hour, minute] = timeValue.slice(0, 5).split(':').map(Number)

    return hour * 60 + minute
  }

  function getProfessionalName(id: string) {
    return professionals.find((professional) => professional.id === id)?.name || ''
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

  function getBlockTypeLabel(blockType: string) {
    switch (blockType) {
      case 'vacation':
        return 'Férias'
      case 'temporary':
        return 'Bloqueio temporário'
      case 'day_off':
        return 'Folga'
      default:
        return 'Bloqueio'
    }
  }

  async function loadVisualProfessionalBlock() {
    const targetDate = filterDate || today
    const targetProfessionalId =
      visualProfessionalId || professionals[0]?.id || ''

    if (!companyId || !targetDate || !targetProfessionalId) {
      setVisualProfessionalBlock(null)
      return
    }

    const { data } = await supabase
      .from('professional_time_blocks')
      .select('id, professional_id, start_date, end_date, reason, block_type')
      .eq('company_id', companyId)
      .eq('professional_id', targetProfessionalId)
      .lte('start_date', targetDate)
      .gte('end_date', targetDate)
      .limit(1)
      .maybeSingle()

    setVisualProfessionalBlock((data || null) as ProfessionalTimeBlock | null)
  }

  async function loadProfessionalAvailability() {
    if (!companyId || !date || !professionalId) {
      setProfessionalAvailability(null)
      setAvailabilityWarning('')
      setPauseTimes([])
      setProfessionalBlock(null)
      return
    }

    const { data: activeBlock } = await supabase
      .from('professional_time_blocks')
      .select('id, professional_id, start_date, end_date, reason, block_type')
      .eq('company_id', companyId)
      .eq('professional_id', professionalId)
      .lte('start_date', date)
      .gte('end_date', date)
      .limit(1)
      .maybeSingle()

    if (activeBlock) {
      setProfessionalBlock(activeBlock as ProfessionalTimeBlock)
      setProfessionalAvailability(null)
      setPauseTimes([])
      setAvailabilityWarning(
        `Profissional indisponível (${activeBlock.block_type}). ${activeBlock.reason || 'Período bloqueado.'}`
      )
      return
    }

    const weekday = getWeekdayFromDate(date)

    const { data, error } = await supabase
      .from('professional_availability')
      .select('id, professional_id, weekday, available, pause_start_time, pause_end_time')
      .eq('company_id', companyId)
      .eq('professional_id', professionalId)
      .eq('weekday', weekday)
      .maybeSingle()

    if (error) {
      setProfessionalAvailability(null)
      setPauseTimes([])
      setAvailabilityWarning(
        'Não foi possível carregar a disponibilidade individual deste profissional.'
      )
      return
    }

    if (!data) {
      setProfessionalAvailability(null)
      setPauseTimes([])
      setAvailabilityWarning('')
      return
    }

    const availability = data as ProfessionalAvailability

    setProfessionalAvailability(availability)

    if (!availability.available) {
      setAvailabilityWarning(
        `${getProfessionalName(professionalId) || 'Este profissional'} não atende nesta data.`
      )
      setPauseTimes([])
      return
    }

    if (availability.pause_start_time && availability.pause_end_time) {
      const pauseStart = timeToMinutes(availability.pause_start_time)
      const pauseEnd = timeToMinutes(availability.pause_end_time)
      const generatedPauseTimes: string[] = []

      for (
        let current = pauseStart;
        current < pauseEnd;
        current += intervalMinutes
      ) {
        const currentHour = Math.floor(current / 60)
        const currentMinute = current % 60

        generatedPauseTimes.push(
          `${String(currentHour).padStart(2, '0')}:${String(
            currentMinute
          ).padStart(2, '0')}`
        )
      }

      setPauseTimes(generatedPauseTimes)
      setAvailabilityWarning(
        `Pausa de ${getProfessionalName(professionalId) || 'profissional'}: ${availability.pause_start_time.slice(
          0,
          5
        )} às ${availability.pause_end_time.slice(0, 5)}.`
      )
      return
    }

    setPauseTimes([])
    setAvailabilityWarning('')
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

  const visualDate = filterDate || today
  const selectedVisualProfessionalId =
    visualProfessionalId || professionals[0]?.id || ''

  const visualAppointments = useMemo(() => {
    return appointments.filter(
      (appointment) =>
        appointment.appointment_date === visualDate &&
        (!selectedVisualProfessionalId ||
          appointment.professional_id === selectedVisualProfessionalId)
    )
  }, [appointments, selectedVisualProfessionalId, visualDate])

  function getAppointmentByTime(availableTime: string) {
    return visualAppointments.find(
      (appointment) => appointment.appointment_time.slice(0, 5) === availableTime
    )
  }

  function getStatusCardClass(status: string) {
    switch (status) {
      case 'completed':
        return 'border-green-800 bg-green-950/50 text-green-200'
      case 'cancelled':
        return 'border-red-800 bg-red-950/50 text-red-200'
      case 'no_show':
        return 'border-yellow-800 bg-yellow-950/50 text-yellow-200'
      default:
        return 'border-blue-800 bg-blue-950/50 text-blue-200'
    }
  }

  function handleVisualSlotClick(availableTime: string) {
    if (!visualDate || !selectedVisualProfessionalId) return

    if (visualProfessionalBlock) {
      alert('Este profissional está ausente nesta data.')
      return
    }

    setDate(visualDate)
    setProfessionalId(selectedVisualProfessionalId)
    setTime(availableTime)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

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
      .select('id, name, price, duration_minutes')
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
        client_id,
        service_id,
        professional_id,
        appointment_date,
        appointment_time,
        status,
        notes,
        clients ( name ),
        services ( name, duration_minutes ),
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

    if (!visualProfessionalId && professionalsData?.[0]?.id) {
      setVisualProfessionalId(professionalsData[0].id)
    }

    setAppointments((appointmentsData || []) as Appointment[])
  }

  async function startReschedule(appointment: Appointment) {
    setRescheduleAppointment(appointment)
    setRescheduleProfessionalId(appointment.professional_id || '')
    setRescheduleDate(appointment.appointment_date)
    setRescheduleTime(appointment.appointment_time.slice(0, 5))
    setRescheduleWarning('')
    setRescheduleBlock(null)
    setRescheduleOccupiedTimes([])
    setReschedulePauseTimes([])
    setRescheduleSequence([appointment])

    if (!appointment.client_id || !appointment.professional_id) {
      return
    }

    setRescheduleSequenceLoading(true)

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_id,
        service_id,
        professional_id,
        appointment_date,
        appointment_time,
        status,
        notes,
        clients ( name ),
        services ( name, duration_minutes ),
        professionals ( name )
      `)
      .eq('company_id', companyId)
      .eq('client_id', appointment.client_id)
      .eq('professional_id', appointment.professional_id)
      .eq('appointment_date', appointment.appointment_date)
      .eq('status', 'scheduled')
      .order('appointment_time', {
        ascending: true,
      })

    setRescheduleSequenceLoading(false)

    if (error) {
      alert(`Erro ao carregar sequência para reagendamento: ${error.message}`)
      return
    }

    const sequence = ((data || []) as Appointment[]).filter(
      (item) => item.professional_id === appointment.professional_id
    )

    setRescheduleSequence(sequence.length > 0 ? sequence : [appointment])
  }

  async function loadRescheduleAvailability() {
    if (
      !companyId ||
      !rescheduleAppointment ||
      !rescheduleProfessionalId ||
      !rescheduleDate
    ) {
      setRescheduleOccupiedTimes([])
      setReschedulePauseTimes([])
      setRescheduleWarning('')
      setRescheduleBlock(null)
      return
    }

    const { data: activeBlock } = await supabase
      .from('professional_time_blocks')
      .select('id, professional_id, start_date, end_date, reason, block_type')
      .eq('company_id', companyId)
      .eq('professional_id', rescheduleProfessionalId)
      .lte('start_date', rescheduleDate)
      .gte('end_date', rescheduleDate)
      .limit(1)
      .maybeSingle()

    if (activeBlock) {
      setRescheduleBlock(activeBlock as ProfessionalTimeBlock)
      setRescheduleWarning(
        `Profissional indisponível (${activeBlock.block_type}). ${activeBlock.reason || 'Período bloqueado.'}`
      )
      setRescheduleOccupiedTimes([])
      setReschedulePauseTimes([])
      return
    }

    setRescheduleBlock(null)

    const weekday = getWeekdayFromDate(rescheduleDate)

    const { data: availability } = await supabase
      .from('professional_availability')
      .select('weekday, available, pause_start_time, pause_end_time')
      .eq('company_id', companyId)
      .eq('professional_id', rescheduleProfessionalId)
      .eq('weekday', weekday)
      .maybeSingle()

    if (availability && !availability.available) {
      setRescheduleWarning('Este profissional não atende nesta data.')
      setReschedulePauseTimes([])
    } else if (availability?.pause_start_time && availability?.pause_end_time) {
      const pauseStart = timeToMinutes(availability.pause_start_time)
      const pauseEnd = timeToMinutes(availability.pause_end_time)
      const generatedPauseTimes: string[] = []

      for (
        let current = pauseStart;
        current < pauseEnd;
        current += intervalMinutes
      ) {
        const currentHour = Math.floor(current / 60)
        const currentMinute = current % 60

        generatedPauseTimes.push(
          `${String(currentHour).padStart(2, '0')}:${String(
            currentMinute
          ).padStart(2, '0')}`
        )
      }

      setReschedulePauseTimes(generatedPauseTimes)
      setRescheduleWarning(
        `Pausa do profissional: ${availability.pause_start_time.slice(
          0,
          5
        )} às ${availability.pause_end_time.slice(0, 5)}.`
      )
    } else {
      setReschedulePauseTimes([])
      setRescheduleWarning('')
    }

    const rescheduleSequenceIds = rescheduleSequence.map((item) => item.id)

    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        services (
          duration_minutes
        )
      `)
      .eq('professional_id', rescheduleProfessionalId)
      .eq('appointment_date', rescheduleDate)
      .neq('status', 'cancelled')

    if (rescheduleSequenceIds.length > 0) {
      appointmentsQuery = appointmentsQuery.not(
        'id',
        'in',
        `(${rescheduleSequenceIds.join(',')})`
      )
    } else {
      appointmentsQuery = appointmentsQuery.neq('id', rescheduleAppointment.id)
    }

    const { data: appointmentsData } = await appointmentsQuery

    const blockedTimes: string[] = []

    appointmentsData?.forEach((appointment: any) => {
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

        blockedTimes.push(
          `${String(currentHour).padStart(2, '0')}:${String(
            currentMinute
          ).padStart(2, '0')}`
        )
      }
    })

    setRescheduleOccupiedTimes(blockedTimes)
  }


  function getRescheduleSequenceDurationMinutes() {
    return rescheduleSequence.reduce((sum, appointment) => {
      const serviceData = Array.isArray(appointment.services)
        ? appointment.services[0]
        : appointment.services

      return sum + Number((serviceData as any)?.duration_minutes || intervalMinutes)
    }, 0)
  }

  function rescheduleSequenceFitsInSchedule(startTime: string) {
    const totalDuration = getRescheduleSequenceDurationMinutes()

    if (!totalDuration) return false

    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + totalDuration
    const closingMinutes = timeToMinutes(closingTime)

    if (endMinutes > closingMinutes) return false

    for (
      let current = startMinutes;
      current < endMinutes;
      current += intervalMinutes
    ) {
      const currentTimeSlot = formatTimeFromMinutes(current)

      if (
        rescheduleOccupiedTimes.includes(currentTimeSlot) ||
        reschedulePauseTimes.includes(currentTimeSlot)
      ) {
        return false
      }
    }

    return true
  }

  async function saveReschedule() {
    if (
      !rescheduleAppointment ||
      !rescheduleProfessionalId ||
      !rescheduleDate ||
      !rescheduleTime
    ) {
      alert('Preencha profissional, data e horário para reagendar.')
      return
    }

    if (rescheduleDate < today) {
      alert('Não é possível reagendar para data passada.')
      return
    }

    if (rescheduleDate === today && rescheduleTime < currentTime) {
      alert('Não é possível reagendar para horário passado.')
      return
    }

    if (rescheduleBlock) {
      alert('Este profissional possui férias, folga ou bloqueio nesta data.')
      return
    }

    if (rescheduleWarning.includes('não atende')) {
      alert('Este profissional não atende nesta data.')
      return
    }

    if (reschedulePauseTimes.includes(rescheduleTime)) {
      alert('Este horário está dentro da pausa do profissional.')
      return
    }

    if (rescheduleOccupiedTimes.includes(rescheduleTime)) {
      alert('Este horário já está ocupado.')
      return
    }

    if (!rescheduleSequenceFitsInSchedule(rescheduleTime)) {
      alert('Não há tempo livre suficiente para reagendar toda a sequência.')
      return
    }

    const sequence =
      rescheduleSequence.length > 0
        ? [...rescheduleSequence].sort((a, b) =>
            a.appointment_time.localeCompare(b.appointment_time)
          )
        : [rescheduleAppointment]

    setSavingReschedule(true)

    let accumulatedMinutes = 0
    const startMinutes = timeToMinutes(rescheduleTime)

    for (const appointment of sequence) {
      const appointmentStartMinutes = startMinutes + accumulatedMinutes
      const nextAppointmentTime = formatTimeFromMinutes(appointmentStartMinutes)
      const serviceData = Array.isArray(appointment.services)
        ? appointment.services[0]
        : appointment.services

      const { error } = await supabase
        .from('appointments')
        .update({
          professional_id: rescheduleProfessionalId,
          appointment_date: rescheduleDate,
          appointment_time: nextAppointmentTime,
        })
        .eq('id', appointment.id)

      if (error) {
        setSavingReschedule(false)

        if (error.code === '23505') {
          alert('Este profissional já possui um agendamento neste dia e horário.')
          return
        }

        alert(`Erro ao reagendar: ${error.message}`)
        return
      }

      accumulatedMinutes += Number((serviceData as any)?.duration_minutes || intervalMinutes)
    }

    setSavingReschedule(false)
    setRescheduleAppointment(null)
    setSelectedAppointment(null)
    setRescheduleSequence([])
    setFilterDate(rescheduleDate)
    loadData()
  }

  function getSelectedServices() {
    return services.filter((service) => serviceIds.includes(service.id))
  }

  function getTotalSelectedDurationMinutes() {
    return getSelectedServices().reduce(
      (sum, service) => sum + Number(service.duration_minutes || intervalMinutes),
      0
    )
  }

  function getTotalSelectedPrice() {
    return getSelectedServices().reduce(
      (sum, service) => sum + Number(service.price || 0),
      0
    )
  }

  function formatTimeFromMinutes(totalMinutes: number) {
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  function selectedServicesFitInSchedule(startTime: string) {
    const totalDuration = getTotalSelectedDurationMinutes()

    if (!totalDuration) return false

    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + totalDuration
    const closingMinutes = timeToMinutes(closingTime)

    return endMinutes <= closingMinutes
  }

  async function createAppointment() {
    if (
      !clientId ||
      serviceIds.length === 0 ||
      !professionalId ||
      !date ||
      !time
    ) {
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

    if (professionalBlock) {
      alert('Este profissional possui férias, folga ou bloqueio nesta data.')
      return
    }

    if (professionalAvailability && !professionalAvailability.available) {
      alert('Este profissional não atende nesta data.')
      return
    }

    if (pauseTimes.includes(time)) {
      alert('Este horário está bloqueado pela pausa individual do profissional.')
      return
    }

    if (occupiedTimes.includes(time)) {
      alert('Este horário já está ocupado.')
      return
    }

    if (!selectedServicesFitInSchedule(time)) {
      alert('Não há tempo livre suficiente para todos os serviços selecionados.')
      return
    }

    const selectedServices = getSelectedServices()
    let accumulatedMinutes = 0
    const startMinutes = timeToMinutes(time)

    const appointmentsToInsert = selectedServices.map((service) => {
      const appointmentStartMinutes = startMinutes + accumulatedMinutes
      const appointmentTime = formatTimeFromMinutes(appointmentStartMinutes)

      accumulatedMinutes += Number(service.duration_minutes || intervalMinutes)

      return {
        company_id: companyId,
        client_id: clientId,
        service_id: service.id,
        professional_id: professionalId,
        appointment_date: date,
        appointment_time: appointmentTime,
        notes,
        status: 'scheduled',
      }
    })

    const { error } = await supabase
      .from('appointments')
      .insert(appointmentsToInsert)

    if (error) {
      if (error.code === '23505') {
        alert('Este profissional já possui um agendamento neste dia e horário.')
        return
      }

      alert(error.message)
      return
    }

    setClientId('')
    setServiceIds([])
    setProfessionalId('')
    setDate('')
    setTime('')
    setNotes('')
    setOccupiedTimes([])
    setPauseTimes([])
    setProfessionalAvailability(null)
    setAvailabilityWarning('')

    setFilterDate(date)

    loadData()
  }

  async function createFinancialTransactionForAppointment(
    appointmentId: string,
    selectedMethod = 'cash'
  ) {
    const { data: existingTransaction } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('type', 'income')
      .maybeSingle()

    if (existingTransaction) {
      return
    }

    const { data: fullAppointment } = await supabase
      .from('appointments')
      .select(`
        id,
        company_id,
        client_id,
        professional_id,
        service_id,
        appointment_date,
        services (
          name,
          price
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (!fullAppointment) {
      return
    }

    const serviceData = Array.isArray(fullAppointment.services)
      ? fullAppointment.services[0]
      : fullAppointment.services

    const serviceName = serviceData?.name || 'Serviço'
    const servicePrice = Number(serviceData?.price || 0)

    await supabase
      .from('financial_transactions')
      .insert({
        company_id: fullAppointment.company_id,
        appointment_id: fullAppointment.id,
        professional_id: fullAppointment.professional_id,
        client_id: fullAppointment.client_id,
        type: 'income',
        category: 'service',
        description: serviceName,
        amount: servicePrice,
        payment_method: selectedMethod,
        status: 'paid',
        transaction_date: fullAppointment.appointment_date,
      })
  }

  async function updateAppointmentStatus(
    appointmentId: string,
    status: string,
    selectedMethod = 'cash'
  ) {
    const appointment = appointments.find(
      (item) => item.id === appointmentId
    )

    if (!appointment) {
      return
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)

    if (error) {
      alert(error.message)
      return
    }

    if (status === 'completed') {
      await createFinancialTransactionForAppointment(
        appointmentId,
        selectedMethod
      )
    }

    if (selectedAppointment?.id === appointmentId) {
      setSelectedAppointment({
        ...selectedAppointment,
        status,
      })
    }

    loadData()
  }

  async function completeAppointmentSequence(
    appointment: Appointment,
    selectedMethod = 'cash'
  ) {
    if (!appointment.client_id || !appointment.professional_id) {
      await updateAppointmentStatus(appointment.id, 'completed', selectedMethod)
      return
    }

    const confirmComplete = window.confirm(
      'Concluir todos os serviços deste cliente com este profissional nesta data?'
    )

    if (!confirmComplete) return

    const { data: sequenceAppointments, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('company_id', companyId)
      .eq('client_id', appointment.client_id)
      .eq('professional_id', appointment.professional_id)
      .eq('appointment_date', appointment.appointment_date)
      .eq('status', 'scheduled')
      .order('appointment_time', {
        ascending: true,
      })

    if (error) {
      alert(`Erro ao localizar sequência de serviços: ${error.message}`)
      return
    }

    const appointmentIds = (sequenceAppointments || []).map((item) => item.id)

    if (appointmentIds.length === 0) {
      return
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .in('id', appointmentIds)

    if (updateError) {
      alert(`Erro ao concluir sequência: ${updateError.message}`)
      return
    }

    for (const appointmentId of appointmentIds) {
      await createFinancialTransactionForAppointment(
        appointmentId,
        selectedMethod
      )
    }

    if (selectedAppointment) {
      setSelectedAppointment({
        ...selectedAppointment,
        status: 'completed',
      })
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Agenda</h1>

      <p className="mt-2 text-zinc-400">
        Agendamentos com bloqueio por profissional, ocupação, pausa individual e conclusão em sequência para múltiplos serviços.
      </p>

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

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Agenda visual do dia
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Visualize horários livres, ocupados e bloqueios por profissional.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Profissional
              </label>

              <select
                value={selectedVisualProfessionalId}
                onChange={(event) => setVisualProfessionalId(event.target.value)}
                className="w-full rounded-lg bg-zinc-800 p-3"
              >
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Data visual
              </label>

              <input
                type="date"
                min={today}
                value={visualDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="w-full rounded-lg bg-zinc-800 p-3"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
            Livre
          </span>
          <span className="rounded-full bg-blue-900 px-3 py-1 text-blue-300">
            Agendado
          </span>
          <span className="rounded-full bg-green-900 px-3 py-1 text-green-300">
            Concluído
          </span>
          <span className="rounded-full bg-yellow-900 px-3 py-1 text-yellow-300">
            Pausa / não compareceu
          </span>
          <span className="rounded-full bg-red-900 px-3 py-1 text-red-300">
            Cancelado / ocupado
          </span>
        </div>

        {visualProfessionalBlock && (
          <div className="mt-6 rounded-2xl border border-orange-800 bg-orange-950/40 p-5 text-orange-200">
            <p className="text-sm uppercase tracking-wide text-orange-300">
              Profissional ausente
            </p>

            <h3 className="mt-2 text-xl font-bold">
              {getBlockTypeLabel(visualProfessionalBlock.block_type)}
            </h3>

            <p className="mt-1 text-sm">
              Período: {visualProfessionalBlock.start_date} até{' '}
              {visualProfessionalBlock.end_date}
            </p>

            <p className="mt-1 text-sm">
              {visualProfessionalBlock.reason || 'Período bloqueado para agendamentos.'}
            </p>
          </div>
        )}

        <div className="mt-6 max-h-[620px] overflow-y-auto rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-[90px_1fr] border-b border-zinc-800 bg-zinc-950 text-sm font-bold text-zinc-400">
            <div className="border-r border-zinc-800 p-3">Hora</div>
            <div className="p-3">
              {getProfessionalName(selectedVisualProfessionalId) || 'Profissional'}
            </div>
          </div>

          {availableTimes.map((availableTime) => {
            const appointment = getAppointmentByTime(availableTime)
            const isPastTime = visualDate === today && availableTime < currentTime
            const isSameProfessionalSelected =
              professionalId === selectedVisualProfessionalId && date === visualDate
            const isOccupiedInForm =
              isSameProfessionalSelected && occupiedTimes.includes(availableTime)
            const isPauseInForm =
              isSameProfessionalSelected && pauseTimes.includes(availableTime)

            return (
              <div
                key={`visual-${availableTime}`}
                className="grid min-h-[72px] grid-cols-[90px_1fr] border-b border-zinc-800 last:border-b-0"
              >
                <div className="border-r border-zinc-800 bg-zinc-950 p-3 text-sm font-bold text-zinc-400">
                  {availableTime}
                </div>

                <div className="p-2">
                  {appointment ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppointment(appointment)
                        setSelectedPaymentMethod('cash')
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition hover:border-white ${getStatusCardClass(
                        appointment.status
                      )}`}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-bold">
                            {appointment.clients?.name || 'Cliente não informado'}
                          </p>

                          <p className="mt-1 text-sm opacity-90">
                            {appointment.services?.name || 'Serviço não informado'}
                          </p>
                        </div>

                        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold">
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </button>
                  ) : visualProfessionalBlock ? (
                    <div className="rounded-xl border border-orange-800 bg-orange-950/40 p-3 text-sm font-bold text-orange-300">
                      Profissional ausente — {getBlockTypeLabel(visualProfessionalBlock.block_type)}
                    </div>
                  ) : isPauseInForm ? (
                    <div className="rounded-xl border border-yellow-800 bg-yellow-950/40 p-3 text-sm font-bold text-yellow-300">
                      Pausa do profissional
                    </div>
                  ) : isOccupiedInForm ? (
                    <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm font-bold text-red-300">
                      Horário ocupado
                    </div>
                  ) : isPastTime ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-600">
                      Horário passado
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleVisualSlotClick(availableTime)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left text-sm text-zinc-400 transition hover:border-white hover:text-white"
                    >
                      Livre — clicar para preencher o horário no formulário
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Serviços
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            {services.map((service) => {
              const checked = serviceIds.includes(service.id)

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setServiceIds((currentIds) =>
                      currentIds.includes(service.id)
                        ? currentIds.filter((id) => id !== service.id)
                        : [...currentIds, service.id]
                    )

                    setTime('')
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    checked
                      ? 'border-white bg-zinc-700'
                      : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{service.name}</p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {service.duration_minutes || intervalMinutes} min · R${' '}
                        {Number(service.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border text-sm font-bold ${
                        checked
                          ? 'border-white bg-white text-black'
                          : 'border-zinc-500 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {serviceIds.length > 0 && (
            <p className="mt-3 rounded-xl bg-zinc-800 p-3 text-sm text-zinc-300">
              {serviceIds.length} serviço(s) selecionado(s) · duração estimada:{' '}
              {getTotalSelectedDurationMinutes()} min · total: R${' '}
              {getTotalSelectedPrice().toFixed(2)}
            </p>
          )}
        </div>

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

        {availabilityWarning && (
          <div
            className={`rounded-xl p-4 text-sm ${
              professionalAvailability && !professionalAvailability.available
                ? 'bg-red-950/60 text-red-300'
                : 'bg-yellow-950/60 text-yellow-300'
            }`}
          >
            {availabilityWarning}
          </div>
        )}

        <div>
          <p className="mb-3 text-sm text-zinc-400">
            Escolha um horário
          </p>

          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {availableTimes.map((availableTime) => {
              const isOccupied = occupiedTimes.includes(availableTime)
              const isPause = pauseTimes.includes(availableTime)
              const isBlockedDay = Boolean(professionalBlock)
              const isUnavailableDay =
                professionalAvailability && !professionalAvailability.available
              const isPastTime =
                date === today && availableTime < currentTime
              return (
                <button
                  key={availableTime}
                  type="button"
                  disabled={Boolean(isPastTime)}
                  onClick={() => setTime(availableTime)}
                  className={`rounded-xl p-3 text-sm font-medium transition ${
                    time === availableTime
                      ? 'bg-white text-black'
                      : isPastTime
                        ? 'cursor-not-allowed bg-zinc-950 text-zinc-600 opacity-50'
                        : isBlockedDay
                          ? 'bg-orange-950 text-orange-300 hover:bg-orange-900'
                          : isUnavailableDay
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            : isOccupied
                              ? 'bg-red-900 text-red-300 hover:bg-red-800'
                              : isPause
                                ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {availableTime}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-red-900 px-3 py-1 text-red-300">
              Ocupado
            </span>
            <span className="rounded-full bg-yellow-900 px-3 py-1 text-yellow-300">
              Pausa do profissional
            </span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-400">
              Indisponível/passado
            </span>
            <span className="rounded-full bg-orange-900 px-3 py-1 text-orange-300">
              Férias/folga/bloqueio
            </span>
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
              onClick={() => {
                setSelectedAppointment(appointment)
                setSelectedPaymentMethod('cash')
              }}
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

              {appointment.status === 'scheduled' && (
                <div
                  className="mt-4 grid gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-xl bg-zinc-800 p-3">
                    <p className="mb-2 text-sm text-zinc-500">
                      Forma de pagamento
                    </p>

                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="w-full rounded-lg bg-zinc-900 p-3 text-sm"
                    >
                      <option value="cash">Dinheiro</option>
                      <option value="pix">Pix</option>
                      <option value="credit_card">Cartão de crédito</option>
                      <option value="debit_card">Cartão de débito</option>
                      <option value="transfer">Transferência</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateAppointmentStatus(
                          appointment.id,
                          'completed',
                          selectedPaymentMethod
                        )
                      }}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold"
                    >
                      Concluído
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        completeAppointmentSequence(
                          appointment,
                          selectedPaymentMethod
                        )
                      }}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black"
                    >
                      Concluir sequência
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startReschedule(appointment)
                      }}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold"
                    >
                      Reagendar
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
              )}
            </div>
          )
        })}
      </div>


      {rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Reagendar atendimento
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {rescheduleAppointment.clients?.name || 'Cliente'}
                </h2>

                <p className="mt-2 text-zinc-400">
                  Sequência: {rescheduleSequence.length || 1} serviço(s)
                </p>
              </div>

              <button
                onClick={() => setRescheduleAppointment(null)}
                className="rounded-xl bg-zinc-800 px-4 py-2"
              >
                Fechar
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-purple-300">
                Serviços que serão reagendados juntos
              </p>

              {rescheduleSequenceLoading ? (
                <p className="mt-3 text-sm text-purple-100">
                  Carregando sequência...
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {rescheduleSequence.map((appointment, index) => {
                    const serviceData = Array.isArray(appointment.services)
                      ? appointment.services[0]
                      : appointment.services

                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between rounded-xl bg-zinc-950 p-3 text-sm"
                      >
                        <span>
                          {index + 1}. {serviceData?.name || 'Serviço'}
                        </span>

                        <span className="text-zinc-400">
                          {appointment.appointment_time.slice(0, 5)}
                        </span>
                      </div>
                    )
                  })}

                  <p className="pt-2 text-sm text-purple-100">
                    Duração estimada da sequência:{' '}
                    {getRescheduleSequenceDurationMinutes()} min
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Novo profissional
                </label>

                <select
                  value={rescheduleProfessionalId}
                  onChange={(event) => {
                    setRescheduleProfessionalId(event.target.value)
                    setRescheduleTime('')
                  }}
                  className="w-full rounded-lg bg-zinc-800 p-3"
                >
                  <option value="">Selecione um profissional</option>

                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Nova data
                </label>

                <input
                  type="date"
                  min={today}
                  value={rescheduleDate}
                  onChange={(event) => {
                    setRescheduleDate(event.target.value)
                    setRescheduleTime('')
                  }}
                  className="w-full rounded-lg bg-zinc-800 p-3"
                />
              </div>

              {rescheduleWarning && (
                <div
                  className={`rounded-xl p-4 text-sm ${
                    rescheduleBlock || rescheduleWarning.includes('não atende')
                      ? 'bg-red-950/60 text-red-300'
                      : 'bg-yellow-950/60 text-yellow-300'
                  }`}
                >
                  {rescheduleWarning}
                </div>
              )}

              <div>
                <p className="mb-3 text-sm text-zinc-400">
                  Novo horário
                </p>

                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {availableTimes.map((availableTime) => {
                    const isOccupied =
                      rescheduleOccupiedTimes.includes(availableTime)
                    const isPause =
                      reschedulePauseTimes.includes(availableTime)
                    const isBlockedDay = Boolean(rescheduleBlock)
                    const isUnavailableDay =
                      rescheduleWarning.includes('não atende')
                    const isPastTime =
                      rescheduleDate === today && availableTime < currentTime
                    const doesNotFitSequence =
                      rescheduleSequence.length > 0 &&
                      !rescheduleSequenceFitsInSchedule(availableTime)

                    return (
                      <button
                        key={`reschedule-${availableTime}`}
                        type="button"
                        disabled={Boolean(
                          isOccupied ||
                            isPastTime ||
                            isPause ||
                            isUnavailableDay ||
                            isBlockedDay ||
                            doesNotFitSequence
                        )}
                        onClick={() => setRescheduleTime(availableTime)}
                        className={`rounded-xl p-3 text-sm font-medium transition ${
                          isBlockedDay
                            ? 'cursor-not-allowed bg-orange-950 text-orange-300 opacity-70'
                            : isUnavailableDay
                              ? 'cursor-not-allowed bg-zinc-950 text-zinc-600 opacity-50'
                              : isOccupied
                                ? 'cursor-not-allowed bg-red-900 text-red-300 opacity-60'
                                : isPause
                                  ? 'cursor-not-allowed bg-yellow-900 text-yellow-300 opacity-70'
                                  : doesNotFitSequence
                                    ? 'cursor-not-allowed bg-orange-950 text-orange-300 opacity-70'
                                    : isPastTime
                                    ? 'cursor-not-allowed bg-zinc-950 text-zinc-600 opacity-50'
                                    : rescheduleTime === availableTime
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

              <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-4 text-sm text-purple-200">
                O reagendamento move toda a sequência do cliente, mantendo a ordem dos serviços e recalculando os horários automaticamente.
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  onClick={saveReschedule}
                  disabled={savingReschedule}
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {savingReschedule ? 'Salvando...' : 'Salvar reagendamento'}
                </button>

                <button
                  onClick={() => setRescheduleAppointment(null)}
                  className="rounded-xl bg-zinc-800 px-5 py-3 font-bold text-white transition hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {selectedAppointment.status === 'scheduled' && (
                <div className="grid gap-2 rounded-2xl bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-500">Ações</p>

                  <div className="rounded-2xl bg-zinc-900 p-4">
                    <p className="mb-3 text-sm text-zinc-500">
                      Forma de pagamento
                    </p>

                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) =>
                        setSelectedPaymentMethod(e.target.value)
                      }
                      className="w-full rounded-xl bg-zinc-800 p-3"
                    >
                      <option value="cash">Dinheiro</option>
                      <option value="pix">Pix</option>
                      <option value="credit_card">Cartão de crédito</option>
                      <option value="debit_card">Cartão de débito</option>
                      <option value="transfer">Transferência</option>
                    </select>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <button
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
                          'completed',
                          selectedPaymentMethod
                        )
                      }
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold"
                    >
                      Concluído
                    </button>

                    <button
                      onClick={() =>
                        completeAppointmentSequence(
                          selectedAppointment,
                          selectedPaymentMethod
                        )
                      }
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black"
                    >
                      Concluir sequência
                    </button>

                    <button
                      onClick={() => startReschedule(selectedAppointment)}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold"
                    >
                      Reagendar
                    </button>

                    <button
                      onClick={() =>
                        updateAppointmentStatus(
                          selectedAppointment.id,
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
                          selectedAppointment.id,
                          'no_show'
                        )
                      }
                      className="rounded-lg bg-yellow-600 px-3 py-2 text-sm font-bold text-black"
                    >
                      Não compareceu
                    </button>
                  </div>
                </div>
              )}

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
