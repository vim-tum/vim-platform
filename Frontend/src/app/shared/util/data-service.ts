import {AuthHttp} from "angular2-jwt";
import {NotificationsService} from "angular2-notifications";
import {LoggerService} from "../modules/helper/logger.service";
import {Http} from "@angular/http";
import {Injectable} from "@angular/core";

@Injectable()
export class DataService {

  constructor(public http: Http,
              public notify: NotificationsService,
              public log: LoggerService) {
  }



}
