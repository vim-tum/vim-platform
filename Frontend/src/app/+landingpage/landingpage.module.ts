import {NgModule} from '@angular/core';
import {RouterModule} from "@angular/router";
import {routes} from "./landingpage.routing";
import {LandingpageComponent} from "./landingpage.component";
import {SharedModule} from "../shared/shared.module";
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { LoginComponent } from './login/login.component';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ],
  providers: [
  ],
  declarations: [
    LandingpageComponent,
    ResetPasswordComponent,
    LoginComponent
  ]
})
export class LandingPageModule {
}
