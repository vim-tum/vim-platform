import {Component, HostListener, OnInit} from '@angular/core';
import {OEDAApiService, Permission, PermissionName, PermissionNameString, UserRole} from "../../../shared/modules/api/oeda-api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Command, DescriptionChanged, Invoker, PermissionButton} from "./role-dashboard-models";
import {LoadPermissionsCommand} from "./role-dashboard-special-commands";
import {NotificationsService} from "angular2-notifications";

@Component({
  selector: 'app-role-edit',
  templateUrl: './role-edit.component.html',
  styleUrls: ['./role-edit.component.css']
})
export class RoleEditComponent implements OnInit {

  roles: UserRole[];
  selectedRole: UserRole;

  table: Map<PermissionName, PermissionButton>;
  invoker = new Invoker();

  action: string;


  constructor(private api: OEDAApiService, private router: Router, private route: ActivatedRoute, private notify: NotificationsService) {
  }



  ngOnInit() {
    this.table = new Map<PermissionName, PermissionButton>();
    this.api.getRoles().subscribe((data) => {
      this.roles = data.roles;
      data.permissions.forEach((permission) => this.table.set(permission.name, new PermissionButton(permission.id, permission.name)));
      this.subscribeToRoute();
    });

  }

  subscribeToRoute(): void {
    this.route.queryParams.subscribe(params => {
      const action = params['action'];
      if (action) {
        this.action = action;
      }
      if (this.action === 'add') {
        this.selectedRole = new UserRole();
      }
      const roleName = params['role'];
      this.refreshRoles(roleName);
    });
  }

  refreshRoles(roleName: string): void {
    this.api.getRoles().subscribe((data) => {
      this.roles = data.roles;
      if (roleName) {
        this.selectedRole = this.roles.find(role => role.name === roleName);
      }
      if (this.selectedRole) {
        (new LoadPermissionsCommand(this.selectedRole, this.table)).execute();
      }
      this.invoker.clear();
    });
  }

  selectRole(roleName: any): void {
    if (roleName !== '+ Create new role') {
      this.router.navigate(['control', 'users', 'roles'], {queryParams: {role: roleName, action: 'edit'}});
    } else {
      this.router.navigate(['control', 'users', 'roles'], {queryParams: {action: 'add'}});
    }
  }

  canUndo(): boolean {
    return !this.invoker.isHistoryEmpty();
  }

  undo(): void {
    if (this.canUndo()) {
      this.invoker.undo();
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.invoker.redo();
    }
  }

  canRedo(): boolean {
    return !this.invoker.isRedoHistoryEmpty();
  }

  public get PermissionName(): typeof PermissionName {
    return PermissionName;
  }

  getRole(): any {
    const role = {'id': this.selectedRole.role_id,
      'name': this.selectedRole.name,
      'permissions': [],
      'description': this.selectedRole.description};
    this.table.forEach((button, permissionName) => {
      const permission = Permission.toJSON(button.getPermissionId(), permissionName, button.is_all_active(), button.is_active());
      role.permissions.push(permission);
    });
    return role;
  }

  public update_role(): void {
    const role = this.getRole();
    this.api.updateRole(role).subscribe((success) => {
      this.refreshRoles(this.selectedRole.name);
      this.notify.success("Permission of " + this.selectedRole.name + " saved successfully!");
    }, (error => {
      this.selectedRole = null;
      this.action = null;
      this.router.navigate(['control', 'users', 'roles'],{ queryParams: {role: '', action: ''}});
    }));
  }

  public createRole(): void {
    const role = this.getRole();
    this.api.saveRole(role).subscribe((success) => {
      this.refreshRoles(this.selectedRole.name);
      this.notify.success("Role " + this.selectedRole.name + " created successfully!");
      this.selectRole(this.selectedRole.name);
    }, (error => {
      this.notify.error("Something went wrong while creating the role " + this.selectedRole.name + " !");
    }));
  }

  public deleteRole(): void {
    const role = this.getRole();
    this.api.deleteRole(role).subscribe((success) => {
      this.notify.success("Role " + this.selectedRole.name + " created successfully!");
      this.refreshRoles(this.selectedRole.name);
      this.selectedRole = null;
      this.action = null;
      this.router.navigate(['control', 'users', 'roles']);
    }, (error => {
      this.notify.error("Something went wrong while deleting the role " + this.selectedRole.name + " !");
    }));
  }


  public descriptionChanged(event): void {
    if (!event.model) {
      this.invoker.setCommand(new DescriptionChanged(this.selectedRole, event));
    }
  }



  @HostListener('document:keydown.control.z', ['$event'])
  onKeydownUndoHandler(event: KeyboardEvent) {
    event.preventDefault();
    this.undo();
  }

  @HostListener('document:keydown.control.y', ['$event'])
  onKeydownRedoHandler(event: KeyboardEvent) {
    event.preventDefault();
    this.redo();
  }

}
