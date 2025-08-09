import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0, transform: 'translateY(-20px)' })),
      transition(':enter, :leave', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class AlertComponent {
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'success';
  @Input() message: string = '';
  @Input() show: boolean = false;
  @Input() isConfirm: boolean = false;
  @Input() showOverlay: boolean = true; // Control whether to show overlay

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  close() {
    this.show = false;
    this.onCancel.emit();
  }

  confirm() {
    this.onConfirm.emit();
    this.show = false;
  }
}