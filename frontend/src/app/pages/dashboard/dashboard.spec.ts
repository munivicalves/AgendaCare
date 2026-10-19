import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [Dashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('updates the monthly chart and selected period through the filter buttons', async () => {
    component.carregando.set(false);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const filters = element.querySelectorAll<HTMLButtonElement>('.period-filter button');
    expect(element.querySelectorAll('.month-bar')).toHaveLength(1);
    filters[1].click();
    await fixture.whenStable();
    expect(component.periodoSelecionado()).toBe('3meses');
    expect(filters[1].getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelectorAll('.month-bar')).toHaveLength(3);
    filters[2].click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.month-bar')).toHaveLength(6);
    expect(filters[1].getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelector('.month-bar')?.getAttribute('aria-label')).toContain(
      '0 consultas',
    );
  });
});
