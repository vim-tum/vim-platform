import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {OEDAApiService, UserEntity, UserRole} from "../../../shared/modules/api/oeda-api.service";
import {NotificationsService} from "angular2-notifications";
import {Router} from "@angular/router";

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent implements OnInit {

  user_: UserEntity;
  roles: UserRole[];
  activeRoles: Set<string>;

  @Input()
  action: string;

  @Output()
  onDataChange = new EventEmitter<any>();


  @Input() set user(user: UserEntity) {
    this.user_ = user;
    this.activeRoles = new Set(user.roles.map((role) => role.name));
    if (this.roles) {
      this.roles.forEach((role) => role['isActive'] = this.isActive(role));
    }
  }

  constructor(private api: OEDAApiService, private notify: NotificationsService, private router: Router) {

  }

  ngOnInit() {
    this.api.getRoles().subscribe((roles) => {
      this.roles = roles['roles'];
      this.roles.forEach((role) => role['isActive'] = this.isActive(role));
    });
  }


  isActive(role: UserRole): boolean {
    return this.activeRoles.has(role.name);
  }


  saveUserRoles(): void {
    this.user_.roles = this.roles;
    this.api.updateUser(this.user_.name, this.user_).subscribe((success) => {
      this.notify.success("User saved!");
      this.router.navigate(['control', 'users'], {queryParams: {username: '', action: ''}, queryParamsHandling: "merge"});
      this.onDataChange.next();
    }, (error) => {
      this.router.navigate(['control', 'users'], {queryParams: {username: '', action: ''}, queryParamsHandling: "merge"});
      this.onDataChange.next();
    });
  }

  registerUser(): void {
    this.user_.roles = this.roles;
    this.api.registerUser(this.user_).subscribe((success) => {
      this.notify.success("New user registered!");
      this.router.navigate(['control', 'users'], {queryParams: {username: '', action: ''}, queryParamsHandling: "merge"});
      this.onDataChange.next();
    }, (error) => {
      this.notify.error("Error while registering user!");
    });
  }
}


