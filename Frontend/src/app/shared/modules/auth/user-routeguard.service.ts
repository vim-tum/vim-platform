import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot} from '@angular/router';
import {UserService} from "./user.service";
import {LoggerService} from "../helper/logger.service";
import {Observable} from "rxjs/Observable";
import {NotificationsService} from "angular2-notifications/dist";
import {PermissionName, Role} from "../api/oeda-api.service";
import {catchError, map} from "rxjs/operators";
import {Response} from "@angular/http";
import {AuthorizationService} from "./authorization.service";


@Injectable()
export class UserRouteGuard implements CanActivate, CanLoad, CanActivateChild {

  constructor(private router: Router, private logger: LoggerService, private userService: UserService,
              private authService: AuthorizationService, private notify: NotificationsService) {
  }

  doUserCheck(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this.userService.isLoggedIn()) {
      if (this.userService.canRefresh()) {
        return this.userService.renewToken();
      } else {
        this.userService.redirectToLogin();
        return Observable.of(false);
      }
    }
    return Observable.of(true);
  }

  canLoad(router: Route) {
    return true // this.doUserCheck()
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.doUserCheck(route, state)
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.doUserCheck(childRoute, state)
  }
}
