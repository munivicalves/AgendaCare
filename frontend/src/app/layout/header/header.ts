import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Component, ElementRef, computed, inject, input, output, viewChild } from '@angular/core';

@Component({
  imports: [RouterLink],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { requireSync: true },
  );
  readonly mostrarNovaConsulta = computed(() => !/^\/agenda(?:\/|[?#]|$)/.test(this.url()));
  readonly menuAberto = input(false);
  readonly abrirMenu = output<void>();
  readonly menu = viewChild<ElementRef<HTMLButtonElement>>('menu');
  focarMenu(): void {
    requestAnimationFrame(() => this.menu()?.nativeElement.focus());
  }
}
