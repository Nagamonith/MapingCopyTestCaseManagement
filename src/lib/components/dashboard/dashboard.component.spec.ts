import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaptopDashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: LaptopDashboardComponent;
  let fixture: ComponentFixture<LaptopDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaptopDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaptopDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
