import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteLaptopComponent } from './delete-laptop.component';




describe('DeleteLaptopComponent', () => {
  let component: DeleteLaptopComponent;
  let fixture: ComponentFixture<DeleteLaptopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteLaptopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteLaptopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
