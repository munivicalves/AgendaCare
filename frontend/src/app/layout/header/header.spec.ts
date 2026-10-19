import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'agenda', component: Header },
          { path: 'agenda/novo', component: Header },
          { path: 'agenda/:id/editar', component: Header },
          { path: 'pacientes', component: Header },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      imports: [Header],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('hides the global shortcut on agenda routes and restores it elsewhere', async () => {
    const router = TestBed.inject(Router);
    for (const route of ['/agenda', '/agenda/novo', '/agenda/7/editar']) {
      await router.navigateByUrl(route);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.header-action')).toBeNull();
    }
    await router.navigateByUrl('/pacientes');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.header-action')?.getAttribute('href')).toBe(
      '/agenda/novo',
    );
  });
});
