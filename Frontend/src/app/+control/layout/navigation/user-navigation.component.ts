import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../../../shared/modules/auth/user.service";
import {Subscription} from "rxjs/Subscription";
import {Permission, PermissionName, Role} from "../../../shared/modules/api/oeda-api.service";
import {AuthorizationService} from "../../../shared/modules/auth/authorization.service";

@Component({
  selector: 'user-navigation',
  templateUrl: './user-navigation.component.html'
})
export class UserNavigationComponent implements OnInit {

  subscriptionOnPermissionsChanged: Subscription;

  viewTargetsystems = false;
  viewExperiments = false;
  isAdmin = false;

  permissions: Permission[];

  constructor(private userService: UserService, private authService: AuthorizationService) {

  }

  ngOnInit(): void {
    console.log("Running on init UserNavigation");
    this.updatePermissions();

  }

  updatePermissions(): void {
    this.authService.hasRole(Role.ADMIN).subscribe((res) => this.isAdmin = res);
    this.authService.hasPermission(PermissionName.GET_TARGETSYSTEM).subscribe((res) => {this.viewTargetsystems = res});
    this.authService.hasPermission(PermissionName.GET_EXPERIMENT).subscribe((res) => {this.viewExperiments = res});
  }



}
