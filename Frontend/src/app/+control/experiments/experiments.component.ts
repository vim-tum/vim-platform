import { Component, OnInit } from "@angular/core";
import { NotificationsService } from "angular2-notifications";
import { LayoutService } from "../../shared/modules/helper/layout.service";
import {
  OEDAApiService,
  PermissionName,
  Permission,
} from "../../shared/modules/api/oeda-api.service";
import { ActivatedRoute, Router } from "@angular/router";
import { isNullOrUndefined } from "util";
import { TempStorageService } from "../../shared/modules/helper/temp-storage-service";
import { UserService } from "../../shared/modules/auth/user.service";
import { UtilService } from "../../shared/modules/util/util.service";
import { AuthorizationService } from "../../shared/modules/auth/authorization.service";

@Component({
  selector: "control-experiments",
  templateUrl: "./experiments.component.html",
})
export class ExperimentsComponent implements OnInit {
  public is_db_configured: boolean;

  constructor(
    private layout: LayoutService,
    private api: OEDAApiService,
    private router: Router,
    private notify: NotificationsService,
    private temp_storage: TempStorageService,
    private userService: UserService,
    private activatedRoute: ActivatedRoute,
    private utilService: UtilService,
    private authService: AuthorizationService
  ) {
    const ctrl = this;
    // redirect user to configuration page if it's not configured yet.
    ctrl.is_db_configured = ctrl.userService.is_db_configured();

    if (!ctrl.is_db_configured) {
      return;
    }
    activatedRoute.params.subscribe(() => {
      ctrl.fetch_experiments();
    });
  }

  experiments = [];
  experimentToBeDeleted = null;
  experimentToBeDeletedName: string;

  permissions: Permission[] = [];

  ngOnInit(): void {
    this.authService
      .getPermissions()
      .subscribe((permissions) => (this.permissions = permissions));
  }

  hasPermission(permission: PermissionName, username?: string): boolean {
    if (
      isNullOrUndefined(username) ||
      this.userService.getUsername() === username
    ) {
      return this.authService.hasPermissionHelper(this.permissions, permission);
    } else {
      return this.authService.hasPermissionHelper(
        this.permissions,
        permission,
        true
      );
    }
  }

  public get PermissionName(): typeof PermissionName {
    return PermissionName;
  }

  fetch_experiments(): void {
    const ctrl = this;
    this.layout.setHeader("Experiments", "Current Experiments");
    this.api.loadAllExperiments().subscribe((data) => {
      if (!isNullOrUndefined(data)) {
        this.experiments = data;

        // also check if there is any newly added experiment with TempStorageService
        const new_experiment = this.temp_storage.getNewValue();
        if (new_experiment) {
          // retrieved experiments might already contain the new one
          if (!ctrl.experiments.find((e) => e.id == new_experiment.id)) {
            this.experiments.push(new_experiment);
          }
          this.temp_storage.clearNewValue();
        }
        // parse date field of experiments
        this.experiments = this.utilService.format_date(
          data,
          "createdDate",
          null
        );

        // and now, get target system information by using targetSystemId
        for (let i = 0; i < this.experiments.length; i++) {
          this.api
            .loadTargetById(this.experiments[i].targetSystemId)
            .subscribe((targetSystem) => {
              if (!isNullOrUndefined(targetSystem)) {
                this.experiments[i].targetSystem = targetSystem;
              }
            });
        }
      } else {
        this.notify.error("Error", "Failed to retrieve experiments from DB");
      }
    });
  }

  navigateToConfigurationPage() {
    this.router.navigate(["control/configuration"]);
  }

  modalExperimentDeletion(experimentId) {
    this.experimentToBeDeleted = this.experiments.find(
      (e) => e.id === experimentId
    );
    this.experimentToBeDeletedName = this.experimentToBeDeleted.name;
  }

  cancelExperimentDeletion() {
    this.experimentToBeDeleted = null;
  }

  deleteExperiment(experiment) {
    this.api.deleteExperiment(experiment).subscribe((data) => {
      console.log("experiment-" + data);
      this.experiments = this.experiments.filter((e) => e.id !== experiment.id);
      // this.router.navigate(["control/targets"]);
    });
  }

  downloadExperimentResult(experiment, experiment_type) {
    this.api
      .downloadExperimentResults(experiment, experiment_type)
      .subscribe((presigned_url) => {
        console.log("experiment-results download link?! : " + presigned_url);
        // Use the presigned_url to open a new window tab
        try {
          window.open(presigned_url);
        } catch (error) {
          console.log("Error occurred while openning presigned url : " + error);
        }
      });
  }
}
