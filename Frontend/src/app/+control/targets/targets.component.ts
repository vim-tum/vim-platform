import {Component, OnInit} from '@angular/core';
import {NotificationsService} from "angular2-notifications";
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {TempStorageService} from "../../shared/modules/helper/temp-storage-service";
import {OEDAApiService, UserEntity} from "../../shared/modules/api/oeda-api.service";
import {Router} from "@angular/router";
import {UserService} from "../../shared/modules/auth/user.service";
import {UtilService} from "../../shared/modules/util/util.service";
import {isNullOrUndefined} from "util";


@Component({
  selector: 'control-targets',
  templateUrl: './targets.component.html',
})
export class TargetsComponent implements OnInit {
  public is_db_configured: boolean;

  constructor(private layout: LayoutService,
              private notify: NotificationsService,
              private temp_storage: TempStorageService,
              private api: OEDAApiService,
              private router: Router,
              private userService: UserService,
              private utilService: UtilService) {
    // redirect user to configuration page if it's not configured yet.
              this.is_db_configured = userService.is_db_configured();
              this.experimentsToBeDeleted = [];
  }

  targets = [];
  experiments = [];
  experimentsToBeDeleted = [];
  tobeDeleted = null;
  toBeDeletedName : string;


  ngOnInit(): void {
    this.layout.setHeader("Target System", "Experimental Remote Systems");
    if (this.userService.is_db_configured()) {
      this.api.loadAllTargets().subscribe(
        (data) => {
          this.targets = data;
          const new_target = this.temp_storage.getNewValue();
          if (new_target) {
            // this is needed because the retrieved targets might already contain the new one
            if (!(this.targets.find(t => t.id == new_target.id))) {
              this.targets.push(new_target);
            }
            this.temp_storage.clearNewValue();
          }
          // parse date field of targets
          this.targets = this.utilService.format_date(data, "createdDate", null);
        }
      )
    }
  }


  fetch_experiments_to_be_deleted(targetId): void {
    const ctrl = this;
    this.experimentsToBeDeleted = [];
    this.api.loadAllExperiments().subscribe(
      (data) => {
        if (!isNullOrUndefined(data)) {
          this.experiments = data;

          for (let i = 0; i < this.experiments.length; i++) {
            if (this.experiments[i].targetSystemId === targetId && this.experiments[i].status != 'RUNNING') {
              this.experimentsToBeDeleted.push(this.experiments[i]);
            }
          }

        } else {
          this.notify.error("Error", "Failed to retrieve experiments from DB");
        }
      }
    )
  }


  navigateToConfigurationPage() {
    this.router.navigate(["control/configuration"]);
  }

  modalTargetSystemDeletion(targetId){

    this.tobeDeleted = this.targets.find(t => t.id == targetId);
    this.toBeDeletedName = this.tobeDeleted.name;
    this.fetch_experiments_to_be_deleted(targetId);
    return;
  }

  cancelTargetSystemDeletion(){
    this.experimentsToBeDeleted = [];
  }

  deleteTargetSystem(targetSystem){
    console.log("deleting target system: ", targetSystem.id);
    console.log("deleting the target system removes experiments: ", this.experimentsToBeDeleted);

    // first delete the affected experiments
    for (let i = 0; i < this.experimentsToBeDeleted.length; i++) {
      this.api.deleteExperiment(this.experimentsToBeDeleted[i]).subscribe(
        (data) => {
          console.log("delete experiment-" + data + " because of target");
          this.experiments = this.experiments.filter(e => e.id != this.experimentsToBeDeleted[i].id);
      }
      );
    }

    // then delete the target system
    this.api.deleteTarget(targetSystem).subscribe(
      (data) => {
        console.log("target system-" + data);
        this.targets = this.targets.filter(t => t.id != targetSystem.id);
        // delete this.targets[tobeDeleted];
        // this.router.navigate(["control/targets"]);
      }
    )
  }
}
