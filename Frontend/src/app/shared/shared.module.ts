import {NgModule, ModuleWithProviders, ErrorHandler, Injector} from "@angular/core";
import {FormsModule} from '@angular/forms';
import {AuthHttp, AuthConfig} from "angular2-jwt";
import {Http, RequestOptions, HttpModule, XHRBackend} from "@angular/http";
import {CommonModule} from "@angular/common";
import {AccordionModule} from "ngx-bootstrap/accordion";
import {ProgressbarModule} from "ngx-bootstrap/progressbar";
import {ModalModule} from "ngx-bootstrap/modal";
import {NotificationsService} from "angular2-notifications";
import {CustomErrorHandler} from "./util/custom-error-handler";
import {LoggerService} from "./modules/helper/logger.service";
import {TempStorageService} from "./modules/helper/temp-storage-service";
import {UserService} from "./modules/auth/user.service";
import {LayoutService} from "./modules/helper/layout.service";
import {UserRouteGuard} from "./modules/auth/user-routeguard.service";
import {UtilModule} from "./modules/util/util.module";
import {DataTableModule} from "angular2-datatable";
import {DataService} from "./util/data-service";
import {UIModule} from "./modules/ui/ui.module";
import {OEDAApiService} from "./modules/api/oeda-api.service";
import {PlotService} from "./util/plot-service";
import {EntityService} from "./util/entity-service";
import {HttpInterceptor} from "./util/http-interceptor";
import {AuthorizationService} from "./modules/auth/authorization.service";
import {RoleRouterGuard} from "./modules/auth/role-routerguard.service";
import {BootstrapSwitchModule} from "angular2-bootstrap-switch";
import {ResourceService} from "./util/resource-service";


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpModule,
    AccordionModule,
    ProgressbarModule,
    ModalModule,
    UtilModule,
    DataTableModule,
    UIModule,
    BootstrapSwitchModule.forRoot(),
  ],
  exports: [
    CommonModule,
    FormsModule,
    HttpModule,
    ModalModule,
    AccordionModule,
    UtilModule,
    ProgressbarModule,
    DataTableModule,
    UIModule
  ],
  providers: [
    UserService,
    LoggerService,
    TempStorageService,
    UserRouteGuard,
    RoleRouterGuard,
    LayoutService,
    DataService,
    PlotService,
    EntityService,
    OEDAApiService,
    AuthorizationService
    // should always be empty
  ]
})
export class SharedModule {

  /** defines the behaviour of angular2-jwt */
  static authHttpServiceFactory(http: HttpInterceptor, options: RequestOptions) {
    return new AuthHttp(new AuthConfig({
      tokenName: 'oeda_token',
    }), http, options)
  }

  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      // Here (and only here!) are all global shared services
      providers: [
        {
          provide: Http,
          useFactory: HttpInterceptor.httpInterceptorFactory,
          deps: [XHRBackend, RequestOptions, Injector]
        },
        {
          provide: AuthHttp,
          useFactory: SharedModule.authHttpServiceFactory,
          deps: [Http, RequestOptions]
        },
        {
          provide: ErrorHandler,
          useClass: CustomErrorHandler
        },
        LoggerService,
        UserService,
        LayoutService,
        UserRouteGuard,
        NotificationsService,
        ResourceService
      ]
    };
  }
}
