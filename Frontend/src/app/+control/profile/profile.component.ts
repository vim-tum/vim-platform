import { Component, OnInit } from '@angular/core';
import {OEDAApiService, UserEntity} from "../../shared/modules/api/oeda-api.service";
import {UserService} from "../../shared/modules/auth/user.service";
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {NotificationsService} from "angular2-notifications/dist";
import {Router} from "@angular/router";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user: UserEntity;

  constructor(private layout: LayoutService, private api: OEDAApiService,
              private userService: UserService, private notify: NotificationsService,
              private router: Router
  ) { }

  ngOnInit() {
    this.layout.setHeader("Profile", "Manage your profile");
    const username = this.userService.getUsername();
    this.api.getUser(username).subscribe((user) => {
      this.user = user[0];
    })
  }

  updateProfile(): void {
    this.api.updateUserProfile(this.user).subscribe((success) => {
      this.notify.success("Profile updated succesfully!");
    });
  }

  changePassword(): void {
    this.router.navigate(["control", "profile", "security"])
  }

}
