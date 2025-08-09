import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LeftnavIcon } from './leftnavigationbar-icon.enum';
import { LeftbarService } from '../leftbar.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { PageTitleService } from 'src/app/shared/services/page-title.service'; // ✅ import shared service

@Component({
  selector: 'app-leftnavigationbar',
  standalone: true,
  imports: [TranslateModule, RouterModule],
  templateUrl: './leftnavigationbar.component.html',
  styleUrl: './leftnavigationbar.component.scss'
})
export class LeftnavigationbarComponent implements OnInit {
  leftnavbardata: any;
  public showUserNav: boolean = false;
  public showLanguageList: boolean = false;
  public langText: string = '';
  public langIcon: any;
  public leftNavIcon = LeftnavIcon;
  public defaultLanguage: string = '';

  @ViewChild('leftNav', { static: false, read: ElementRef }) navbar!: ElementRef;
  @ViewChild('userNavLink') userNavLink!: ElementRef;
  @ViewChild('userNavTemplate') userNavTemplate!: ElementRef;

  constructor(
    private renderer: Renderer2,
    private router: Router,
    private leftbar: LeftbarService,
    private pageTitleService: PageTitleService // ✅ inject PageTitleService
  ) {
    this.renderer.listen('window', 'click', (e: Event) => {
      if (this.showUserNav) {
        if (
          e.target !== this.userNavLink.nativeElement &&
          !this.userNavLink.nativeElement.contains(e.target) &&
          !this.userNavTemplate.nativeElement.contains(e.target)
        ) {
          this.showUserNav = false;
          this.showLanguageList = false;
        }
      }
    });
  }

  ngOnInit(): void {
    let languageOfChoice = localStorage.getItem('language');
    if (languageOfChoice) {
      this.langText = languageOfChoice;
      this.langIcon = this.leftNavIcon[languageOfChoice as keyof typeof LeftnavIcon];
    } else {
      this.langText = 'English';
      this.langIcon = this.leftNavIcon.English;
    }
  }

  navigateLeftNacBarIcons(event: any, id: number) {
    switch (event) {
      case 'user':
      case 'task':
      case 'notification':
      case 'settings':
        this.leftbar.setLeftNode(event, '');
        break;
    }
  }

  toggleNavClass() {
    this.showUserNav = !this.showUserNav;
  }

  navigateDashboard() {
    this.router.navigate(['assets/dashboard']);
  }

  navigatePreDashboard() {
    this.router.navigate(['assets/pre-dashboard']);
  }

  navigateToSprintMatrix() {
    this.router.navigate(['assets/bug']);
  }

  navigateToGanttChart() {
    this.router.navigate(['assets/gantt-editor']);
  }

  toggleLangList() {
    this.showLanguageList = !this.showLanguageList;
  }

  toggleUserNav() {
    this.showUserNav = !this.showUserNav;
  }

  toggleLanguageList() {
    this.showLanguageList = !this.showLanguageList;
  }

  // ✅ Set dynamic page title and navigate to Testcase
  navigateToTestcase() {
    this.pageTitleService.setTitle('TestㅤCase Management'); 
    this.router.navigate(['/select-product']); // or change route if needed
  }

  setData(_data: any) {
    try {
      this.leftnavbardata = _data;
    } catch (error) {}
  }

  logout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}
