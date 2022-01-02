import {Component, Input, OnInit} from "@angular/core";
import {UserEntity} from "../api/oeda-api.service";

@Component({
  selector: 'user-form',
  template: `    <div class="form-group">
    <label for="name">Name</label>
    <input type="text" class="form-control" id="name" placeholder="username" [(ngModel)]="user.name" name="name" [disabled]="disableEditName">
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="text" class="form-control" id="email" placeholder="your.email@mail.com" [(ngModel)]="user.email"
           name="email">
  </div>
  <div *ngIf="!hidePassword" >
    <label for="password">Password</label>
    <div class="input-group">
      <input type="text" id="password" class="form-control" [(ngModel)]="user.password">
      <span class="input-group-btn">
        <button class="btn btn-primary" type="button" (click)="doGeneratePassword()">Generate</button>
      </span>
    </div>
  </div>

  `
})

export class UserFormComponent implements OnInit {

  @Input()
  user: UserEntity;

  @Input()
  disableEditName: boolean;

  @Input()
  hidePassword: boolean

  @Input()
  generatePassword: boolean;

  constructor() {
  }

  ngOnInit() {
      if (this.generatePassword) {
        this.doGeneratePassword();
      }
  }

  doGeneratePassword(): void {
    const generator = require('generate-password-browser');

    const password = generator.generate({
      length: 10,
      numbers: true
    });
    this.user.password = password;
  }
}
