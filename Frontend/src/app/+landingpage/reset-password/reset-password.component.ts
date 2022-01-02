import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {OEDAApiService} from "../../shared/modules/api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";
import {isNullOrUndefined} from "util";

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  resetPasswordToken: string;

  newPassword: string;
  confirmNewPassword: string;

  constructor(private router: Router, private activatedRoute: ActivatedRoute,
              private api: OEDAApiService, private notify: NotificationsService) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe((params) => {
      const resetPasswordToken = params['resetPasswordToken'];
      if (resetPasswordToken) {
        this.resetPasswordToken = resetPasswordToken;
      } else {
        this.router.navigate(["/"]);
      }
    })
  }


  public submitNewPassword(): void {
    if (isNullOrUndefined(this.newPassword) || isNullOrUndefined(this.confirmNewPassword)
      || this.confirmNewPassword.length === 0 || this.newPassword.length === 0) {
      this.notify.error("Error", "Password can't be empty!");
    } else if (this.newPassword !== this.confirmNewPassword) {
      this.notify.error("Error", "Confirmed password and new password aren't the same!");
    } else {
      this.api.saveResetPassword(this.resetPasswordToken, this.newPassword).subscribe((success) => {
        this.notify.success("Success", "New password saved!");
      });
      this.router.navigate(["/"]);
    }
  }

}
