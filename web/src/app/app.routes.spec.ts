import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('bereikt dashboard, oefenen en toets', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/');
    await router.navigateByUrl('/oefenen');
    expect(router.url).toBe('/oefenen');
    await router.navigateByUrl('/toets');
    expect(router.url).toBe('/toets');
  });
});
