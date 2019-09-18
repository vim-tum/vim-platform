import {Component} from '@angular/core';
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {OEDAApiService} from "../../shared/modules/api/oeda-api.service";
import {NotificationsService} from "angular2-notifications/dist";

@Component({
  selector: 'control-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {

  is_cleared: Boolean;
  constructor(private layout: LayoutService, private api: OEDAApiService, private notify: NotificationsService) {
    this.layout.setHeader("Dashboard", "OEDA Control Overview");
    this.is_cleared = false;
  }

  clear_database(): void {
    this.api.clear_database().subscribe(
      (response) => {
        this.notify.success("Success", response.message);
        this.is_cleared = true;
      }, (error) => {
        this.notify.error("Error", error.toString());
      }
    )
  }

}
