import { Component, OnInit } from '@angular/core';
import {NotificationsService} from "angular2-notifications/dist";
import {OEDAApiService} from "../../../shared/modules/api/oeda-api.service";
import {UserService} from "../../../shared/modules/auth/user.service";
import {LayoutService} from "../../../shared/modules/helper/layout.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.css']
})
export class SecurityComponent implements OnInit {

  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;


  constructor(private layoutService: LayoutService, private api: OEDAApiService,
              private userService: UserService, private notify: NotificationsService,
              private router: Router) { }

  ngOnInit() {
      this.layoutService.setHeader("Profile", "Change password");
  }

  updatePassword(): void {
    if (this.newPassword !== this.confirmNewPassword) {
      this.notify.error("Error", "New/confirmed password aren't the same!");
    }
    const username = this.userService.getUsername();
    this.api.changePassword(username, this.oldPassword, this.newPassword).subscribe((success) => {
      this.notify.success("Success", "Password changed");
      this.router.navigate(["control", "profile"]);
    }) ;
  }


}
