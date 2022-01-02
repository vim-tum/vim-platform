import {Component, OnInit} from '@angular/core';
import {NotificationsService} from "angular2-notifications";
import {LayoutService} from "../../shared/modules/helper/layout.service";
import {Configuration, OEDAApiService, UserEntity} from "../../shared/modules/api/oeda-api.service";
import * as _ from "lodash.clonedeep";
import {ActivatedRoute, Router} from "@angular/router";
import {UserService} from "../../shared/modules/auth/user.service";

@Component({
  selector: 'control-configuration',
  templateUrl: './configuration.component.html',
})
export class ConfigurationComponent implements OnInit {

  save_button_clicked: boolean;
  constructor(private layout: LayoutService,
              private api: OEDAApiService,
              private router: Router,
              private notify: NotificationsService,
              private userService: UserService, private route: ActivatedRoute) {
    this.save_button_clicked = false;
  }


  user: UserEntity;
  // default values are provided here
  configuration: Configuration = {host: "", port: null, type: ""};
  originalConfiguration = {};

  ngOnInit(): void {
    this.layout.setHeader("Configuration", "Setup the Database for Experiments");
    this.user = this.userService.getAuthToken()["value"].user;
    if (this.user.db_configuration["host"] && this.user.db_configuration["port"] && this.user.db_configuration["type"]) {
      this.configuration.host = this.user.db_configuration["host"];
      this.configuration.port = this.user.db_configuration["port"];
      this.configuration.type = this.user.db_configuration["type"];
      this.originalConfiguration = _(this.configuration);
    } else {
      this.notify.success("", "Default values for configuration are populated");
      this.configuration.host = "localhost";
      this.configuration.port = 9200;
      this.configuration.type = "elasticsearch";
    }
  }

  hasChanges(): boolean {
    return JSON.stringify(this.configuration) !== JSON.stringify(this.originalConfiguration)
  }

  saveChanges() {
    const ctrl = this;
    if (!this.hasErrors()) {
      this.save_button_clicked = true;
      this.user.db_configuration["host"] = this.configuration.host;
      this.user.db_configuration["port"] = this.configuration.port.toString();
      this.user.db_configuration["type"] = this.configuration.type;
      this.api.updateSystemConfig(this.user).subscribe(
        (success) => {
          ctrl.originalConfiguration = _(this.configuration);
          ctrl.notify.success("Success", success["message"]);
          // after a successful update, use the retrieved token and put it into userService, so that user will be able to run experiments
          ctrl.userService.setAuthToken(success["token"]);
          this.save_button_clicked = false;
        }, (error => {
          error = JSON.parse(error._body);
          ctrl.notify.error("Error", error.message);
          this.save_button_clicked = false;
          this.revertChanges();
        })
      )
    }
  }

  hasErrors(): boolean {
    return this.configuration.type.length === 0
      || this.configuration.host == null
      || this.configuration.host.length === 0
      || this.configuration.port == null
      || this.configuration.port < 1
      || this.configuration.port > 65535;

  }

  revertChanges() {
    this.configuration = _(this.originalConfiguration);
  }


}
