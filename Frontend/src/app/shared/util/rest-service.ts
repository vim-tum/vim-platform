import {AuthHttp, AuthHttpError} from "angular2-jwt";
import { NotificationsService } from "angular2-notifications";
import { LoggerService } from "../modules/helper/logger.service";
import {
  Headers,
  Http,
  Request,
  RequestMethod,
  RequestOptions,
  Response,
  ResponseContentType,
} from "@angular/http";
import { Injectable } from "@angular/core";
import { Try } from "monapt";
import { environment } from "../../../environments/environment";
import { Observable } from "rxjs/Observable";
import { DomSanitizer } from "@angular/platform-browser";
import {UserService} from "../modules/auth/user.service";

@Injectable()
/** an abstract class that can be used to write REST compatible client APIs */
export class RESTService {
  constructor(
    public http: Http,
    public authHttp: AuthHttp,
    public notify: NotificationsService,
    public log: LoggerService,
    public sanitizer: DomSanitizer,
    public userService: UserService
  ) {}

  baseURL = environment.backendURL;
  configBackendURL = environment.configBackendURL;

  requestOptions = new RequestOptions({
    headers: new Headers({
      "Content-Type": "application/json",
    }),
  });

  requestOptionsBlob = new RequestOptions({
    responseType: ResponseContentType.Blob,
  });

  requestOptionsFileUpload = new RequestOptions({
    headers: new Headers({
      "Content-Type": "text/xml",
    }),
  });

  /** creates a string out of a given object - also replaces empty strings "" with null */
  private createCleanJSON(object: any): string {
    return JSON.stringify(object).replace(/:""/gi, ":null");
  }

  private doRequest<T>(request: Observable<T>): Observable<T> {
    if (this.userService.isLoggedIn()) {
      return request;
    } else {
      if (this.userService.canRefresh()) {
        return this.userService.renewToken().flatMap(() => request);
      } else {
        this.userService.redirectToLogin();
        return Observable.throw("Session expired!");
      }
    }
  }

  /** does a authed http get request to the given URL and returns type T */
  public doGETRequest<T>(url: string): Observable<T> {
    const request = this.authHttp
      .get(this.baseURL + url, this.requestOptions)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        this.log.error("GET@" + url, error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  public doDELRequest<T>(url: string, object: any): Observable<T> {
    const requestOptions = new RequestOptions({
      headers: this.requestOptions.headers,
      body: this.createCleanJSON(object),
    });
    const request = this.authHttp
      .delete(this.baseURL + url, requestOptions)
      .map((res: Response) => Try(() => res.json()).getOrElse(() => {}))
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("DEL@" + url, error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  /** does a authed http post request to the given URL with payload and returns type T */
  public doPOSTRequest<T>(url: string, object: any): Observable<T> {
    const request = this.authHttp
      .post(
        this.baseURL + url,
        this.createCleanJSON(object),
        this.requestOptions
      )
      .map((res: Response) => Try(() => res.json()).getOrElse(() => {}))
      .catch((error: any, caught) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("POST@" + url, error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  public doPUTRequest<T>(url: string, object: any): Observable<T> {
    const request = this.authHttp
      .put(
        this.baseURL + url,
        this.createCleanJSON(object),
        this.requestOptions
      )
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("PUT@" + url, error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  public doGETRequestBlob<T>(
    url: string,
    file_access_token: string
  ): Observable<T> {
    const requestOptions = new RequestOptions({
      url: this.baseURL + url,
      method: RequestMethod.Get,
      responseType: this.requestOptionsBlob.responseType,
    });
    const req = new Request(requestOptions);
    const request = this.authHttp
      .requestWithToken(req, file_access_token)
      .map((val) => {
        return this.sanitizer.bypassSecurityTrustUrl(
          URL.createObjectURL(val.blob())
        );
      })
      .catch((error: any) => {
        this.notify.error("Error", error.status); // Requested blob, can't easily parse as json
        this.log.error("GET_Blob@" + url, error.status);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  /** does a public http get request to the given URL and returns type T */
  public doGETRequestForConfig<T>(): Observable<T> {
    const request = this.authHttp
      .get(this.configBackendURL, this.requestOptions)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        this.log.error("GET@", error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  /** does a public http get request to the given URL and returns type T */
  public doGETPublicRequest<T>(url: string): Observable<T> {
    return this.http
      .get(this.baseURL + url, this.requestOptions)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        this.log.error("GET@" + url, error);
        return Observable.throw(error || "Server error");
      });
  }

  /** does a public http get request to the given URL and returns type T */
  public doGETPublicRequestForConfig<T>(): Observable<T> {
    return this.http
      .get(this.configBackendURL, this.requestOptions)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        this.log.error("GET@", error);
        return Observable.throw(error || "Server error");
      });
  }

  /** does a public http get request to the given host and port to check if provided host & port is valid */
  public doGETPublicRequestForConfigValidity<T>(
    host: string,
    port: string
  ): Observable<T> {
    return this.http
      .get("http://" + host + ":" + port)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        return Observable.throw(error || "Server error");
      });
  }

  /** does a authed http post request to the given URL with payload and returns type T */
  public doPOSTPublicRequest<T>(url: string, object: any): Observable<T> {
    return this.http
      .post(
        this.baseURL + url,
        this.createCleanJSON(object),
        this.requestOptions
      )
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("POST@" + url, error);
        return Observable.throw(error || "Server error");
      });
  }

  /** does a authed http post request to the given URL with payload and returns type T */
  public doPOSTS3Request<T>(url: string, object: any): Observable<T> {
    const request = this.authHttp
      .post(this.baseURL + url, object, this.requestOptionsFileUpload)
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("POST@" + url, error);
        return Observable.throw(error || "Server error");
      });
    return this.doRequest(request);
  }

  public doPUTPublicRequest<T>(url: string, object: any): Observable<T> {
    return this.http
      .put(
        this.baseURL + url,
        this.createCleanJSON(object),
        this.requestOptions
      )
      .catch((error: any) => {
        const errorMsg = JSON.parse(error._body);
        this.notify.error("Error", errorMsg.error || errorMsg.message);
        error.object = object; // add post object to error
        this.log.error("PUT@" + url, error);
        return Observable.throw(error || "Server error");
      });
  }

  public doGetPublicRequestBlob<T>(url: string): Observable<T> {
    return this.http
      .get(this.baseURL + url, this.requestOptionsBlob)
      .map((val) => {
        return this.sanitizer.bypassSecurityTrustUrl(
          URL.createObjectURL(val.blob())
        );
      })
      .catch((error) => Observable.throw(error || "Server error"));
  }
}
