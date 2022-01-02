import {Routes, UrlSegment} from "@angular/router";
import {UserLayoutComponent} from "./layout/user-layout.component";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {TargetsComponent} from "./targets/targets.component";
import {ConfigurationComponent} from "./configuration/configuration.component";
import {EditTargetsComponent} from "./targets/edit/edit-targets.component";
import {ExperimentsComponent} from "./experiments/experiments.component";
import {ShowRunningExperimentComponent} from "./experiments/show/running/show-running-experiment.component";
import {ShowSuccessfulExperimentComponent} from "./experiments/show/successful/show-successful-experiment.component";
import {CreateExperimentsComponent} from "./experiments/create/create-experiments.component";
import {UserRouteGuard} from "../shared/modules/auth/user-routeguard.service";
import {PermissionName, Role} from "../shared/modules/api/oeda-api.service";
import {UsersComponent} from "./users/users.component";
import {RoleEditComponent} from "./users/role-edit/role-edit.component";
import {ProfileComponent} from "./profile/profile.component";
import {SecurityComponent} from "./profile/security/security.component";
import {RoleRouterGuard} from "../shared/modules/auth/role-routerguard.service";

export const routes: Routes = [
  {
    path: '',
    component: UserLayoutComponent,
    canActivateChild: [UserRouteGuard, RoleRouterGuard],
    children: [
      {
        path: '',
        redirectTo: '/control/experiments',
        pathMatch: 'full'
      },
      {
        path: 'configuration',
        component: ConfigurationComponent,
        data: {
          role: Role.ADMIN
        },
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: {
          role: Role.ADMIN
        }
      },
      {
        path: 'experiments',
        component: ExperimentsComponent,
        data: {
          permissions: [PermissionName.GET_EXPERIMENT]
        }
      },
      {
        path: 'experiments/create',
        component: CreateExperimentsComponent,
        data: {
          permissions: [PermissionName.WRITE_EXPERIMENT]
        }

      },
      {
        path: 'experiments/show/:id/running',
        component: ShowRunningExperimentComponent,
        data: {
          permissions: [PermissionName.GET_EXPERIMENT]
        }
      },
      {
        path: 'experiments/show/:id/success',
        component: ShowSuccessfulExperimentComponent,
        data: {
          permissions: [PermissionName.GET_EXPERIMENT]
        }
      },
      {
        path: 'experiments/show/:id/interrupted',
        component: ShowSuccessfulExperimentComponent,
        data: {
          permissions: [PermissionName.GET_EXPERIMENT]
        }
      },
      {
        path: 'targets',
        component: TargetsComponent,
        data: {
          permissions: [PermissionName.GET_TARGETSYSTEM]
        }
      },
      {
        path: 'targets/edit/:id',
        component: EditTargetsComponent,
        data: {
          permissions: [PermissionName.WRITE_TARGETSYSTEM],
          readOnly: false
        }
      },
      {
        path: 'targets/view/:id',
        component: EditTargetsComponent,
        data: {
          permissions: [PermissionName.GET_TARGETSYSTEM],
          readOnly: true
        }
      },
      {
        path: 'targets/create',
        component: EditTargetsComponent,
        data: {
          permissions: [PermissionName.WRITE_TARGETSYSTEM],
          readOnly: false
        }
      },
      {
        path: 'users',
        component: UsersComponent,
        data: {
          role: Role.ADMIN
        }
      },
      {
        path: 'users/roles',
        component: RoleEditComponent,
        data: {
          role: Role.ADMIN
        }
      },
      {
        path: 'profile',
        component: ProfileComponent
      },
      {
        path: 'profile/security',
        component: SecurityComponent
      }
    ]
  }
];
