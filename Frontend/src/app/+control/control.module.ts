import {NgModule} from '@angular/core';
import {RouterModule} from "@angular/router";
import {routes} from "./control.routing";
import {SharedModule} from "../shared/shared.module";
import {UserFooterComponent} from "./layout/footer/user-footer.component";
import {UserLayoutComponent} from "./layout/user-layout.component";
import {UserHeaderComponent} from "./layout/header/user-header.component";
import {UserNavigationComponent} from "./layout/navigation/user-navigation.component";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {TargetsComponent} from "./targets/targets.component";
import {ConfigurationComponent} from "./configuration/configuration.component";
import {ExperimentsComponent} from "./experiments/experiments.component";
import {ShowRunningExperimentComponent} from "./experiments/show/running/show-running-experiment.component";
import {ShowSuccessfulExperimentComponent} from "./experiments/show/successful/show-successful-experiment.component";
import {GraphsModule} from "../shared/modules/graphs/graphs.module";
import {EditTargetsComponent} from "./targets/edit/edit-targets.component";
import {CreateExperimentsComponent} from "./experiments/create/create-experiments.component";
import { UsersComponent } from './users/users.component';
import { UserEditComponent } from './users/user-edit/user-edit.component';
import { RoleEditComponent } from './users/role-edit/role-edit.component';
import { UiSwitchModule } from 'angular2-ui-switch/src';
import { AngularMultiSelectModule } from 'angular4-multiselect-dropdown/angular4-multiselect-dropdown';
import { ProfileComponent } from './profile/profile.component';
import { SecurityComponent } from './profile/security/security.component';




@NgModule({
  imports: [
    SharedModule,
    GraphsModule,
    RouterModule.forChild(routes),
    UiSwitchModule,
    AngularMultiSelectModule
  ],
  providers: [],
  declarations: [
    ConfigurationComponent,
    UserNavigationComponent,
    UserHeaderComponent,
    UserLayoutComponent,
    UserFooterComponent,
    DashboardComponent,
    TargetsComponent,
    ExperimentsComponent,
    CreateExperimentsComponent,
    ShowRunningExperimentComponent,
    ShowSuccessfulExperimentComponent,
    EditTargetsComponent,
    UsersComponent,
    UserEditComponent,
    RoleEditComponent,
    ProfileComponent,
    SecurityComponent,
  ]
})
export class ControlModule {
}
