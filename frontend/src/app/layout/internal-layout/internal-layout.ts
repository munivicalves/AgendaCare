import { AuthService } from '../../core/auth/auth.service';
import { Component, inject, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

@Component({
  selector: 'app-internal-layout',
  host: { '(window:resize)': 'ajustarMenu()' },
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './internal-layout.html',
  styleUrl: './internal-layout.css',
})
export class InternalLayout {
  readonly auth = inject(AuthService);
  sair(): void {
    this.menuAberto.set(false);
    this.auth.sair();
  }
  readonly menuAberto = signal(false);
  readonly sidebarRecolhida = signal(false);
  readonly header = viewChild(Header);
  alternarSidebar(): void {
    this.sidebarRecolhida.update((valor) => !valor);
  }
  ajustarMenu(): void {
    if (window.innerWidth >= 1024) this.menuAberto.set(false);
  }
  fecharMenu(): void {
    this.menuAberto.set(false);
    this.header()?.focarMenu();
  }
}
