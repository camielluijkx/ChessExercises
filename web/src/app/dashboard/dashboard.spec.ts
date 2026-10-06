import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
    }).compileComponents();
  });

  it('toont de Stappenmethode-disclaimer', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('geen volledig Stappendiploma');
    expect(text).toContain('Alleen gedekte tactische vaardigheden');
  });
});
