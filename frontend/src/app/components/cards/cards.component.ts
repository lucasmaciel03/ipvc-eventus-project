import { Preferences } from '@capacitor/preferences';
import { LocalizationService } from './../../services/localization/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ToastController, NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { CrudService } from 'src/app/services/api/crud.service';
import jwt_decode from 'jwt-decode';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss'],
})
export class CardsComponent implements OnInit {
  favorite: boolean = false;
  constructor(
    private toastCtrl: ToastController,
    private toastController: ToastController,
    private navController: NavController,
    private router: Router,
    private translateService: TranslateService,
    private LocalizationService: LocalizationService,
    private crudService: CrudService
  ) {}
  user: any;
  events: any[] = [];
  monthNames = ['JAN', 'FEV', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  

  ngOnInit() {
    this.getEvents();
  }

  async presentToast() {
    this.favorite = !this.favorite;

  }

  async goForward() {
    this.navController.setDirection('forward');
    await this.router.navigate(['/eventpage'], {
      replaceUrl: true,
    });
  }

  async changeLanguage(language: string) {
    await Preferences.set({ key: 'user-lang', value: language });
    await this.LocalizationService.setLanguage(language);
    await this.showToast();
    console.log(language);
  }

  async showToast() {
    const toast = await this.toastController.create({
      message: this.translateService.instant('language as been changed'),
      duration: 4000,
    });
    await toast.present();
  }

  getToken = async () => {
    const token = await Preferences.get({ key: 'token' });

    if (token.value !== null) {
      const user = jwt_decode(token.value);
      this.user = user;
    }
  };

  checkToken = async () => {
    const hasToken = await Preferences.get({ key: 'token' });
    if (hasToken.value === null) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.router.navigateByUrl('tabs/tab4', { replaceUrl: true });
    }
  };

  getEvents() {
    this.crudService.getEvents('getAllEvents').subscribe((data) => {
      this.events = data;
      console.log(data)
        this.events.forEach((event) => {
          event.image = `http://localhost:4243/uploads/events/${event.image}`;
        });
    });
  }

  getFormattedDate(date: string) {
    let dateObj = new Date(date);
    let day = dateObj.getDate();
    let monthIndex = dateObj.getMonth();
    return `${day} ${this.monthNames[monthIndex]}`;
  }
}
