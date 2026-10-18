import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, A11yModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly aberto = input(false);
  readonly recolhida = input(false);
  readonly alternar = output<void>();
  readonly fechar = output<void>();
  readonly painel = viewChild<ElementRef<HTMLElement>>('painel');
  constructor() {
    effect(() => {
      if (this.aberto())
        this.painel()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
    });
  }
}
