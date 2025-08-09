import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLaptopComponent } from './add-laptop.component';

describe('AddLaptopComponent', () => {
  let component: AddLaptopComponent;
  let fixture: ComponentFixture<AddLaptopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLaptopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLaptopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
