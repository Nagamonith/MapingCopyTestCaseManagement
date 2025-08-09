import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLaptopComponent } from './edit-laptop.component';

describe('EditLaptopComponent', () => {
  let component: EditLaptopComponent;
  let fixture: ComponentFixture<EditLaptopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLaptopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditLaptopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
