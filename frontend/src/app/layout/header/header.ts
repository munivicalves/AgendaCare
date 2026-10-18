import { Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  readonly menuAberto = input(false);
  readonly abrirMenu = output<void>();
  readonly menu = viewChild<ElementRef<HTMLButtonElement>>('menu');
  focarMenu(): void {
    requestAnimationFrame(() => this.menu()?.nativeElement.focus());
  }
}
