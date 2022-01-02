import {Injectable} from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  CanLoad,
  Route,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import {UserService} from "./user.service";
import {LoggerService} from "../helper/logger.service";
import {Observable} from "rxjs/Observable";
import {NotificationsService} from "angular2-notifications/dist";
import {PermissionName, Role} from "../api/oeda-api.service";
import {map} from "rxjs/operators";
import {AuthorizationService} from "./authorization.service";


@Injectable()
export class RoleRouterGuard implements CanActivate, CanLoad, CanActivateChild {

  constructor(private router: Router, private logger: LoggerService, private userService: UserService,
              private authService: AuthorizationService, private notify: NotificationsService) {
  }

  doRoleCheck(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (route.data.role === undefined) {
      return Observable.of(true);
    } else {
      return this.authService.hasRole(route.data.role).pipe(map((hasRole) => {
        if (!hasRole) {
          this.notify.error("Error", "You have not enough permissions!");
          this.router.navigate(['/control/experiments']);
        }
        return hasRole;
      }));
    }
  }

  canLoad(router: Route) {
    return true // this.doUserCheck()
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.doRoleCheck(route, state)
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.doRoleCheck(childRoute, state)
  }
}
