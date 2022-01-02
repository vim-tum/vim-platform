import {Routes} from "@angular/router";
import {LandingpageComponent} from "./landingpage.component";
import {ConfigurationComponent} from "../+control/configuration/configuration.component";
import {PermissionName} from "../shared/modules/api/oeda-api.service";
import {LoginComponent} from "./login/login.component";
import {ResetPasswordComponent} from "./reset-password/reset-password.component";

export const routes: Routes = [
  {
    path: '',
    component: LandingpageComponent,
    children: [
      {
        path: '',
        component: LoginComponent,
        pathMatch: 'full'
      },
      {
        path: 'resetPassword/:resetPasswordToken',
        component: ResetPasswordComponent,
      }
    ]
  }
];
