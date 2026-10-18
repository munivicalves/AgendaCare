import { Component, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './layout/sidebar/sidebar';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  host: { '(window:resize)': 'ajustarMenu()' },
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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
