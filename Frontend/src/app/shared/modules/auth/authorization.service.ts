import {EventEmitter, Injectable} from "@angular/core";
import {Http} from "@angular/http";
import {Router} from "@angular/router";
import {LoggerService} from "../helper/logger.service";
import {NotificationsService} from "angular2-notifications";
import {OEDAApiService, Permission, PermissionName, Role, UserRole} from "../api/oeda-api.service";
import {map} from "rxjs/operators";
import {isNullOrUndefined} from "util";
import {Observable} from "rxjs/Observable";
import {UserService} from "./user.service";
import {pipe} from "rxjs/util/pipe";

@Injectable()
export class AuthorizationService {

  permissions: Permission[];
  roles: UserRole[];

  userPermissionsChangedEvent = new EventEmitter<boolean>();

  constructor(private http: Http, private router: Router,
              private log: LoggerService, private notify: NotificationsService,
              private api: OEDAApiService, private userService: UserService) {
  }


  getAuthorization(): Observable<{ roles: UserRole[], permissions: Permission[] }> {
    if (isNullOrUndefined(this.permissions) || isNullOrUndefined(this.roles)) {
      return this.api.getAuthorization(this.userService.getUsername()).pipe(
        map((auth: { roles: UserRole[], permissions: Permission[] }) => {
            this.permissions = auth.permissions;
            this.roles = auth.roles;
            return auth;
          }
        ));
    } else {
      return Observable.of({roles: this.roles, permissions: this.permissions})
    }
  }

  hasPermission(permission: PermissionName, access_all?: boolean): Observable<boolean> {
    return this.getAuthorization().map(pipe((auth: { roles: UserRole[], permissions: Permission[] }) => {
      const found = this.hasPermissionHelper(auth.permissions, permission, access_all);
      return found !== undefined;
    }));
  }

  hasRole(role: Role): Observable<boolean> {
    return this.getAuthorization().map(pipe((auth: { roles: UserRole[], permissions: Permission[] }) => {
      const found = auth.roles.find((role_) => role_.name === role);
      return found !== undefined;
    }));
  }

  getPermissions(): Observable<Permission[]> {
    return this.getAuthorization().map(pipe((auth: { roles: UserRole[], permissions: Permission[] }) => {
      return auth.permissions;
    }));
  }


  /** checks if a user has a given permission */
  hasPermissionHelper(permissions: Permission[], permission: PermissionName, access_all?: boolean): boolean {
    const found = permissions.find((permission_) =>
      permission_.name === permission
      && (isNullOrUndefined(access_all) || permission_.access_all === access_all)
    );
    return found !== undefined;
  }

}
