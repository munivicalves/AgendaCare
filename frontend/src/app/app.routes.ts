import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Agenda } from './pages/agenda/agenda';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/paciente-form/paciente-form';
import { AgendamentoForm } from './pages/agendamento-form/agendamento-form';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard,
    title: 'Dashboard | AgendaCare',
  },
  {
    path: 'agenda',
    component: Agenda,
    title: 'Agenda | AgendaCare',
  },
  {
    path: 'pacientes',
    component: Pacientes,
    title: 'Pacientes | AgendaCare',
  },
  {
    path: 'pacientes/novo',
    component: PacienteForm,
    title: 'Novo Paciente | AgendaCare',
  },
  {
    path: 'pacientes/:id/editar',
    component: PacienteForm,
    title: 'Editar Paciente | AgendaCare',
  },
  {
    path: 'agenda/novo',
    component: AgendamentoForm,
  },

  // Sempre por último
  {
    path: '**',
    redirectTo: '',
  },
];
