import {EventEmitter, Injectable} from '@angular/core';
import {Observable} from "rxjs/Rx";
import {Http, Headers, Response} from "@angular/http";
import {LoggerService} from "../helper/logger.service";
import {JwtHelper} from "angular2-jwt";
import {Router} from "@angular/router";
import {Try, Option, None, Some} from "monapt";
import {environment} from "../../../../environments/environment";
import {NotificationsService} from "angular2-notifications/dist";
import {OEDAApiService, Permission, PermissionName, Role, UserRole} from "../api/oeda-api.service";
import {catchError, map} from "rxjs/operators";
import {isNullOrUndefined} from "util";

@Injectable()
export class UserService {



  constructor(private http: Http, private router: Router, private log: LoggerService, private notify: NotificationsService ) {
  }

  /** store the URL so we can redirect after logging in */
  redirectUrl: string;

  public refreshTokenEndpoint = environment.backendURL + '/auth/refresh'

  /** helper for the jwt token */
  jwtHelper: JwtHelper = new JwtHelper();

  /** true if the user is logged in */
  isLoggedIn(): boolean {
    return this.getAuthTokenRaw().map(token => {
        return Try(() => !this.jwtHelper.isTokenExpired(token)).getOrElse(() => false)
      }
    ).getOrElse(() => false)
  }

  canRefresh(): boolean {
    return this.getRefreshTokenRaw().map(token => {
        return Try(() => !this.jwtHelper.isTokenExpired(token)).getOrElse(() => false)
      }
    ).getOrElse(() => false)
  }

  /** true if db is configured properly */
  is_db_configured(): any {
    const user_token_value = this.getAuthToken()["value"].user.db_configuration;
    return user_token_value.hasOwnProperty("host") &&
      user_token_value.hasOwnProperty("port") &&
      user_token_value.hasOwnProperty("type");

  }

  getUsername(): string {
    return this.getAuthToken()["value"]["sub"];
  }

  private tryTokenRenewal(): Observable<boolean> {
    console.log("UserService - reauth requested")
    const authHeader = new Headers();
    const refreshToken = this.getRefreshTokenRaw();
    authHeader.append('Authorization', 'Bearer ' + refreshToken.get());
    console.log("request")
    return this.http.post(environment.backendURL + "/auth/refresh", {},
      {headers: authHeader})
      .map((response: Response) => {
        console.log(response);
        this.setAuthToken(response.json().token);
        return true;
      }).catch((error) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        return Observable.throw(error || 'Server error')
      })
  }

  renewToken(): Observable<boolean> {
    return this.tryTokenRenewal().pipe(map(
        (res) => {
          this.notify.success("Success", "Token renewal works!");
          return true;
        }),
      catchError(
        (error: Error) => {
          this.redirectToLogin()
          return Observable.of(false);
        })
    )
  }

  redirectToLogin(): void {
    this.notify.error("Error", "Your session has expired.");
    this.logout();
    this.router.navigate(['/'], {queryParams: {returnUrl: ''}});
  }


  userIsInGroup(groupName: string): boolean {
    return this.getAuthToken()
      .map(token => token.roles.indexOf(groupName) > -1)
      .getOrElse(() => false)
  }

  sessionExpiresDate(): Date {
    return this.getAuthTokenRaw().map(token => this.jwtHelper.getTokenExpirationDate(token))
      .getOrElse(() => new Date())
  }

  /** tries to log in the user and stores the token in localStorage (another option is to store it in sessionStorage) */
  login(request: LoginRequest): Observable<boolean> {
    console.log("UserService - starting LoginRequest")
    this.log.debug("UserService - starting LoginRequest");
    return this.http.post(environment.backendURL + "/auth/login", request)
      .map((response: Response) => {
        console.log("UserService - request successful")
        this.log.debug("UserService - request successful");
        this.setAuthToken(response.json().token);
        this.setRefreshToken(response.json().refresh_token);
        return true;
      })
      .catch((error: any) => {
        let errorMsg: any = {};
        // server is not running
        if (typeof (error._body) == 'object') {
          errorMsg.message = "Server is not running";
        } else {
          // server is running and returned a json string
          errorMsg = JSON.parse(error._body);
        }
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        return Observable.throw(error || 'Server error');
      })
  }

  /** returns the parsed token as JWTToken*/
  getAuthToken(): Option<JWTToken> {
    return this.getAuthTokenRaw().map(token => this.jwtHelper.decodeToken(token) as JWTToken)
  }

  /** stores the token*/
  setAuthToken(token: string): void {
    this.log.debug("UserService - storing token");
    localStorage.setItem('oeda_token', token)
  }

  setRefreshToken(token: string): void {
    localStorage.setItem('oeda_refresh_token', token);
  }

  /** returns the token stored in localStorage */
  getAuthTokenRaw(): Option<string> {
   return this.getJWTTokenRaw('oeda_token');
  }

  getRefreshTokenRaw(): Option<string> {
    return this.getJWTTokenRaw('oeda_refresh_token');
  }

  getJWTTokenRaw(key: string): Option<string> {
    const token = localStorage.getItem(key);
    if (token == null || token.split('.').length !== 3) {
      return None
    } else {
      return new Some(token)
    }
  }

  /** logs out the user */
  logout(): void {
    console.log("UserService - removing tokens");
    this.log.debug("UserService - removing tokens");
    localStorage.removeItem('oeda_token');
    localStorage.removeItem('oeda_refresh_token')
    this.router.navigate(['/'])
  }

}



/** request for logging in */
export interface LoginRequest {
  username: string,
  password: string
}

/** the format of tokens we use for auth*/
export interface JWTToken {
  id: string,
  value: string,
  roles: string[],
  representsArtists: string[],
  monitorsArtists: string[],
  permissions: number,
  exp: number,
  nbf: number
}
