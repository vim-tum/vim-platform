import { Component, OnInit } from '@angular/core';
import {OEDAApiService, UserEntity} from "../../shared/modules/api/oeda-api.service";
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {TempStorageService} from "../../shared/modules/helper/temp-storage-service";
import {Router} from "@angular/router";
import {EntityService} from "../../shared/util/entity-service";
import {NotificationsService} from "angular2-notifications";
import {LoginRequest, UserService} from "../../shared/modules/auth/user.service";
import {AuthorizationService} from "../../shared/modules/auth/authorization.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public user: UserEntity;

  private mail = 'mailto:vim.project.service@gmail.com' +
    '?subject=Registration%20ViM%20platform&body=Hi%20ViM%20team!%0D%0A%0D%0AI%20would%20like' +
    '%20to%20register%20on%20your%20platform!%0D%0A%0D%0APlease%20use%20this%20email%20address' +
    '%20to%20register%20me%20and%20create%20a%20default%20username.%0D%0A';

  constructor(private layout: LayoutService,
              private temp_storage: TempStorageService,
              private api: OEDAApiService,
              private router: Router,
              private entityService: EntityService,
              private notify: NotificationsService,
              private userService: UserService,
              private authService: AuthorizationService) {
    this.user = this.entityService.create_user_entity();
  }

  ngOnInit(): void {
  }

  public submitRegistration() {
    if (this.user.name.length !== 0 && this.user.password.length !== 0) {
      this.api.registerUser(this.user).subscribe(
        (result) => {
          this.notify.success("Success", "You are registered successfully.");
        }, error1 => {
          if (!error1.hasOwnProperty("_body")) {
            this.notify.error("Error", "Server is not running.");
          }
        }
      )
    } else {
      this.notify.error("Error", "Please provide valid inputs for login.");
    }
  }

  public submitLogin() {
    const ctrl = this;
    if (ctrl.user.name.length !== 0 && ctrl.user.password.length !== 0) {
      const loginRequest: LoginRequest = {
        username: this.user.name,
        password: this.user.password
      };
      ctrl.userService.login(loginRequest).subscribe(
        (userServiceResponse) => {
          if (userServiceResponse === true) {
            this.authService.getAuthorization().subscribe(() => {
              ctrl.router.navigate(['/control/experiments']);
              ctrl.notify.success("Success", "You are signed-in successfully.");
            });
          }
        }
      )
    } else {
      this.notify.error("Error", "Please provide valid inputs for login.");
    }
  }

  public forgotPassword() {
    if (this.user.name.length !== 0) {
      this.api.resetPassword(this.user.name).subscribe(
        (result) => {
          this.notify.success("Success", "An email with a reset password link was sent");
        }
      )
    } else {
      this.notify.error("Error", "Please provide a valid username");
    }
  }


}
