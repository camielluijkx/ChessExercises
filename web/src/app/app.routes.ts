import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Oefenen } from './oefenen/oefenen';
import { Toets } from './toets/toets';

export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Tactische voortgang' },
  { path: 'oefenen', component: Oefenen, title: 'Oefenen' },
  { path: 'toets', component: Toets, title: 'Toetsmodus' },
  { path: '**', redirectTo: '' },
];
