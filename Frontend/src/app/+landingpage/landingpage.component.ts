import {Component} from '@angular/core';
import {NotificationsService} from "angular2-notifications";
import {LayoutService} from "../shared/modules/helper/layout.service";
import {UserEntity, OEDAApiService} from "../shared/modules/api/oeda-api.service";
import {Router} from "@angular/router";
import {TempStorageService} from "../shared/modules/helper/temp-storage-service";
import {EntityService} from "../shared/util/entity-service";
import {LoginRequest, UserService} from "../shared/modules/auth/user.service";

@Component({
  selector: 'app-landingpage',
  templateUrl: './landingpage.component.html',
  styles: [`
    /deep/
    body {
      background: url(../../assets/img/background2.jpg);
      background-size: cover;
      background-color: #444;
    }

    .vertical-offset-100 {
      padding-top: 100px;
    }


  `]
})
export class LandingpageComponent {
  public user: UserEntity;

  constructor(private layout: LayoutService,
              private temp_storage: TempStorageService,
              private api: OEDAApiService,
              private router: Router,
              private entityService: EntityService,
              private notify: NotificationsService,
              private userService: UserService) {
    this.user = this.entityService.create_user_entity();
  }
}
