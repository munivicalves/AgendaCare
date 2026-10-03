import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { Agenda } from './pages/agenda/agenda';
import { Pacientes } from './pages/pacientes/pacientes';

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
    path: '**',
    redirectTo: '',
  },
];
