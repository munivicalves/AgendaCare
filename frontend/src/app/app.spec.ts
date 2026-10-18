import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render AgendaCare branding', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('AgendaCare');
  });
  it('opens the mobile menu and closes it with Escape', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.app-workspace')?.hasAttribute('inert')).toBe(true);
    element
      .querySelector('aside')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.app-workspace')?.hasAttribute('inert')).toBe(false);
  });
  it('closes the menu after selecting a route', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.componentInstance.menuAberto.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('nav a').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.menuAberto()).toBe(false);
  });
  it('starts expanded and toggles the desktop sidebar without blocking content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.collapse-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    await fixture.whenStable();
    expect(element.querySelector('.app-shell')?.classList.contains('sidebar-collapsed')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.app-workspace')?.hasAttribute('inert')).toBe(false);
    element.querySelector<HTMLAnchorElement>('nav a')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarRecolhida()).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});
