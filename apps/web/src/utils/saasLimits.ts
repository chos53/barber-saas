type Subscription = {
    status: string;
    trial_ends_at: string | null;
  };
  
  type Plan = {
    max_users: number;
    max_professionals: number;
    max_monthly_appointments: number;
  };
  
  export function getCompanyLimits(subscription: Subscription | null, currentPlan: Plan | null) {
    // Se estiver em Trial, libera os recursos máximos (pode usar valores bem altos ou ilimitados)
    if (subscription?.status === 'trial') {
      return {
        maxUsers: 999, // Totalmente liberado no trial
        maxProfessionals: 999, // Totalmente liberado no trial
        maxAppointments: 0, // 0 = Ilimitado
        isTrialBonus: true
      };
    }
  
    // Se estiver ativo ou em outro estado, aplica o limite real do plano contratado
    return {
      maxUsers: currentPlan?.max_users || 1,
      maxProfessionals: currentPlan?.max_professionals || 3,
      maxAppointments: currentPlan?.max_monthly_appointments || 100,
      isTrialBonus: false
    };
  }