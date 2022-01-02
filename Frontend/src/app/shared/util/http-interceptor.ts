import {ConnectionBackend, Http, RequestOptions, RequestOptionsArgs, XHRBackend} from "@angular/http";
import {Injectable, Injector} from "@angular/core";
import {Router} from "@angular/router";
import {Observable} from "rxjs/Observable";
import {Request, Response, Headers} from '@angular/http';
import {UserService} from "../modules/auth/user.service";
import {map} from "rxjs/operators";

@Injectable()
export class HttpInterceptor extends Http {

  _router: any = null;

  static httpInterceptorFactory(xhrBackend: XHRBackend, requestOptions: RequestOptions, injector: Injector) {
    return new HttpInterceptor(xhrBackend, requestOptions, injector)
  }

  constructor(backend: ConnectionBackend, defaultOptions: RequestOptions, private injector: Injector) {
    super(backend, defaultOptions);
    setTimeout(() => this._router = injector.get(Router))
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
      return this.intercept(super.request(url, options));
  }

  get(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.intercept(super.get(url, options));
  }

  post(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.intercept(super.post(url, body, this.getRequestOptionArgs(options)));
  }

  put(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.intercept(super.put(url, body, this.getRequestOptionArgs(options)));
  }

  delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.intercept(super.delete(url, options));
  }

  getRequestOptionArgs(options?: RequestOptionsArgs): RequestOptionsArgs {
    if (options == null) {
      options = new RequestOptions();
    }
    if (options.headers == null) {
      options.headers = new Headers();
    }
    options.headers.append('Content-Type', 'application/json');
    return options;
  }

  intercept(observable: Observable<Response>): Observable<Response> {
    return observable.catch((err, source) => {
      if (err.status === 401) {
        this._router.navigate("/")
      } else if (err.status === 403) {
         this._router.navigate(['control', 'experiments'])
      } else {
        return Observable.throw(err);
      }
    });

  }
}
